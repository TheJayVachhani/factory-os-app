import type { SimBatch } from "@/lib/simulation/engine";

const PRODUCT_COLORS: Record<string, string> = {
  "PROD-A1": "border-cyan-500/40 bg-cyan-500/5",
  "PROD-B2": "border-violet-500/40 bg-violet-500/5",
  "PROD-C3": "border-emerald-500/40 bg-emerald-500/5",
};

const FLAG_STYLES: Record<string, string> = {
  delayed: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
  blocked: "bg-red-500/20 text-red-400 border border-red-500/30",
  "quality-risk": "bg-orange-500/20 text-orange-400 border border-orange-500/30",
  urgent: "bg-pink-500/20 text-pink-400 border border-pink-500/30",
  hold: "bg-purple-500/20 text-purple-400 border border-purple-500/30",
};

interface BatchCardProps {
  batch: SimBatch;
}

export function BatchCard({ batch }: BatchCardProps) {
  const total = batch.baseDays + batch.delayDays;
  const progress = total > 0 ? Math.min(100, Math.round((batch.daysInStage / total) * 100)) : 0;
  const hasDelay = batch.delayDays > 0;
  const borderColor = PRODUCT_COLORS[batch.productId] ?? "border-zinc-600/40 bg-zinc-500/5";

  return (
    <div className={`rounded border ${borderColor} p-2.5 text-xs space-y-2`}>
      <div className="flex items-start justify-between gap-1">
        <div>
          <div className="font-mono font-semibold text-zinc-200 leading-tight">{batch.productLabel}</div>
          <div className="text-zinc-500 font-mono text-[10px] mt-0.5">{batch.id.replace("BATCH-SIM-", "#")}</div>
        </div>
        <div className="text-zinc-400 font-mono text-[10px] text-right shrink-0">
          qty {batch.quantity}
        </div>
      </div>

      {/* Progress bar */}
      {batch.stage !== "queue" && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-mono text-zinc-500">
            <span>{batch.daysInStage}d</span>
            <span className={hasDelay ? "text-amber-400" : "text-zinc-500"}>{total}d{hasDelay ? ` (+${batch.delayDays})` : ""}</span>
          </div>
          <div className="h-1 rounded-full bg-zinc-700/60 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${hasDelay ? "bg-amber-400/70" : "bg-sky-400/70"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Flags */}
      {batch.flags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {batch.flags.map((flag) => (
            <span key={flag} className={`rounded px-1.5 py-0.5 text-[9px] font-mono font-medium ${FLAG_STYLES[flag] ?? "bg-zinc-700 text-zinc-400"}`}>
              {flag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
