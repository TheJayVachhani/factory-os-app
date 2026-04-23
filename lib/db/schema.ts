import { sqliteTable, text, integer, real, primaryKey } from "drizzle-orm/sqlite-core";

// ── Factory tables ────────────────────────────────────────────────────────────

export const productionLines = sqliteTable("production_lines", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status").notNull(), // LineStatus
  currentProduct: text("current_product").notNull(),
  scheduledUnits: integer("scheduled_units").notNull(),
  completedUnits: integer("completed_units").notNull(),
  throughputPerHour: real("throughput_per_hour").notNull(),
  shiftEnd: text("shift_end").notNull(),
  operatorCount: integer("operator_count").notNull(),
});

export const suppliers = sqliteTable("suppliers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  country: text("country").notNull(),
  leadTimeDays: integer("lead_time_days").notNull(),
  onTimeRate: real("on_time_rate").notNull(),
  status: text("status").notNull(), // SupplierStatus
  lastDelivery: text("last_delivery").notNull(),
  nextExpectedDelivery: text("next_expected_delivery").notNull(),
  delayReason: text("delay_reason"),
});

export const supplierComponents = sqliteTable(
  "supplier_components",
  {
    supplierId: text("supplier_id").notNull(),
    partNumber: text("part_number").notNull(),
  },
  (t) => [primaryKey({ columns: [t.supplierId, t.partNumber] })]
);

export const qualityInspections = sqliteTable("quality_inspections", {
  id: text("id").primaryKey(),
  lineId: text("line_id").notNull(),
  batchId: text("batch_id").notNull(),
  timestamp: text("timestamp").notNull(),
  inspectorId: text("inspector_id").notNull(),
  defectsFound: integer("defects_found").notNull(),
  passRate: real("pass_rate").notNull(),
  disposition: text("disposition").notNull(), // Disposition
});

export const defectEntries = sqliteTable("defect_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  inspectionId: text("inspection_id").notNull(),
  type: text("type").notNull(),
  severity: text("severity").notNull(), // DefectSeverity
  count: integer("count").notNull(),
});

export const inventoryItems = sqliteTable("inventory_items", {
  id: text("id").primaryKey(),
  partNumber: text("part_number").notNull().unique(),
  description: text("description").notNull(),
  quantityOnHand: integer("quantity_on_hand").notNull(),
  reorderPoint: integer("reorder_point").notNull(),
  reorderQuantity: integer("reorder_quantity").notNull(),
  unitCost: real("unit_cost").notNull(),
  supplierId: text("supplier_id").notNull(),
  location: text("location").notNull(),
  lastRestocked: text("last_restocked").notNull(),
});

export const bomEntries = sqliteTable("bom_entries", {
  productId: text("product_id").primaryKey(),
  productName: text("product_name").notNull(),
});

export const bomComponents = sqliteTable(
  "bom_components",
  {
    productId: text("product_id").notNull(),
    partNumber: text("part_number").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (t) => [primaryKey({ columns: [t.productId, t.partNumber] })]
);

// ── Sim state tables ──────────────────────────────────────────────────────────

export const simState = sqliteTable("sim_state", {
  id: integer("id").primaryKey(), // always 1
  currentDay: integer("current_day").notNull(),
  lastEventId: text("last_event_id"),
});

export const simBatches = sqliteTable("sim_batches", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull(),
  productLabel: text("product_label").notNull(),
  lineId: text("line_id").notNull(),
  supplierId: text("supplier_id").notNull(),
  quantity: integer("quantity").notNull(),
  stage: text("stage").notNull(), // BatchStage
  daysInStage: integer("days_in_stage").notNull(),
  baseDays: integer("base_days").notNull(),
  delayDays: integer("delay_days").notNull(),
  flags: text("flags").notNull().default("[]"), // JSON string array
  startDay: integer("start_day").notNull(),
});

export const simEvents = sqliteTable("sim_events", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  description: text("description").notNull(),
  day: integer("day").notNull(),
  triggeredAt: integer("triggered_at").notNull(), // unix timestamp ms
});

export const simRecommendations = sqliteTable("sim_recommendations", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull(),
  label: text("label").notNull(),
  reasoning: text("reasoning").notNull(),
  effectType: text("effect_type").notNull(),
  effectParams: text("effect_params").notNull(), // JSON
  status: text("status").notNull().default("pending"), // pending | applied | ignored
  appliedAt: integer("applied_at"), // unix timestamp ms, nullable
});
