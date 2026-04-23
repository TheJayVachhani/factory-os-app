import type { Recommendation } from "@/lib/simulation/engine";

const EFFECT_LABELS: Record<string, string> = {
  switch_supplier: "Switch Supplier",
  take_line_offline: "Take Line Offline",
  bring_line_online: "Bring Line Online",
  expedite_order: "Expedite Order",
  quarantine_batch: "Quarantine Batch",
  add_safety_stock: "Add Safety Stock",
};

const EFFECT_COLORS: Record<string, string> = {
  switch_supplier: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
  take_line_offline: "text-red-400 bg-red-500/10 border-red-500/30",
  bring_line_online: "text-green-400 bg-green-500/10 border-green-500/30",
  expedite_order: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  quarantine_batch: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  add_safety_stock: "text-violet-400 bg-violet-500/10 border-violet-500/30",
};

interface RecommendationCardProps {
  rec: Recommendation;
  onAccept: (rec: Recommendation) => void;
  onIgnore: (rec: Recommendation) => void;
}

export function RecommendationCard({ rec, onAccept, onIgnore }: RecommendationCardProps) {
  const effectColor = EFFECT_COLORS[rec.effectType] ?? "text-zinc-400 bg-zinc-800 border-zinc-700";
  const effectLabel = EFFECT_LABELS[rec.effectType] ?? rec.effectType;

  return (
    <div className="rounded-lg border border-zinc-700/60 bg-zinc-800/60 p-3 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="font-mono font-semibold text-zinc-200 text-xs leading-snug">{rec.label}</div>
        <span className={`shrink-0 text-[9px] font-mono font-medium rounded px-1.5 py-0.5 border ${effectColor}`}>
          {effectLabel}
        </span>
      </div>

      <p className="text-[11px] text-zinc-400 leading-relaxed">{rec.reasoning}</p>

      <div className="flex gap-2">
        <button
          onClick={() => onAccept(rec)}
          className="flex-1 rounded px-2 py-1.5 text-[11px] font-mono font-medium bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500/25 transition-colors"
        >
          ✓ Accept
        </button>
        <button
          onClick={() => onIgnore(rec)}
          className="flex-1 rounded px-2 py-1.5 text-[11px] font-mono font-medium bg-zinc-700/40 text-zinc-400 border border-zinc-600/40 hover:bg-zinc-700/70 transition-colors"
        >
          ✗ Ignore
        </button>
      </div>
    </div>
  );
}
