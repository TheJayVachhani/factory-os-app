import type { SimState, BatchStage } from "@/lib/simulation/engine";
import { StageColumn } from "./StageColumn";

const STAGES: BatchStage[] = ["queue", "procurement", "manufacturing", "qc", "shipping", "delivered"];

interface KanbanBoardProps {
  state: SimState;
}

export function KanbanBoard({ state }: KanbanBoardProps) {
  const batchesByStage = Object.fromEntries(
    STAGES.map((stage) => [stage, state.batches.filter((b) => b.stage === stage)])
  ) as Record<BatchStage, typeof state.batches>;

  return (
    <div className="flex-1 flex gap-2 min-w-0 overflow-x-auto">
      {STAGES.map((stage) => (
        <StageColumn key={stage} stage={stage} batches={batchesByStage[stage]} />
      ))}
    </div>
  );
}
