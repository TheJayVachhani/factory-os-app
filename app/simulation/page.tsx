"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { SimState, Recommendation } from "@/lib/simulation/engine";
import type { Anomaly } from "@/lib/simulation/monitor";
import { KanbanBoard } from "@/components/simulation/KanbanBoard";
import { ControlPanel } from "@/components/simulation/ControlPanel";
import { AgentPanel } from "@/components/simulation/AgentPanel";
import { MonitorStrip } from "@/components/simulation/MonitorStrip";

interface ToolCallEntry {
  toolName: string;
  args: unknown;
}

export default function SimulationPage() {
  const [state, setState] = useState<SimState | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [toolCalls, setToolCalls] = useState<ToolCallEntry[]>([]);
  const [agentResponse, setAgentResponse] = useState("");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const sseRef = useRef<EventSource | null>(null);

  // Refs to avoid stale closures in intervals
  const isAnalyzingRef = useRef(false);
  const stateRef = useRef<SimState | null>(null);

  useEffect(() => { isAnalyzingRef.current = isAnalyzing; }, [isAnalyzing]);
  useEffect(() => { stateRef.current = state; }, [state]);

  const fetchState = useCallback(async () => {
    const res = await fetch("/api/sim/state");
    const data = await res.json() as SimState;
    setState(data);
    setRecommendations(data.pendingRecs ?? []);
  }, []);

  const fetchAnomalies = useCallback(async () => {
    const res = await fetch("/api/sim/monitor");
    const data = await res.json() as { anomalies: Anomaly[] };
    setAnomalies(data.anomalies);
  }, []);

  // Initial load
  useEffect(() => {
    fetchState();
    fetchAnomalies();
  }, [fetchState, fetchAnomalies]);

  // Poll anomalies every 5s
  useEffect(() => {
    const id = setInterval(fetchAnomalies, 5000);
    return () => clearInterval(id);
  }, [fetchAnomalies]);

  // Auto-run: advance 1 day every 2s
  useEffect(() => {
    if (!isAutoRunning) return;

    const tick = async () => {
      if (isAnalyzingRef.current) return;
      const current = stateRef.current;
      if (!current || current.currentDay >= 90) {
        setIsAutoRunning(false);
        return;
      }
      const res = await fetch("/api/sim/advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: 1 }),
      });
      const data = await res.json() as SimState;
      setState(data);
      stateRef.current = data;
      await fetchAnomalies();
    };

    const id = setInterval(tick, 2000);
    return () => clearInterval(id);
  }, [isAutoRunning, fetchAnomalies]);

  const handleAdvance = async (days: number) => {
    const res = await fetch("/api/sim/advance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days }),
    });
    const data = await res.json() as SimState;
    setState(data);
    await fetchAnomalies();
  };

  // Shared SSE setup for both event-triggered and anomaly-triggered analysis
  const openAnalysisStream = useCallback((url: string) => {
    setToolCalls([]);
    setAgentResponse("");
    setRecommendations([]);
    setIsAnalyzing(true);
    sseRef.current?.close();

    const sse = new EventSource(url);
    sseRef.current = sse;

    sse.onmessage = (e) => {
      const event = JSON.parse(e.data as string) as {
        type: string;
        toolName?: string;
        args?: unknown;
        text?: string;
        recommendations?: Recommendation[];
        message?: string;
      };

      if (event.type === "tool_call") {
        setToolCalls((prev) => [...prev, { toolName: event.toolName!, args: event.args }]);
      } else if (event.type === "agent_response") {
        setAgentResponse(event.text ?? "");
      } else if (event.type === "analysis_complete") {
        setRecommendations(event.recommendations ?? []);
        setIsAnalyzing(false);
        sse.close();
      } else if (event.type === "error") {
        console.error("Agent error:", event.message);
        setIsAnalyzing(false);
        sse.close();
      }
    };

    sse.onerror = () => {
      setIsAnalyzing(false);
      sse.close();
    };
  }, []);

  const handleTriggerEvent = async (eventId: string) => {
    const res = await fetch(`/api/sim/event/${eventId}`, { method: "POST" });
    const data = await res.json() as SimState;
    setState(data);
    openAnalysisStream(`/api/sim/analyze?eventId=${eventId}`);
  };

  const handleAnalyzeAnomaly = useCallback((anomaly: Anomaly) => {
    setIsAutoRunning(false); // Pause auto-run during analysis
    openAnalysisStream(`/api/sim/monitor/analyze?anomalyId=${encodeURIComponent(anomaly.id)}`);
  }, [openAnalysisStream]);

  const handleReset = async () => {
    sseRef.current?.close();
    setIsAutoRunning(false);
    const res = await fetch("/api/sim/reset", { method: "POST" });
    const data = await res.json() as SimState;
    setState(data);
    setToolCalls([]);
    setAgentResponse("");
    setRecommendations([]);
    setIsAnalyzing(false);
    await fetchAnomalies();
  };

  const handleAccept = async (rec: Recommendation) => {
    const res = await fetch("/api/sim/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rec }),
    });
    const data = await res.json() as SimState;
    setState(data);
    setRecommendations((prev) => prev.filter((r) => r.id !== rec.id));
  };

  const handleIgnore = (rec: Recommendation) => {
    setRecommendations((prev) => prev.filter((r) => r.id !== rec.id));
  };

  if (!state) {
    return (
      <div className="h-screen flex items-center justify-center bg-zinc-950 text-zinc-500 font-mono text-sm">
        Loading simulation…
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-200 overflow-hidden">
      {/* Header */}
      <header className="shrink-0 border-b border-zinc-800 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-mono font-bold text-zinc-100 tracking-tight">FACTORY OS</span>
          <span className="text-zinc-600">·</span>
          <span className="font-mono text-sm text-zinc-400">Production Simulation</span>
        </div>
        <div className="flex items-center gap-4 font-mono text-xs text-zinc-500">
          {state.lastEvent && (
            <span className="text-amber-400">
              ⚡ {state.lastEvent.label} (Day {state.lastEvent.day})
            </span>
          )}
          <span>{state.batches.filter((b) => b.stage === "delivered").length} / {state.batches.length} delivered</span>
        </div>
      </header>

      {/* Monitor strip — only visible when anomalies exist */}
      <MonitorStrip
        anomalies={anomalies}
        isAnalyzing={isAnalyzing}
        onAnalyze={handleAnalyzeAnomaly}
      />

      {/* Main layout */}
      <main className="flex-1 flex gap-3 p-3 min-h-0">
        <ControlPanel
          currentDay={state.currentDay}
          isAnalyzing={isAnalyzing}
          isAutoRunning={isAutoRunning}
          onAdvance={handleAdvance}
          onTriggerEvent={handleTriggerEvent}
          onReset={handleReset}
          onToggleAutoRun={() => setIsAutoRunning((prev) => !prev)}
        />

        <KanbanBoard state={state} />

        <AgentPanel
          isAnalyzing={isAnalyzing}
          toolCalls={toolCalls}
          agentResponse={agentResponse}
          recommendations={recommendations}
          onAccept={handleAccept}
          onIgnore={handleIgnore}
        />
      </main>
    </div>
  );
}
