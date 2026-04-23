"use client";

import { SURPRISE_EVENTS } from "@/lib/simulation/events";

interface ControlPanelProps {
  currentDay: number;
  isAnalyzing: boolean;
  isAutoRunning: boolean;
  onAdvance: (days: number) => void;
  onTriggerEvent: (eventId: string) => void;
  onReset: () => void;
  onToggleAutoRun: () => void;
}

export function ControlPanel({ currentDay, isAnalyzing, isAutoRunning, onAdvance, onTriggerEvent, onReset, onToggleAutoRun }: ControlPanelProps) {
  const atEnd = currentDay >= 90;

  return (
    <div className="flex flex-col gap-4 w-48 shrink-0">
      {/* Day counter */}
      <div className="rounded-lg border border-zinc-700/60 bg-zinc-800/60 p-3">
        <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">Simulation Day</div>
        <div className="text-3xl font-mono font-bold text-zinc-100">{currentDay}</div>
        <div className="text-[10px] font-mono text-zinc-500">/ 90</div>
        <div className="mt-2 h-1 rounded-full bg-zinc-700">
          <div
            className="h-full rounded-full bg-sky-500/60 transition-all"
            style={{ width: `${Math.round((currentDay / 90) * 100)}%` }}
          />
        </div>
      </div>

      {/* Time controls */}
      <div className="rounded-lg border border-zinc-700/60 bg-zinc-800/60 p-3 space-y-2">
        <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Advance Time</div>
        {[1, 7, 30].map((d) => (
          <button
            key={d}
            onClick={() => onAdvance(d)}
            disabled={atEnd || isAnalyzing}
            className="w-full rounded px-2 py-1.5 text-xs font-mono font-medium bg-sky-500/10 text-sky-400 border border-sky-500/30 hover:bg-sky-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            +{d} Day{d !== 1 ? "s" : ""}
          </button>
        ))}
      </div>

      {/* Auto-run */}
      <div className="rounded-lg border border-zinc-700/60 bg-zinc-800/60 p-3 space-y-2">
        <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Auto-Run</div>
        <button
          onClick={onToggleAutoRun}
          disabled={atEnd || isAnalyzing}
          className={`w-full rounded px-2 py-1.5 text-xs font-mono font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            isAutoRunning
              ? "bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
          }`}
        >
          {isAutoRunning ? "⏸ Pause" : "▶ Run"}
        </button>
        {isAutoRunning && (
          <p className="text-[9px] font-mono text-zinc-600 text-center">+1 day every 2s</p>
        )}
      </div>

      {/* Events */}
      <div className="rounded-lg border border-zinc-700/60 bg-zinc-800/60 p-3 space-y-2">
        <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Trigger Event</div>
        <div className="space-y-1.5">
          {SURPRISE_EVENTS.map((evt) => (
            <button
              key={evt.id}
              onClick={() => onTriggerEvent(evt.id)}
              disabled={isAnalyzing}
              title={evt.description}
              className="w-full rounded px-2 py-1.5 text-left text-[10px] font-mono bg-zinc-700/40 text-zinc-300 border border-zinc-600/40 hover:bg-zinc-700/70 hover:text-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors leading-snug"
            >
              <span className="mr-1">{evt.icon}</span>
              {evt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reset */}
      <button
        onClick={onReset}
        disabled={isAnalyzing}
        className="w-full rounded px-3 py-2 text-xs font-mono text-zinc-500 border border-zinc-700/40 hover:bg-zinc-800 hover:text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        ↺ Reset
      </button>
    </div>
  );
}
