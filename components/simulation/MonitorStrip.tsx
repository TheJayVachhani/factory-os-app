"use client";

import type { Anomaly, AnomalyType, AnomalySeverity } from "@/lib/simulation/monitor";

const SEVERITY_PILL: Record<AnomalySeverity, string> = {
  critical: "border-red-700/60 bg-red-950/40 text-red-400",
  warning: "border-amber-700/60 bg-amber-950/30 text-amber-400",
  info: "border-zinc-600/60 bg-zinc-800/40 text-zinc-400",
};

const TYPE_ICON: Record<AnomalyType, string> = {
  batch_delay: "⏱",
  supplier_risk: "⚠",
  inventory_low: "▽",
  quality_alert: "◈",
  line_down: "●",
};

interface MonitorStripProps {
  anomalies: Anomaly[];
  isAnalyzing: boolean;
  onAnalyze: (anomaly: Anomaly) => void;
}

export function MonitorStrip({ anomalies, isAnalyzing, onAnalyze }: MonitorStripProps) {
  if (anomalies.length === 0) return null;

  const criticalCount = anomalies.filter((a) => a.severity === "critical").length;

  return (
    <div className="shrink-0 border-b border-zinc-800 bg-zinc-950/80 px-3 py-1.5">
      <div className="flex items-center gap-2 min-w-0">
        <div className="shrink-0 flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
            Monitor
          </span>
          {criticalCount > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500/20 text-red-400 text-[9px] font-mono font-bold">
              {criticalCount}
            </span>
          )}
        </div>
        <span className="shrink-0 text-zinc-700 text-[10px]">·</span>

        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {anomalies.map((a) => (
            <div
              key={a.id}
              className={`shrink-0 flex items-center gap-1.5 rounded border px-2 py-0.5 text-[10px] font-mono ${SEVERITY_PILL[a.severity]}`}
            >
              <span className="text-[10px]">{TYPE_ICON[a.type]}</span>
              <span className="max-w-[160px] truncate" title={a.description}>
                {a.title}
              </span>
              <button
                onClick={() => onAnalyze(a)}
                disabled={isAnalyzing}
                className="ml-0.5 px-1.5 py-0 rounded text-[9px] font-semibold bg-zinc-900/60 border border-zinc-600/40 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Analyze
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
