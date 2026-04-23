import type { SimBatch, BatchStage } from "@/lib/simulation/engine";
import { BatchCard } from "./BatchCard";

const STAGE_LABELS: Record<BatchStage, string> = {
  queue: "Queue",
  procurement: "Procurement",
  manufacturing: "Manufacturing",
  qc: "QC",
  shipping: "Shipping",
  delivered: "Delivered",
};

const STAGE_ACCENT: Record<BatchStage, string> = {
  queue: "text-zinc-400 border-zinc-700",
  procurement: "text-sky-400 border-sky-900",
  manufacturing: "text-violet-400 border-violet-900",
  qc: "text-amber-400 border-amber-900",
  shipping: "text-emerald-400 border-emerald-900",
  delivered: "text-green-400 border-green-900",
};

interface StageColumnProps {
  stage: BatchStage;
  batches: SimBatch[];
}

export function StageColumn({ stage, batches }: StageColumnProps) {
  const accent = STAGE_ACCENT[stage];

  return (
    <div className={`flex flex-col min-w-[160px] max-w-[200px] flex-1 rounded-lg border ${accent.split(" ")[1]} bg-zinc-900/40`}>
      {/* Header */}
      <div className={`px-3 py-2 border-b ${accent.split(" ")[1]} flex items-center justify-between`}>
        <span className={`text-[11px] font-mono font-semibold uppercase tracking-wider ${accent.split(" ")[0]}`}>
          {STAGE_LABELS[stage]}
        </span>
        <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800 rounded px-1.5 py-0.5">
          {batches.length}
        </span>
      </div>

      {/* Batch cards */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[120px]">
        {batches.length === 0 ? (
          <div className="text-[10px] font-mono text-zinc-600 text-center pt-4">—</div>
        ) : (
          batches.map((batch) => <BatchCard key={batch.id} batch={batch} />)
        )}
      </div>
    </div>
  );
}
