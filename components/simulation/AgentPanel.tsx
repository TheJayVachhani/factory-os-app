"use client";

import type { Recommendation } from "@/lib/simulation/engine";
import { RecommendationCard } from "./RecommendationCard";

interface ToolCallEntry {
  toolName: string;
  args: unknown;
}

interface AgentPanelProps {
  isAnalyzing: boolean;
  toolCalls: ToolCallEntry[];
  agentResponse: string;
  recommendations: Recommendation[];
  onAccept: (rec: Recommendation) => void;
  onIgnore: (rec: Recommendation) => void;
}

export function AgentPanel({ isAnalyzing, toolCalls, agentResponse, recommendations, onAccept, onIgnore }: AgentPanelProps) {
  const hasActivity = toolCalls.length > 0 || agentResponse || isAnalyzing;

  return (
    <div className="flex flex-col w-72 shrink-0 gap-3">
      {/* Agent activity */}
      <div className="flex-1 rounded-lg border border-zinc-700/60 bg-zinc-800/60 flex flex-col min-h-0">
        <div className="px-3 py-2 border-b border-zinc-700/60 flex items-center gap-2">
          <span className="text-[11px] font-mono font-semibold text-zinc-400 uppercase tracking-wider">AI Agent</span>
          {isAnalyzing && (
            <span className="flex items-center gap-1 text-[10px] font-mono text-cyan-400">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              analyzing
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 font-mono text-[11px]">
          {!hasActivity && (
            <p className="text-zinc-600 text-center pt-6">Trigger an event to activate the agent.</p>
          )}
          {toolCalls.map((tc, i) => {
            if (tc.toolName === "web_search") {
              const { query, resultUrls = [] } = tc.args as { query: string; resultUrls?: { url: string; title: string }[] };
              return (
                <div key={i} className="rounded bg-zinc-900/60 border border-blue-800/40 px-2 py-1.5">
                  <div className="text-blue-400 font-semibold">⌕ web_search()</div>
                  <div className="text-zinc-400 text-[10px] mt-0.5 italic truncate">"{query}"</div>
                  {resultUrls.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {resultUrls.slice(0, 4).map((r, j) => (
                        <a
                          key={j}
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-[10px] text-blue-400/80 hover:text-blue-300 truncate underline underline-offset-2"
                          title={r.title}
                        >
                          {r.title}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            return (
              <div key={i} className="rounded bg-zinc-900/60 border border-zinc-700/40 px-2 py-1.5">
                <div className="text-cyan-400 font-semibold">{tc.toolName}()</div>
                <div className="text-zinc-500 text-[10px] mt-0.5 truncate">
                  {JSON.stringify(tc.args).slice(0, 80)}
                </div>
              </div>
            );
          })}
          {agentResponse && (
            <div className="rounded bg-zinc-900/60 border border-green-800/40 px-2 py-1.5">
              <div className="text-green-400 font-semibold mb-1">Analysis</div>
              <div className="text-zinc-300 leading-relaxed whitespace-pre-wrap">{agentResponse}</div>
            </div>
          )}
          {isAnalyzing && !agentResponse && (
            <div className="text-zinc-600 animate-pulse">Thinking…</div>
          )}
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="rounded-lg border border-zinc-700/60 bg-zinc-800/60">
          <div className="px-3 py-2 border-b border-zinc-700/60">
            <span className="text-[11px] font-mono font-semibold text-zinc-400 uppercase tracking-wider">
              Recommendations ({recommendations.length})
            </span>
          </div>
          <div className="p-2 space-y-2 max-h-72 overflow-y-auto">
            {recommendations.map((rec) => (
              <RecommendationCard
                key={rec.id}
                rec={rec}
                onAccept={onAccept}
                onIgnore={onIgnore}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
