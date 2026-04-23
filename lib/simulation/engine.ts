import { getFactoryStore } from "@/lib/factory/store";

export type BatchStage =
  | "queue"
  | "procurement"
  | "manufacturing"
  | "qc"
  | "shipping"
  | "delivered";

export type EffectType =
  | "switch_supplier"
  | "take_line_offline"
  | "bring_line_online"
  | "expedite_order"
  | "quarantine_batch"
  | "add_safety_stock";

export interface SimBatch {
  id: string;
  productId: string;
  productLabel: string;
  lineId: string;
  supplierId: string;
  quantity: number;
  stage: BatchStage;
  daysInStage: number;
  baseDays: number;
  delayDays: number;
  flags: string[];
  startDay: number;
}

export interface SimEvent {
  id: string;
  label: string;
  description: string;
  day: number;
}

export interface Recommendation {
  id: string;
  label: string;
  reasoning: string;
  effectType: EffectType;
  effectParams: Record<string, unknown>;
}

export interface SimState {
  currentDay: number;
  batches: SimBatch[];
  lastEvent: SimEvent | null;
  pendingRecs: Recommendation[];
  appliedRecs: Recommendation[];
  eventLog: SimEvent[];
}

const STAGE_BASE_DAYS: Record<BatchStage, number> = {
  queue: 0,
  procurement: 12,
  manufacturing: 20,
  qc: 5,
  shipping: 7,
  delivered: 0,
};

const STAGE_ORDER: BatchStage[] = [
  "queue", "procurement", "manufacturing", "qc", "shipping", "delivered",
];

function nextStage(stage: BatchStage): BatchStage {
  const idx = STAGE_ORDER.indexOf(stage);
  return STAGE_ORDER[Math.min(idx + 1, STAGE_ORDER.length - 1)];
}

function b(
  id: string, productId: string, productLabel: string, lineId: string,
  supplierId: string, quantity: number, stage: BatchStage,
  daysInStage: number, baseDays: number, startDay: number,
  flags: string[] = []
): SimBatch {
  return { id, productId, productLabel, lineId, supplierId, quantity,
           stage, daysInStage, baseDays, delayDays: 0, flags, startDay };
}

function seedBatches(): SimBatch[] {
  return [
    b("BATCH-SIM-01", "PROD-C3", "Cirrus C3",   "LINE-5", "SUP-006", 4, "shipping",       5, 7,  1),
    b("BATCH-SIM-02", "PROD-A1", "Atlas A1",    "LINE-1", "SUP-006", 8, "qc",             3, 5,  1),
    b("BATCH-SIM-03", "PROD-B2", "Boreas B2",   "LINE-3", "SUP-001", 5, "qc",             1, 5,  1),
    b("BATCH-SIM-04", "PROD-A1", "Atlas A1",    "LINE-2", "SUP-006", 6, "manufacturing",  16, 20, 1),
    b("BATCH-SIM-05", "PROD-C3", "Cirrus C3",   "LINE-4", "SUP-006", 4, "manufacturing",  8,  20, 1),
    b("BATCH-SIM-06", "PROD-B2", "Boreas B2",   "LINE-3", "SUP-001", 3, "procurement",    9,  12, 1),
    b("BATCH-SIM-07", "PROD-A1", "Atlas A1",    "LINE-1", "SUP-006", 8, "procurement",    2,  12, 1),
    b("BATCH-SIM-08", "PROD-B2", "Boreas B2",   "LINE-3", "SUP-001", 3, "queue", 0, 0, 1),
    b("BATCH-SIM-09", "PROD-C3", "Cirrus C3",   "LINE-5", "SUP-006", 5, "queue", 0, 0, 10),
    b("BATCH-SIM-10", "PROD-A1", "Atlas A1",    "LINE-2", "SUP-006", 8, "queue", 0, 0, 20),
    b("BATCH-SIM-11", "PROD-B2", "Boreas B2",   "LINE-3", "SUP-001", 4, "queue", 0, 0, 30),
    b("BATCH-SIM-12", "PROD-C3", "Cirrus C3",   "LINE-4", "SUP-006", 6, "queue", 0, 0, 40),
    b("BATCH-SIM-13", "PROD-A1", "Atlas A1",    "LINE-1", "SUP-006", 5, "queue", 0, 0, 50),
    b("BATCH-SIM-14", "PROD-B2", "Boreas B2",   "LINE-3", "SUP-001", 3, "queue", 0, 0, 60),
  ];
}

// ── DB sync helpers (only active when DATA_SOURCE=db) ────────────────────────

function isDbMode(): boolean {
  return process.env.DATA_SOURCE === "db";
}

function syncStateToDb(state: SimState): void {
  if (!isDbMode()) return;
  // Dynamic require keeps better-sqlite3 out of the module graph in sim mode
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { db } = require("@/lib/db/client") as typeof import("@/lib/db/client");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const schema = require("@/lib/db/schema") as typeof import("@/lib/db/schema");
  const { eq } = require("drizzle-orm") as typeof import("drizzle-orm");

  // Upsert sim_state
  const existing = db.select().from(schema.simState).where(eq(schema.simState.id, 1)).get();
  if (existing) {
    db.update(schema.simState)
      .set({ currentDay: state.currentDay, lastEventId: state.lastEvent?.id ?? null })
      .where(eq(schema.simState.id, 1))
      .run();
  } else {
    db.insert(schema.simState)
      .values({ id: 1, currentDay: state.currentDay, lastEventId: state.lastEvent?.id ?? null })
      .run();
  }

  // Replace all batches
  db.delete(schema.simBatches).run();
  if (state.batches.length > 0) {
    db.insert(schema.simBatches).values(
      state.batches.map((batch) => ({
        id: batch.id,
        productId: batch.productId,
        productLabel: batch.productLabel,
        lineId: batch.lineId,
        supplierId: batch.supplierId,
        quantity: batch.quantity,
        stage: batch.stage,
        daysInStage: batch.daysInStage,
        baseDays: batch.baseDays,
        delayDays: batch.delayDays,
        flags: JSON.stringify(batch.flags),
        startDay: batch.startDay,
      }))
    ).run();
  }

  // Upsert events
  for (const event of state.eventLog) {
    const existingEvent = db.select().from(schema.simEvents)
      .where(eq(schema.simEvents.id, event.id)).get();
    if (!existingEvent) {
      db.insert(schema.simEvents).values({
        id: event.id,
        label: event.label,
        description: event.description,
        day: event.day,
        triggeredAt: Date.now(),
      }).run();
    }
  }

  // Upsert recommendations
  const currentRecIds = new Set([
    ...state.pendingRecs.map((r) => r.id),
    ...state.appliedRecs.map((r) => r.id),
  ]);
  for (const rec of state.pendingRecs) {
    const existingRec = db.select().from(schema.simRecommendations)
      .where(eq(schema.simRecommendations.id, rec.id)).get();
    if (!existingRec) {
      db.insert(schema.simRecommendations).values({
        id: rec.id,
        eventId: state.lastEvent?.id ?? "",
        label: rec.label,
        reasoning: rec.reasoning,
        effectType: rec.effectType,
        effectParams: JSON.stringify(rec.effectParams),
        status: "pending",
        appliedAt: null,
      }).run();
    }
  }
  for (const rec of state.appliedRecs) {
    const existingRec = db.select().from(schema.simRecommendations)
      .where(eq(schema.simRecommendations.id, rec.id)).get();
    if (existingRec && existingRec.status !== "applied") {
      db.update(schema.simRecommendations)
        .set({ status: "applied", appliedAt: Date.now() })
        .where(eq(schema.simRecommendations.id, rec.id))
        .run();
    } else if (!existingRec) {
      db.insert(schema.simRecommendations).values({
        id: rec.id,
        eventId: state.lastEvent?.id ?? "",
        label: rec.label,
        reasoning: rec.reasoning,
        effectType: rec.effectType,
        effectParams: JSON.stringify(rec.effectParams),
        status: "applied",
        appliedAt: Date.now(),
      }).run();
    }
  }
  // Mark recs that are no longer pending/applied as ignored
  const allDbRecs = db.select().from(schema.simRecommendations)
    .where(eq(schema.simRecommendations.status, "pending")).all();
  for (const dbRec of allDbRecs) {
    if (!currentRecIds.has(dbRec.id)) {
      db.update(schema.simRecommendations)
        .set({ status: "ignored" })
        .where(eq(schema.simRecommendations.id, dbRec.id))
        .run();
    }
  }
}

function loadStateFromDb(): SimState | null {
  if (!isDbMode()) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { db } = require("@/lib/db/client") as typeof import("@/lib/db/client");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const schema = require("@/lib/db/schema") as typeof import("@/lib/db/schema");
  const { eq } = require("drizzle-orm") as typeof import("drizzle-orm");

  const stateRow = db.select().from(schema.simState).where(eq(schema.simState.id, 1)).get();
  if (!stateRow) return null;

  const batchRows = db.select().from(schema.simBatches).all();
  const eventRows = db.select().from(schema.simEvents).all();
  const recRows = db.select().from(schema.simRecommendations).all();

  const batches: SimBatch[] = batchRows.map((row) => ({
    id: row.id,
    productId: row.productId,
    productLabel: row.productLabel,
    lineId: row.lineId,
    supplierId: row.supplierId,
    quantity: row.quantity,
    stage: row.stage as BatchStage,
    daysInStage: row.daysInStage,
    baseDays: row.baseDays,
    delayDays: row.delayDays,
    flags: JSON.parse(row.flags) as string[],
    startDay: row.startDay,
  }));

  const eventLog: SimEvent[] = eventRows.map((row) => ({
    id: row.id,
    label: row.label,
    description: row.description,
    day: row.day,
  }));

  const toRec = (row: typeof recRows[0]): Recommendation => ({
    id: row.id,
    label: row.label,
    reasoning: row.reasoning,
    effectType: row.effectType as EffectType,
    effectParams: JSON.parse(row.effectParams) as Record<string, unknown>,
  });

  const pendingRecs = recRows.filter((r) => r.status === "pending").map(toRec);
  const appliedRecs = recRows.filter((r) => r.status === "applied").map(toRec);

  const lastEvent = stateRow.lastEventId
    ? eventLog.find((e) => e.id === stateRow.lastEventId) ?? null
    : null;

  return { currentDay: stateRow.currentDay, batches, lastEvent, pendingRecs, appliedRecs, eventLog };
}

// ── SimulationEngine ──────────────────────────────────────────────────────────

export class SimulationEngine {
  private state: SimState;

  constructor() {
    const persisted = loadStateFromDb();
    this.state = persisted ?? this._freshState();
  }

  private _freshState(): SimState {
    return {
      currentDay: 1,
      batches: seedBatches(),
      lastEvent: null,
      pendingRecs: [],
      appliedRecs: [],
      eventLog: [],
    };
  }

  getState(): SimState {
    return JSON.parse(JSON.stringify(this.state)) as SimState;
  }

  reset(): SimState {
    this.state = this._freshState();
    syncStateToDb(this.state);
    return this.getState();
  }

  advance(days: number): SimState {
    const d = Math.max(1, Math.min(days, 90 - this.state.currentDay));
    for (let i = 0; i < d; i++) {
      this.state.currentDay++;
      this._tick();
    }
    syncStateToDb(this.state);
    return this.getState();
  }

  private _tick(): void {
    for (const batch of this.state.batches) {
      if (batch.stage === "delivered") continue;
      if (batch.stage === "queue") {
        if (this.state.currentDay >= batch.startDay) {
          batch.stage = "procurement";
          batch.daysInStage = 0;
          batch.baseDays = STAGE_BASE_DAYS["procurement"];
        }
        continue;
      }
      if (batch.flags.includes("blocked")) {
        batch.daysInStage++;
        continue;
      }
      batch.daysInStage++;
      const totalDays = batch.baseDays + batch.delayDays;
      if (batch.daysInStage >= totalDays) {
        const next = nextStage(batch.stage);
        batch.stage = next;
        batch.daysInStage = 0;
        batch.delayDays = 0;
        batch.baseDays = STAGE_BASE_DAYS[next];
        batch.flags = batch.flags.filter((f) => f === "urgent" || f === "quality-risk");
      }
    }
  }

  triggerEvent(eventId: string, label: string, description: string): SimState {
    const event: SimEvent = { id: eventId, label, description, day: this.state.currentDay };
    this.state.lastEvent = event;
    this.state.eventLog.push(event);
    this.state.pendingRecs = [];
    syncStateToDb(this.state);
    return this.getState();
  }

  applyEventEffect(fn: (batches: SimBatch[]) => void): SimState {
    fn(this.state.batches);
    syncStateToDb(this.state);
    return this.getState();
  }

  setRecommendations(recs: Recommendation[]): void {
    this.state.pendingRecs = recs;
    syncStateToDb(this.state);
  }

  applyRecommendation(rec: Recommendation): SimState {
    const { effectType, effectParams: p } = rec;

    switch (effectType) {
      case "switch_supplier": {
        const batchIds = p["batchIds"] as string[];
        const newSupplierId = p["newSupplierId"] as string;
        const daysReduction = (p["daysReduction"] as number) ?? 0;
        for (const batch of this.state.batches) {
          if (batchIds.includes(batch.id) && batch.stage === "procurement") {
            batch.supplierId = newSupplierId;
            batch.delayDays = Math.max(0, batch.delayDays - daysReduction);
            batch.flags = batch.flags.filter((f) => f !== "delayed" && f !== "blocked");
          }
        }
        break;
      }
      case "take_line_offline": {
        const lineId = p["lineId"] as string;
        for (const batch of this.state.batches) {
          if (batch.lineId === lineId && batch.stage === "manufacturing") {
            if (!batch.flags.includes("blocked")) batch.flags.push("blocked");
          }
        }
        break;
      }
      case "bring_line_online": {
        const lineId = p["lineId"] as string;
        for (const batch of this.state.batches) {
          if (batch.lineId === lineId) {
            batch.flags = batch.flags.filter((f) => f !== "blocked");
          }
        }
        break;
      }
      case "expedite_order": {
        const batchId = p["batchId"] as string;
        const daysReduction = (p["daysReduction"] as number) ?? 5;
        const batch = this.state.batches.find((b) => b.id === batchId);
        if (batch) {
          batch.delayDays = Math.max(0, batch.delayDays - daysReduction);
          batch.baseDays = Math.max(1, batch.baseDays - Math.floor(daysReduction / 2));
          batch.flags = batch.flags.filter((f) => f !== "delayed");
        }
        break;
      }
      case "quarantine_batch": {
        const batchId = p["batchId"] as string;
        const batch = this.state.batches.find((b) => b.id === batchId);
        if (batch) {
          batch.stage = "qc";
          batch.daysInStage = 0;
          batch.baseDays = STAGE_BASE_DAYS["qc"];
          batch.delayDays = 3;
          if (!batch.flags.includes("hold")) batch.flags.push("hold");
        }
        break;
      }
      case "add_safety_stock": {
        const partNumber = p["partNumber"] as string;
        const quantity = (p["quantity"] as number) ?? 0;
        getFactoryStore().updateInventoryQuantity(partNumber, quantity);
        break;
      }
    }

    this.state.pendingRecs = this.state.pendingRecs.filter((r) => r.id !== rec.id);
    this.state.appliedRecs.push({ ...rec });
    syncStateToDb(this.state);
    return this.getState();
  }
}

// Module-scope singleton — shared across all API route invocations
export const simEngine = new SimulationEngine();
