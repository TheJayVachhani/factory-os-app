import Anthropic from "@anthropic-ai/sdk";
import type { Recommendation } from "@/lib/simulation/engine";
import { factoryStore } from "@/lib/factory/store";

export type AgentEvent =
  | { type: "tool_call"; toolName: string; args: unknown }
  | { type: "agent_response"; text: string }
  | { type: "analysis_complete"; recommendations: Recommendation[] }
  | { type: "error"; message: string };

const SYSTEM_PROMPT = `You are a manufacturing operations analyst for an aerospace production facility. Your job is to respond to factory disruptions by analysing live operational data and submitting concrete, actionable recommendations.

When given an event alert:
1. Use the factory tools to gather full situational awareness — check affected lines, suppliers, inventory, quality records.
2. Submit 2–4 specific recommendations using submit_recommendation. Each must include exact IDs (batch IDs, supplier IDs, part numbers) and quantified impact where possible.
3. Write a concise summary analysis (3–5 sentences) covering: root cause, blast radius, and your prioritised action plan.

Be specific. Use the tool data. Reference exact IDs and numbers in your reasoning.`;

const FACTORY_TOOLS: Anthropic.Tool[] = [
  {
    name: "get_line_status",
    description: "Get current status of production lines — throughput, completion progress, operator count.",
    input_schema: {
      type: "object" as const,
      properties: {
        lineId: { type: "string", description: "Filter to a specific line ID (e.g. LINE-1)" },
      },
    },
  },
  {
    name: "get_schedule_summary",
    description: "Aggregate schedule across all production lines — total units scheduled vs completed, overall completion percentage.",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "flag_bottleneck",
    description: "Find production lines with throughput below a given threshold (units per hour).",
    input_schema: {
      type: "object" as const,
      properties: {
        throughputThreshold: { type: "number", description: "Minimum acceptable throughput per hour" },
      },
      required: ["throughputThreshold"],
    },
  },
  {
    name: "update_line_status",
    description: "Change a production line's status (e.g. take offline for maintenance).",
    input_schema: {
      type: "object" as const,
      properties: {
        lineId: { type: "string" },
        status: { type: "string", enum: ["running", "idle", "maintenance", "down"] },
        reason: { type: "string" },
      },
      required: ["lineId", "status"],
    },
  },
  {
    name: "get_supplier_status",
    description: "Query supplier details by ID or country.",
    input_schema: {
      type: "object" as const,
      properties: {
        supplierId: { type: "string" },
        country: { type: "string" },
      },
    },
  },
  {
    name: "get_delayed_suppliers",
    description: "Returns all suppliers with status 'delayed' or 'at-risk', including delay reasons.",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "get_supplier_risk_report",
    description: "Ranked supplier risk report — sorted by on-time rate (worst first). Flags single-source component dependencies.",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "check_lead_times",
    description: "Get lead times from all suppliers that provide a given component.",
    input_schema: {
      type: "object" as const,
      properties: {
        componentId: { type: "string", description: "Part number to check (e.g. PART-TI-SHEET)" },
      },
      required: ["componentId"],
    },
  },
  {
    name: "get_inspections",
    description: "Query quality inspection records. Filter by line or batch ID. Returns most recent first.",
    input_schema: {
      type: "object" as const,
      properties: {
        lineId: { type: "string" },
        batchId: { type: "string" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "get_defect_summary",
    description: "Aggregate defect counts by type and severity across inspections.",
    input_schema: {
      type: "object" as const,
      properties: {
        lineId: { type: "string" },
      },
    },
  },
  {
    name: "flag_quality_issues",
    description: "Find batches with pass rate below a given threshold.",
    input_schema: {
      type: "object" as const,
      properties: {
        passRateThreshold: { type: "number", description: "Minimum acceptable pass rate (0-1, e.g. 0.85)" },
      },
      required: ["passRateThreshold"],
    },
  },
  {
    name: "get_root_cause_candidates",
    description: "Cross-reference a batch's defects with supplier and production line data to suggest root cause candidates.",
    input_schema: {
      type: "object" as const,
      properties: {
        batchId: { type: "string" },
      },
      required: ["batchId"],
    },
  },
  {
    name: "get_inventory_levels",
    description: "Query current inventory levels. Filter by part number or show only items below reorder point.",
    input_schema: {
      type: "object" as const,
      properties: {
        partNumber: { type: "string" },
        belowReorder: { type: "boolean" },
      },
    },
  },
  {
    name: "get_bom",
    description: "Get the full bill of materials for a product.",
    input_schema: {
      type: "object" as const,
      properties: {
        productId: { type: "string", description: "Product ID (e.g. PROD-A1, PROD-B2, PROD-C3)" },
      },
      required: ["productId"],
    },
  },
  {
    name: "check_bom_availability",
    description: "Check whether current inventory can support building a given quantity of a product.",
    input_schema: {
      type: "object" as const,
      properties: {
        productId: { type: "string" },
        quantity: { type: "number" },
      },
      required: ["productId", "quantity"],
    },
  },
  {
    name: "get_reorder_alerts",
    description: "Returns all inventory items currently at or below their reorder point.",
    input_schema: { type: "object" as const, properties: {} },
  },
];

const SUBMIT_RECOMMENDATION_TOOL: Anthropic.Tool = {
  name: "submit_recommendation",
  description: "Submit a concrete, actionable recommendation. Call this 2-4 times before writing your summary.",
  input_schema: {
    type: "object" as const,
    properties: {
      id: { type: "string", description: "Unique ID for this recommendation (e.g. rec-1)" },
      label: { type: "string", description: "Short title (< 8 words)" },
      reasoning: { type: "string", description: "Why this action, with specific data from tool results" },
      effect_type: {
        type: "string",
        enum: ["switch_supplier", "take_line_offline", "bring_line_online", "expedite_order", "quarantine_batch", "add_safety_stock"],
      },
      effect_params: { type: "object", description: "Parameters for the effect" },
    },
    required: ["id", "label", "reasoning", "effect_type", "effect_params"],
  },
};

function executeFactoryTool(name: string, input: Record<string, unknown>): unknown {
  const store = factoryStore;

  switch (name) {
    case "get_line_status": {
      const lineId = input.lineId as string | undefined;
      if (lineId) return store.getLineById(lineId) ?? { error: `Line ${lineId} not found` };
      return store.lines;
    }
    case "get_schedule_summary": {
      const totalScheduled = store.lines.reduce((s, l) => s + l.scheduledUnits, 0);
      const totalCompleted = store.lines.reduce((s, l) => s + l.completedUnits, 0);
      return {
        totalScheduled, totalCompleted,
        completionPct: totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0,
        byLine: store.lines.map((l) => ({
          id: l.id, name: l.name, status: l.status,
          scheduled: l.scheduledUnits, completed: l.completedUnits,
          pct: l.scheduledUnits > 0 ? Math.round((l.completedUnits / l.scheduledUnits) * 100) : 0,
        })),
      };
    }
    case "flag_bottleneck": {
      const threshold = input.throughputThreshold as number;
      return store.lines.filter((l) => l.throughputPerHour < threshold);
    }
    case "update_line_status": {
      const updated = store.updateLineStatus(input.lineId as string, input.status as "running" | "idle" | "maintenance" | "down");
      return updated ?? { error: `Line ${input.lineId} not found` };
    }
    case "get_supplier_status": {
      if (input.supplierId) return store.getSupplierById(input.supplierId as string) ?? { error: "Supplier not found" };
      if (input.country) return store.getSuppliersByCountry(input.country as string);
      return store.suppliers;
    }
    case "get_delayed_suppliers":
      return store.getDelayedSuppliers();
    case "get_supplier_risk_report": {
      const sorted = [...store.suppliers].sort((a, b) => a.onTimeRate - b.onTimeRate);
      const componentToSuppliers: Record<string, string[]> = {};
      for (const s of store.suppliers) {
        for (const c of s.components) {
          if (!componentToSuppliers[c]) componentToSuppliers[c] = [];
          componentToSuppliers[c].push(s.id);
        }
      }
      const singleSource = Object.entries(componentToSuppliers)
        .filter(([, sups]) => sups.length === 1)
        .map(([part, sups]) => ({ partNumber: part, supplierId: sups[0] }));
      return { ranked: sorted, singleSourceComponents: singleSource };
    }
    case "check_lead_times": {
      const componentId = input.componentId as string;
      const suppliers = store.getSuppliersForComponent(componentId);
      return suppliers.map((s) => ({
        supplierId: s.id, name: s.name, leadTimeDays: s.leadTimeDays,
        status: s.status, onTimeRate: s.onTimeRate,
      }));
    }
    case "get_inspections": {
      let results = store.inspections;
      if (input.lineId) results = results.filter((i) => i.lineId === input.lineId);
      if (input.batchId) results = results.filter((i) => i.batchId === input.batchId);
      results = [...results].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      const limit = (input.limit as number) ?? 20;
      return results.slice(0, limit);
    }
    case "get_defect_summary": {
      let inspections = store.inspections;
      if (input.lineId) inspections = inspections.filter((i) => i.lineId === input.lineId);
      const byType: Record<string, { count: number; severities: Record<string, number> }> = {};
      for (const insp of inspections) {
        for (const d of insp.defectTypes) {
          if (!byType[d.type]) byType[d.type] = { count: 0, severities: {} };
          byType[d.type].count += d.count;
          byType[d.type].severities[d.severity] = (byType[d.type].severities[d.severity] ?? 0) + d.count;
        }
      }
      return { totalInspections: inspections.length, defectsByType: byType };
    }
    case "flag_quality_issues": {
      const threshold = input.passRateThreshold as number;
      return [...store.inspections]
        .filter((i) => i.passRate < threshold)
        .sort((a, b) => a.passRate - b.passRate);
    }
    case "get_root_cause_candidates": {
      const batchId = input.batchId as string;
      const inspections = store.getInspectionsByBatch(batchId);
      const hasMaterialFlaw = inspections.some((i) => i.defectTypes.some((d) => d.type === "material_flaw"));
      const lineId = inspections[0]?.lineId;
      const line = lineId ? store.getLineById(lineId) : undefined;
      const candidates: unknown[] = [];
      if (hasMaterialFlaw && line) {
        const product = line.currentProduct;
        const bom = store.getBOM(product);
        if (bom) {
          for (const comp of bom.components) {
            const suppliers = store.getSuppliersForComponent(comp.partNumber);
            for (const s of suppliers) {
              if (s.status !== "active" || s.onTimeRate < 0.9) {
                candidates.push({ partNumber: comp.partNumber, supplierId: s.id, supplierName: s.name, status: s.status, onTimeRate: s.onTimeRate, reason: "Potential incoming material issue" });
              }
            }
          }
        }
      }
      return { batchId, inspections, lineStatus: line, rootCauseCandidates: candidates };
    }
    case "get_inventory_levels": {
      if (input.partNumber) return store.getInventoryByPart(input.partNumber as string) ?? { error: "Part not found" };
      if (input.belowReorder) return store.getItemsBelowReorder();
      return store.inventory;
    }
    case "get_bom": {
      const bom = store.getBOM(input.productId as string);
      return bom ?? { error: `BOM not found for ${input.productId}` };
    }
    case "check_bom_availability": {
      const productId = input.productId as string;
      const quantity = input.quantity as number;
      const bom = store.getBOM(productId);
      if (!bom) return { error: `BOM not found for ${productId}` };
      const components = bom.components.map((comp) => {
        const needed = comp.quantity * quantity;
        const item = store.getInventoryByPart(comp.partNumber);
        const onHand = item?.quantityOnHand ?? 0;
        return { partNumber: comp.partNumber, needed, onHand, available: onHand >= needed, shortfall: Math.max(0, needed - onHand) };
      });
      const canFulfill = components.every((c) => c.available);
      const maxBuildable = Math.min(...bom.components.map((comp) => {
        const item = store.getInventoryByPart(comp.partNumber);
        return comp.quantity > 0 ? Math.floor((item?.quantityOnHand ?? 0) / comp.quantity) : Infinity;
      }));
      return { productId, quantity, canFulfill, maxBuildableUnits: maxBuildable, components };
    }
    case "get_reorder_alerts": {
      return store.getItemsBelowReorder().map((i) => ({
        ...i, deficit: i.reorderPoint - i.quantityOnHand,
      }));
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

export async function analyzeEvent(
  agentContext: string,
  emit: (event: AgentEvent) => void
): Promise<Recommendation[]> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    maxRetries: 5,
  });

  const allTools = [...FACTORY_TOOLS, SUBMIT_RECOMMENDATION_TOOL];
  const recommendations: Recommendation[] = [];

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: agentContext },
  ];

  try {
    for (let turn = 0; turn < 20; turn++) {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: allTools,
        messages,
      });

      messages.push({ role: "assistant", content: response.content });

      if (response.stop_reason === "end_turn") {
        const text = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("");
        if (text) emit({ type: "agent_response", text });
        break;
      }

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type === "tool_use") {
          if (block.name === "submit_recommendation") {
            const inp = block.input as Record<string, unknown>;
            const rec: Recommendation = {
              id: inp.id as string,
              label: inp.label as string,
              reasoning: inp.reasoning as string,
              effectType: inp.effect_type as Recommendation["effectType"],
              effectParams: inp.effect_params as Record<string, unknown>,
            };
            recommendations.push(rec);
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: JSON.stringify({ status: "recommendation_recorded" }),
            });
          } else {
            emit({ type: "tool_call", toolName: block.name, args: block.input });
            const result = executeFactoryTool(block.name, block.input as Record<string, unknown>);
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: JSON.stringify(result),
            });
          }
        }
      }

      if (toolResults.length === 0) break;
      messages.push({ role: "user", content: toolResults });
    }
  } catch (err) {
    emit({ type: "error", message: err instanceof Error ? err.message : "Unknown error" });
  }

  emit({ type: "analysis_complete", recommendations });
  return recommendations;
}
