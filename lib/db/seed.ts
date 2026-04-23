/**
 * Populates the SQLite DB with seed data from the existing seed functions.
 * Idempotent — only inserts if the relevant table is empty.
 */
import { db } from "./client";
import {
  productionLines, suppliers, supplierComponents,
  qualityInspections, defectEntries,
  inventoryItems, bomEntries, bomComponents,
  simState, simBatches,
} from "./schema";
import {
  seedProductionLines, seedSuppliers, seedInspections,
  seedInventory, seedBOMs,
} from "@/lib/factory/seed";
import { eq } from "drizzle-orm";

// Seed batches mirrored from engine.ts seedBatches()
const SEED_BATCHES = [
  { id: "BATCH-SIM-01", productId: "PROD-C3", productLabel: "Cirrus C3",  lineId: "LINE-5", supplierId: "SUP-006", quantity: 4,  stage: "shipping",      daysInStage: 5,  baseDays: 7,  delayDays: 0, flags: "[]", startDay: 1 },
  { id: "BATCH-SIM-02", productId: "PROD-A1", productLabel: "Atlas A1",   lineId: "LINE-1", supplierId: "SUP-006", quantity: 8,  stage: "qc",            daysInStage: 3,  baseDays: 5,  delayDays: 0, flags: "[]", startDay: 1 },
  { id: "BATCH-SIM-03", productId: "PROD-B2", productLabel: "Boreas B2",  lineId: "LINE-3", supplierId: "SUP-001", quantity: 5,  stage: "qc",            daysInStage: 1,  baseDays: 5,  delayDays: 0, flags: "[]", startDay: 1 },
  { id: "BATCH-SIM-04", productId: "PROD-A1", productLabel: "Atlas A1",   lineId: "LINE-2", supplierId: "SUP-006", quantity: 6,  stage: "manufacturing", daysInStage: 16, baseDays: 20, delayDays: 0, flags: "[]", startDay: 1 },
  { id: "BATCH-SIM-05", productId: "PROD-C3", productLabel: "Cirrus C3",  lineId: "LINE-4", supplierId: "SUP-006", quantity: 4,  stage: "manufacturing", daysInStage: 8,  baseDays: 20, delayDays: 0, flags: "[]", startDay: 1 },
  { id: "BATCH-SIM-06", productId: "PROD-B2", productLabel: "Boreas B2",  lineId: "LINE-3", supplierId: "SUP-001", quantity: 3,  stage: "procurement",   daysInStage: 9,  baseDays: 12, delayDays: 0, flags: "[]", startDay: 1 },
  { id: "BATCH-SIM-07", productId: "PROD-A1", productLabel: "Atlas A1",   lineId: "LINE-1", supplierId: "SUP-006", quantity: 8,  stage: "procurement",   daysInStage: 2,  baseDays: 12, delayDays: 0, flags: "[]", startDay: 1 },
  { id: "BATCH-SIM-08", productId: "PROD-B2", productLabel: "Boreas B2",  lineId: "LINE-3", supplierId: "SUP-001", quantity: 3,  stage: "queue",         daysInStage: 0,  baseDays: 0,  delayDays: 0, flags: "[]", startDay: 1 },
  { id: "BATCH-SIM-09", productId: "PROD-C3", productLabel: "Cirrus C3",  lineId: "LINE-5", supplierId: "SUP-006", quantity: 5,  stage: "queue",         daysInStage: 0,  baseDays: 0,  delayDays: 0, flags: "[]", startDay: 10 },
  { id: "BATCH-SIM-10", productId: "PROD-A1", productLabel: "Atlas A1",   lineId: "LINE-2", supplierId: "SUP-006", quantity: 8,  stage: "queue",         daysInStage: 0,  baseDays: 0,  delayDays: 0, flags: "[]", startDay: 20 },
  { id: "BATCH-SIM-11", productId: "PROD-B2", productLabel: "Boreas B2",  lineId: "LINE-3", supplierId: "SUP-001", quantity: 4,  stage: "queue",         daysInStage: 0,  baseDays: 0,  delayDays: 0, flags: "[]", startDay: 30 },
  { id: "BATCH-SIM-12", productId: "PROD-C3", productLabel: "Cirrus C3",  lineId: "LINE-4", supplierId: "SUP-006", quantity: 6,  stage: "queue",         daysInStage: 0,  baseDays: 0,  delayDays: 0, flags: "[]", startDay: 40 },
  { id: "BATCH-SIM-13", productId: "PROD-A1", productLabel: "Atlas A1",   lineId: "LINE-1", supplierId: "SUP-006", quantity: 5,  stage: "queue",         daysInStage: 0,  baseDays: 0,  delayDays: 0, flags: "[]", startDay: 50 },
  { id: "BATCH-SIM-14", productId: "PROD-B2", productLabel: "Boreas B2",  lineId: "LINE-3", supplierId: "SUP-001", quantity: 3,  stage: "queue",         daysInStage: 0,  baseDays: 0,  delayDays: 0, flags: "[]", startDay: 60 },
];

export function seedDb(): void {
  // ── Factory data ────────────────────────────────────────────────────────────

  const lineCount = db.select().from(productionLines).all().length;
  if (lineCount === 0) {
    const lines = seedProductionLines();
    db.insert(productionLines).values(
      lines.map((l) => ({
        id: l.id,
        name: l.name,
        status: l.status,
        currentProduct: l.currentProduct,
        scheduledUnits: l.scheduledUnits,
        completedUnits: l.completedUnits,
        throughputPerHour: l.throughputPerHour,
        shiftEnd: l.shiftEnd,
        operatorCount: l.operatorCount,
      }))
    ).run();
  }

  const supplierCount = db.select().from(suppliers).all().length;
  if (supplierCount === 0) {
    const sups = seedSuppliers();
    for (const s of sups) {
      db.insert(suppliers).values({
        id: s.id,
        name: s.name,
        country: s.country,
        leadTimeDays: s.leadTimeDays,
        onTimeRate: s.onTimeRate,
        status: s.status,
        lastDelivery: s.lastDelivery,
        nextExpectedDelivery: s.nextExpectedDelivery,
        delayReason: s.delayReason ?? null,
      }).run();

      if (s.components.length > 0) {
        db.insert(supplierComponents).values(
          s.components.map((p) => ({ supplierId: s.id, partNumber: p }))
        ).run();
      }
    }
  }

  const inspectionCount = db.select().from(qualityInspections).all().length;
  if (inspectionCount === 0) {
    const inspections = seedInspections();
    for (const insp of inspections) {
      db.insert(qualityInspections).values({
        id: insp.id,
        lineId: insp.lineId,
        batchId: insp.batchId,
        timestamp: insp.timestamp,
        inspectorId: insp.inspectorId,
        defectsFound: insp.defectsFound,
        passRate: insp.passRate,
        disposition: insp.disposition,
      }).run();

      if (insp.defectTypes.length > 0) {
        db.insert(defectEntries).values(
          insp.defectTypes.map((d) => ({
            inspectionId: insp.id,
            type: d.type,
            severity: d.severity,
            count: d.count,
          }))
        ).run();
      }
    }
  }

  const inventoryCount = db.select().from(inventoryItems).all().length;
  if (inventoryCount === 0) {
    const items = seedInventory();
    db.insert(inventoryItems).values(
      items.map((i) => ({
        id: i.id,
        partNumber: i.partNumber,
        description: i.description,
        quantityOnHand: i.quantityOnHand,
        reorderPoint: i.reorderPoint,
        reorderQuantity: i.reorderQuantity,
        unitCost: i.unitCost,
        supplierId: i.supplierId,
        location: i.location,
        lastRestocked: i.lastRestocked,
      }))
    ).run();
  }

  const bomCount = db.select().from(bomEntries).all().length;
  if (bomCount === 0) {
    const boms = seedBOMs();
    for (const bom of boms) {
      db.insert(bomEntries).values({ productId: bom.productId, productName: bom.productName }).run();
      db.insert(bomComponents).values(
        bom.components.map((c) => ({ productId: bom.productId, partNumber: c.partNumber, quantity: c.quantity }))
      ).run();
    }
  }

  // ── Sim state ───────────────────────────────────────────────────────────────

  const stateRows = db.select().from(simState).where(eq(simState.id, 1)).all();
  if (stateRows.length === 0) {
    db.insert(simState).values({ id: 1, currentDay: 1, lastEventId: null }).run();
  }

  const batchCount = db.select().from(simBatches).all().length;
  if (batchCount === 0) {
    db.insert(simBatches).values(SEED_BATCHES).run();
  }
}
