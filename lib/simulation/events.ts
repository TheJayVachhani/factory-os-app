import type { SimBatch, SimState } from "./engine";

export interface SurpriseEventDef {
  id: string;
  label: string;
  description: string;
  icon: string;
  applyEffect(batches: SimBatch[], state: SimState): void;
  buildAgentContext(state: SimState): string;
}

function batchSummary(batches: SimBatch[]): string {
  return batches
    .filter((b) => b.stage !== "delivered")
    .map((b) => {
      const progress = `${b.daysInStage}d / ${b.baseDays + b.delayDays}d`;
      const flags = b.flags.length ? ` [${b.flags.join(", ")}]` : "";
      return `  ${b.id} (${b.productLabel}, qty ${b.quantity}) — ${b.stage.toUpperCase()}, ${progress}${flags}`;
    })
    .join("\n");
}

export const SURPRISE_EVENTS: SurpriseEventDef[] = [
  {
    id: "supplier-delay",
    label: "Titanium Supplier Delay",
    description: "Tanaka Industries (SUP-001) confirms a 14-day delay on all titanium deliveries due to a furnace failure at their Osaka facility.",
    icon: "⚠",
    applyEffect(batches) {
      for (const batch of batches) {
        if (batch.stage === "procurement" && batch.supplierId === "SUP-001") {
          batch.delayDays += 14;
          if (!batch.flags.includes("delayed")) batch.flags.push("delayed");
        }
      }
    },
    buildAgentContext(state) {
      const affected = state.batches.filter((b) => b.stage === "procurement" && b.supplierId === "SUP-001");
      return `EVENT: Tanaka Industries (SUP-001) has confirmed a 14-day delay on all titanium sheet and tube deliveries. A furnace failure at their Osaka facility caused the disruption.

AFFECTED BATCHES:
${affected.map((b) => `  ${b.id} — ${b.productLabel} (qty ${b.quantity}), procurement day ${b.daysInStage}/${b.baseDays + b.delayDays}`).join("\n") || "  None currently in procurement"}

ALL ACTIVE BATCHES (Day ${state.currentDay}):
${batchSummary(state.batches)}

TASK: Investigate the full supply chain impact. Check our titanium inventory buffer (PART-TI-SHEET, PART-TI-TUBE), identify which products depend on titanium, assess alternative suppliers, and recommend concrete mitigating actions.`;
    },
  },
  {
    id: "quality-failure",
    label: "Batch Fails QC Inspection",
    description: "A batch in Quality Control has failed inspection with critical material flaws. It must return to manufacturing for rework.",
    icon: "🔴",
    applyEffect(batches) {
      const qcBatch = batches.find((b) => b.stage === "qc");
      if (qcBatch) {
        qcBatch.stage = "manufacturing";
        qcBatch.daysInStage = 0;
        qcBatch.baseDays = 20;
        qcBatch.delayDays = 8;
        if (!qcBatch.flags.includes("quality-risk")) qcBatch.flags.push("quality-risk");
      }
    },
    buildAgentContext(state) {
      const failed = state.batches.find((b) => b.flags.includes("quality-risk"));
      return `EVENT: A batch has failed QC inspection with critical material flaws and has been sent back to manufacturing for rework. This adds approximately 8 days to its delivery timeline.

FAILED BATCH: ${failed ? `${failed.id} (${failed.productLabel}, qty ${failed.quantity}) — now in MANUFACTURING with quality-risk flag` : "Unknown"}

ALL ACTIVE BATCHES (Day ${state.currentDay}):
${batchSummary(state.batches)}

TASK: Investigate the quality failure. Pull inspection records for this line, identify defect patterns, cross-reference with supplier data to trace the root cause, and recommend corrective actions to prevent recurrence.`;
    },
  },
  {
    id: "line-breakdown",
    label: "LINE-3 Emergency Breakdown",
    description: "LINE-3 (Wing Assembly) has gone down for emergency maintenance after a hydraulic press failure. Estimated downtime: 10 days.",
    icon: "🔧",
    applyEffect(batches) {
      for (const batch of batches) {
        if (batch.lineId === "LINE-3" && batch.stage === "manufacturing") {
          batch.delayDays += 10;
          if (!batch.flags.includes("blocked")) batch.flags.push("blocked");
        }
      }
    },
    buildAgentContext(state) {
      const blocked = state.batches.filter((b) => b.lineId === "LINE-3" && b.stage === "manufacturing");
      return `EVENT: LINE-3 (Wing Assembly) has gone down for emergency maintenance. A hydraulic press failure halted production. Estimated repair time: 10 days.

BLOCKED BATCHES:
${blocked.map((b) => `  ${b.id} — ${b.productLabel} (qty ${b.quantity}), manufacturing day ${b.daysInStage}/20`).join("\n") || "  None currently on LINE-3"}

ALL ACTIVE BATCHES (Day ${state.currentDay}):
${batchSummary(state.batches)}

TASK: Assess the production impact. Check which other lines have capacity to absorb the LINE-3 work, evaluate current line statuses and throughput, and recommend how to minimise schedule slip.`;
    },
  },
  {
    id: "demand-spike",
    label: "Urgent Order: 3× PROD-B2",
    description: "A defence customer has placed an urgent order for 3 additional Boreas B2 units with an accelerated 45-day delivery requirement.",
    icon: "📈",
    applyEffect(batches) {
      batches.push({
        id: "BATCH-SIM-URGENT",
        productId: "PROD-B2",
        productLabel: "Boreas B2",
        lineId: "LINE-3",
        supplierId: "SUP-001",
        quantity: 3,
        stage: "queue",
        daysInStage: 0,
        baseDays: 0,
        delayDays: 0,
        flags: ["urgent"],
        startDay: 0,
      });
    },
    buildAgentContext(state) {
      return `EVENT: A defence customer has placed an urgent order for 3 additional Boreas B2 (PROD-B2) units. Required delivery in 45 days from today (Day ${state.currentDay}).

ALL ACTIVE BATCHES (Day ${state.currentDay}):
${batchSummary(state.batches)}

TASK: Assess whether we can fulfil this urgent order in 45 days. Check BOM requirements for PROD-B2, current inventory levels, available production line capacity, and supplier lead times. Account for any existing delays. Give a go/no-go with specific reasoning and, if go, a production plan.`;
    },
  },
  {
    id: "supplier-bankrupt",
    label: "SUP-009 Ceases Operations",
    description: "Alenia Landing Gear (SUP-009) has announced immediate cessation of operations. All orders for PART-LG-STRUT and PART-LG-WHEEL are cancelled.",
    icon: "💀",
    applyEffect(batches) {
      for (const batch of batches) {
        if (
          (batch.stage === "procurement" || batch.stage === "queue") &&
          (batch.productId === "PROD-A1" || batch.productId === "PROD-C3")
        ) {
          batch.delayDays += 20;
          if (!batch.flags.includes("blocked")) batch.flags.push("blocked");
        }
      }
    },
    buildAgentContext(state) {
      const affected = state.batches.filter(
        (b) => (b.stage === "procurement" || b.stage === "queue") &&
          (b.productId === "PROD-A1" || b.productId === "PROD-C3")
      );
      return `EVENT: Alenia Landing Gear (SUP-009) has announced immediate cessation of operations due to insolvency. All pending orders for PART-LG-STRUT and PART-LG-WHEEL are cancelled. This is a single-source component with no pre-qualified alternative.

AFFECTED BATCHES:
${affected.map((b) => `  ${b.id} — ${b.productLabel} (qty ${b.quantity}), ${b.stage.toUpperCase()}`).join("\n") || "  None currently in procurement/queue"}

ALL ACTIVE BATCHES (Day ${state.currentDay}):
${batchSummary(state.batches)}

TASK: Assess the impact of losing our sole landing gear supplier. Check inventory levels for LG components, identify which products and batches are affected, check the supplier risk report for any pre-qualified alternatives, and recommend emergency sourcing actions.`;
    },
  },
];

export function getEventDef(id: string): SurpriseEventDef | undefined {
  return SURPRISE_EVENTS.find((e) => e.id === id);
}
