import type {
  ProductionLine, Supplier, QualityInspection, InventoryItem, BOMEntry,
} from "./types";
import {
  seedProductionLines, seedSuppliers, seedInspections, seedInventory, seedBOMs,
} from "./seed";
import type { IFactoryStore } from "./store";

export class SimulatedFactoryStore implements IFactoryStore {
  private static instance: SimulatedFactoryStore;

  lines: ProductionLine[] = [];
  suppliers: Supplier[] = [];
  inspections: QualityInspection[] = [];
  inventory: InventoryItem[] = [];
  boms: BOMEntry[] = [];

  private constructor() {
    this.seed();
  }

  static getInstance(): SimulatedFactoryStore {
    if (!SimulatedFactoryStore.instance) {
      SimulatedFactoryStore.instance = new SimulatedFactoryStore();
    }
    return SimulatedFactoryStore.instance;
  }

  seed(): void {
    this.lines = seedProductionLines();
    this.suppliers = seedSuppliers();
    this.inspections = seedInspections();
    this.inventory = seedInventory();
    this.boms = seedBOMs();
  }

  getLineById(id: string): ProductionLine | undefined {
    return this.lines.find((l) => l.id === id);
  }

  getSupplierById(id: string): Supplier | undefined {
    return this.suppliers.find((s) => s.id === id);
  }

  getSuppliersByCountry(country: string): Supplier[] {
    return this.suppliers.filter((s) => s.country.toLowerCase() === country.toLowerCase());
  }

  getDelayedSuppliers(): Supplier[] {
    return this.suppliers.filter((s) => s.status === "delayed" || s.status === "at-risk");
  }

  getInspectionsByLine(lineId: string): QualityInspection[] {
    return this.inspections.filter((i) => i.lineId === lineId);
  }

  getInspectionsByBatch(batchId: string): QualityInspection[] {
    return this.inspections.filter((i) => i.batchId === batchId);
  }

  getInventoryByPart(partNumber: string): InventoryItem | undefined {
    return this.inventory.find((i) => i.partNumber === partNumber);
  }

  getItemsBelowReorder(): InventoryItem[] {
    return this.inventory.filter((i) => i.quantityOnHand <= i.reorderPoint);
  }

  updateInventoryQuantity(partNumber: string, delta: number): InventoryItem | undefined {
    const item = this.getInventoryByPart(partNumber);
    if (item) {
      item.quantityOnHand = Math.max(0, item.quantityOnHand + delta);
    }
    return item;
  }

  getBOM(productId: string): BOMEntry | undefined {
    return this.boms.find((b) => b.productId === productId);
  }

  getSuppliersForComponent(partNumber: string): Supplier[] {
    return this.suppliers.filter((s) => s.components.includes(partNumber));
  }

  updateLineStatus(lineId: string, status: ProductionLine["status"]): ProductionLine | undefined {
    const line = this.getLineById(lineId);
    if (line) {
      line.status = status;
      if (status !== "running") line.throughputPerHour = 0;
    }
    return line;
  }
}
