import type { SimState } from "@/lib/simulation/engine";
import type { IFactoryStore } from "@/lib/factory/store";

export type AnomalyType =
  | "batch_delay"
  | "supplier_risk"
  | "inventory_low"
  | "quality_alert"
  | "line_down";

export type AnomalySeverity = "info" | "warning" | "critical";

export interface Anomaly {
  id: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  title: string;
  description: string;
  entityId: string;
  detectedAt: number;
}

export function scanForAnomalies(state: SimState, store: IFactoryStore): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const now = Date.now();

  // 1. Batch delays & blockages
  for (const batch of state.batches) {
    if (batch.stage === "delivered") continue;

    if (batch.flags.includes("blocked")) {
      anomalies.push({
        id: `batch-${batch.id}-blocked`,
        type: "batch_delay",
        severity: "critical",
        title: `Batch blocked: ${batch.productLabel}`,
        description: `Batch ${batch.id} is blocked in ${batch.stage} and cannot progress.`,
        entityId: batch.id,
        detectedAt: now,
      });
    } else if (batch.delayDays >= 14) {
      anomalies.push({
        id: `batch-${batch.id}-critical-delay`,
        type: "batch_delay",
        severity: "critical",
        title: `Critical delay: ${batch.productLabel}`,
        description: `Batch ${batch.id} is ${batch.delayDays}d behind schedule in ${batch.stage}.`,
        entityId: batch.id,
        detectedAt: now,
      });
    } else if (batch.delayDays >= 5) {
      anomalies.push({
        id: `batch-${batch.id}-warning-delay`,
        type: "batch_delay",
        severity: "warning",
        title: `Delay: ${batch.productLabel}`,
        description: `Batch ${batch.id} has a ${batch.delayDays}-day delay in ${batch.stage}.`,
        entityId: batch.id,
        detectedAt: now,
      });
    }
  }

  // 2. Supplier risk
  for (const supplier of store.suppliers) {
    if (supplier.status === "at-risk" || supplier.status === "delayed") {
      anomalies.push({
        id: `supplier-${supplier.id}-${supplier.status}`,
        type: "supplier_risk",
        severity: supplier.status === "at-risk" ? "critical" : "warning",
        title: `Supplier ${supplier.status}: ${supplier.name}`,
        description:
          supplier.delayReason ??
          `${supplier.name} on-time rate: ${Math.round(supplier.onTimeRate * 100)}%.`,
        entityId: supplier.id,
        detectedAt: now,
      });
    }
  }

  // 3. Inventory low
  for (const item of store.getItemsBelowReorder()) {
    const isStockout = item.quantityOnHand === 0;
    anomalies.push({
      id: `inventory-${item.partNumber}-${isStockout ? "stockout" : "low"}`,
      type: "inventory_low",
      severity: isStockout ? "critical" : "warning",
      title: isStockout ? `Stockout: ${item.partNumber}` : `Low stock: ${item.partNumber}`,
      description: `${item.description}: ${item.quantityOnHand} on hand (reorder at ${item.reorderPoint}).`,
      entityId: item.partNumber,
      detectedAt: now,
    });
  }

  // 4. Quality alerts
  for (const insp of store.inspections) {
    if (insp.passRate < 0.9) {
      anomalies.push({
        id: `quality-${insp.id}`,
        type: "quality_alert",
        severity: insp.passRate < 0.8 ? "critical" : "warning",
        title: `Quality ${insp.passRate < 0.8 ? "failure" : "concern"}: ${insp.lineId}`,
        description: `Inspection ${insp.id}: ${Math.round(insp.passRate * 100)}% pass, disposition: ${insp.disposition}.`,
        entityId: insp.lineId,
        detectedAt: now,
      });
    }
  }

  // 5. Line status
  for (const line of store.lines) {
    if (line.status === "down" || line.status === "maintenance") {
      anomalies.push({
        id: `line-${line.id}-${line.status}`,
        type: "line_down",
        severity: line.status === "down" ? "critical" : "info",
        title: `Line ${line.status}: ${line.name}`,
        description: `${line.name} is ${line.status}. Progress: ${line.completedUnits}/${line.scheduledUnits} units.`,
        entityId: line.id,
        detectedAt: now,
      });
    }
  }

  // Deduplicate by id (blocked flag + delay may overlap)
  const seen = new Set<string>();
  return anomalies.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
}

export function buildAnomalyContext(
  anomaly: Anomaly,
  state: SimState,
  store: IFactoryStore
): string {
  const lines: string[] = [
    `## Proactive Monitor Alert`,
    `Alert: ${anomaly.title}`,
    `Severity: ${anomaly.severity.toUpperCase()}`,
    `Type: ${anomaly.type}`,
    `Day: ${state.currentDay}`,
    ``,
    anomaly.description,
    ``,
  ];

  switch (anomaly.type) {
    case "batch_delay": {
      const batch = state.batches.find((b) => b.id === anomaly.entityId);
      if (batch) {
        lines.push(`Batch: ${batch.id} (${batch.productLabel})`);
        lines.push(
          `Stage: ${batch.stage} — ${batch.daysInStage} of ${batch.baseDays + batch.delayDays} days`
        );
        lines.push(`Flags: ${batch.flags.join(", ") || "none"}`);
        const sup = store.getSupplierById(batch.supplierId);
        if (sup)
          lines.push(
            `Supplier: ${sup.name} (${sup.status}, ${Math.round(sup.onTimeRate * 100)}% on-time)`
          );
      }
      break;
    }
    case "supplier_risk": {
      const sup = store.getSupplierById(anomaly.entityId);
      if (sup) {
        lines.push(`Supplier: ${sup.name} — ${sup.country}`);
        lines.push(`Lead time: ${sup.leadTimeDays}d, On-time: ${Math.round(sup.onTimeRate * 100)}%`);
        lines.push(`Components: ${sup.components.join(", ")}`);
        if (sup.delayReason) lines.push(`Reason: ${sup.delayReason}`);
        const affected = state.batches.filter(
          (b) => b.supplierId === anomaly.entityId && b.stage !== "delivered"
        );
        if (affected.length)
          lines.push(`Affected batches: ${affected.map((b) => b.id).join(", ")}`);
      }
      break;
    }
    case "inventory_low": {
      const item = store.getInventoryByPart(anomaly.entityId);
      if (item) {
        lines.push(`Part: ${item.partNumber} — ${item.description}`);
        lines.push(
          `On hand: ${item.quantityOnHand}, Reorder at: ${item.reorderPoint}, Reorder qty: ${item.reorderQuantity}`
        );
        const sups = store.getSuppliersForComponent(item.partNumber);
        if (sups.length)
          lines.push(`Suppliers: ${sups.map((s) => `${s.name}(${s.status})`).join(", ")}`);
      }
      break;
    }
    case "quality_alert": {
      const recent = store.getInspectionsByLine(anomaly.entityId).slice(0, 3);
      if (recent.length) {
        lines.push(`Recent inspections on ${anomaly.entityId}:`);
        for (const i of recent) {
          lines.push(`  ${i.id}: ${Math.round(i.passRate * 100)}% pass, ${i.disposition}`);
          if (i.defectTypes.length)
            lines.push(
              `    Defects: ${i.defectTypes.map((d) => `${d.type}(${d.severity}×${d.count})`).join(", ")}`
            );
        }
      }
      break;
    }
    case "line_down": {
      const line = store.getLineById(anomaly.entityId);
      if (line) {
        lines.push(`Line: ${line.name} — ${line.status}`);
        lines.push(
          `Progress: ${line.completedUnits}/${line.scheduledUnits} units, ${line.throughputPerHour}/hr`
        );
        const batches = state.batches.filter(
          (b) => b.lineId === anomaly.entityId && b.stage !== "delivered"
        );
        if (batches.length)
          lines.push(`Active batches: ${batches.map((b) => `${b.id}(${b.stage})`).join(", ")}`);
      }
      break;
    }
  }

  lines.push(``);
  lines.push(
    `Investigate this anomaly using factory tools. Search for alternatives where applicable. Submit 2–4 actionable recommendations.`
  );

  return lines.join("\n");
}
