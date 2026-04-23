import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { seedDb } from "@/lib/db/seed";
import {
  productionLines, suppliers, supplierComponents,
  qualityInspections, defectEntries,
  inventoryItems, bomEntries, bomComponents,
} from "@/lib/db/schema";
import type {
  ProductionLine, Supplier, QualityInspection, InventoryItem, BOMEntry, DefectEntry,
} from "./types";
import type { IFactoryStore } from "./store";

export class DatabaseFactoryStore implements IFactoryStore {
  private static instance: DatabaseFactoryStore;

  private constructor() {
    seedDb(); // idempotent — only inserts if tables are empty
  }

  static getInstance(): DatabaseFactoryStore {
    if (!DatabaseFactoryStore.instance) {
      DatabaseFactoryStore.instance = new DatabaseFactoryStore();
    }
    return DatabaseFactoryStore.instance;
  }

  // ── Lines ───────────────────────────────────────────────────────────────────

  get lines(): ProductionLine[] {
    return db.select().from(productionLines).all().map(toLine);
  }

  getLineById(id: string): ProductionLine | undefined {
    const row = db.select().from(productionLines).where(eq(productionLines.id, id)).get();
    return row ? toLine(row) : undefined;
  }

  updateLineStatus(lineId: string, status: ProductionLine["status"]): ProductionLine | undefined {
    const throughputPerHour = status === "running" ? undefined : 0;
    if (throughputPerHour === 0) {
      db.update(productionLines)
        .set({ status, throughputPerHour: 0 })
        .where(eq(productionLines.id, lineId))
        .run();
    } else {
      db.update(productionLines)
        .set({ status })
        .where(eq(productionLines.id, lineId))
        .run();
    }
    return this.getLineById(lineId);
  }

  // ── Suppliers ───────────────────────────────────────────────────────────────

  get suppliers(): Supplier[] {
    const rows = db.select().from(suppliers).all();
    const compRows = db.select().from(supplierComponents).all();
    return rows.map((row) => toSupplier(row, compRows));
  }

  getSupplierById(id: string): Supplier | undefined {
    const row = db.select().from(suppliers).where(eq(suppliers.id, id)).get();
    if (!row) return undefined;
    const compRows = db.select().from(supplierComponents)
      .where(eq(supplierComponents.supplierId, id)).all();
    return toSupplier(row, compRows);
  }

  getSuppliersByCountry(country: string): Supplier[] {
    return this.suppliers.filter((s) => s.country.toLowerCase() === country.toLowerCase());
  }

  getDelayedSuppliers(): Supplier[] {
    return this.suppliers.filter((s) => s.status === "delayed" || s.status === "at-risk");
  }

  getSuppliersForComponent(partNumber: string): Supplier[] {
    const compRows = db.select().from(supplierComponents)
      .where(eq(supplierComponents.partNumber, partNumber)).all();
    return compRows.map((c) => this.getSupplierById(c.supplierId)).filter(Boolean) as Supplier[];
  }

  // ── Inspections ─────────────────────────────────────────────────────────────

  get inspections(): QualityInspection[] {
    const rows = db.select().from(qualityInspections).all();
    const defects = db.select().from(defectEntries).all();
    return rows.map((row) => toInspection(row, defects));
  }

  getInspectionsByLine(lineId: string): QualityInspection[] {
    const rows = db.select().from(qualityInspections)
      .where(eq(qualityInspections.lineId, lineId)).all();
    if (rows.length === 0) return [];
    const defects = db.select().from(defectEntries).all();
    return rows.map((row) => toInspection(row, defects));
  }

  getInspectionsByBatch(batchId: string): QualityInspection[] {
    const rows = db.select().from(qualityInspections)
      .where(eq(qualityInspections.batchId, batchId)).all();
    if (rows.length === 0) return [];
    const defects = db.select().from(defectEntries).all();
    return rows.map((row) => toInspection(row, defects));
  }

  // ── Inventory ────────────────────────────────────────────────────────────────

  get inventory(): InventoryItem[] {
    return db.select().from(inventoryItems).all().map(toInventoryItem);
  }

  getInventoryByPart(partNumber: string): InventoryItem | undefined {
    const row = db.select().from(inventoryItems)
      .where(eq(inventoryItems.partNumber, partNumber)).get();
    return row ? toInventoryItem(row) : undefined;
  }

  getItemsBelowReorder(): InventoryItem[] {
    return this.inventory.filter((i) => i.quantityOnHand <= i.reorderPoint);
  }

  updateInventoryQuantity(partNumber: string, delta: number): InventoryItem | undefined {
    const item = this.getInventoryByPart(partNumber);
    if (!item) return undefined;
    const newQty = Math.max(0, item.quantityOnHand + delta);
    db.update(inventoryItems)
      .set({ quantityOnHand: newQty })
      .where(eq(inventoryItems.partNumber, partNumber))
      .run();
    return { ...item, quantityOnHand: newQty };
  }

  // ── BOMs ─────────────────────────────────────────────────────────────────────

  get boms(): BOMEntry[] {
    const entries = db.select().from(bomEntries).all();
    const comps = db.select().from(bomComponents).all();
    return entries.map((e) => ({
      productId: e.productId,
      productName: e.productName,
      components: comps
        .filter((c) => c.productId === e.productId)
        .map((c) => ({ partNumber: c.partNumber, quantity: c.quantity })),
    }));
  }

  getBOM(productId: string): BOMEntry | undefined {
    const entry = db.select().from(bomEntries).where(eq(bomEntries.productId, productId)).get();
    if (!entry) return undefined;
    const comps = db.select().from(bomComponents)
      .where(eq(bomComponents.productId, productId)).all();
    return {
      productId: entry.productId,
      productName: entry.productName,
      components: comps.map((c) => ({ partNumber: c.partNumber, quantity: c.quantity })),
    };
  }
}

// ── Row → Domain mappers ──────────────────────────────────────────────────────

type LineRow = typeof productionLines.$inferSelect;
type SupplierRow = typeof suppliers.$inferSelect;
type SupplierCompRow = typeof supplierComponents.$inferSelect;
type InspectionRow = typeof qualityInspections.$inferSelect;
type DefectRow = typeof defectEntries.$inferSelect;
type InventoryRow = typeof inventoryItems.$inferSelect;

function toLine(row: LineRow): ProductionLine {
  return {
    id: row.id,
    name: row.name,
    status: row.status as ProductionLine["status"],
    currentProduct: row.currentProduct,
    scheduledUnits: row.scheduledUnits,
    completedUnits: row.completedUnits,
    throughputPerHour: row.throughputPerHour,
    shiftEnd: row.shiftEnd,
    operatorCount: row.operatorCount,
  };
}

function toSupplier(row: SupplierRow, compRows: SupplierCompRow[]): Supplier {
  return {
    id: row.id,
    name: row.name,
    country: row.country,
    components: compRows
      .filter((c) => c.supplierId === row.id)
      .map((c) => c.partNumber),
    leadTimeDays: row.leadTimeDays,
    onTimeRate: row.onTimeRate,
    status: row.status as Supplier["status"],
    lastDelivery: row.lastDelivery,
    nextExpectedDelivery: row.nextExpectedDelivery,
    delayReason: row.delayReason ?? undefined,
  };
}

function toInspection(row: InspectionRow, defects: DefectRow[]): QualityInspection {
  return {
    id: row.id,
    lineId: row.lineId,
    batchId: row.batchId,
    timestamp: row.timestamp,
    inspectorId: row.inspectorId,
    defectsFound: row.defectsFound,
    defectTypes: defects
      .filter((d) => d.inspectionId === row.id)
      .map((d): DefectEntry => ({
        type: d.type,
        severity: d.severity as DefectEntry["severity"],
        count: d.count,
      })),
    passRate: row.passRate,
    disposition: row.disposition as QualityInspection["disposition"],
  };
}

function toInventoryItem(row: InventoryRow): InventoryItem {
  return {
    id: row.id,
    partNumber: row.partNumber,
    description: row.description,
    quantityOnHand: row.quantityOnHand,
    reorderPoint: row.reorderPoint,
    reorderQuantity: row.reorderQuantity,
    unitCost: row.unitCost,
    supplierId: row.supplierId,
    location: row.location,
    lastRestocked: row.lastRestocked,
  };
}
