import type { ProductionLine, Supplier, QualityInspection, InventoryItem, BOMEntry } from "./types";
import { seedProductionLines, seedSuppliers, seedInspections, seedInventory, seedBOMs } from "./seed";

export class FactoryStore {
  private static instance: FactoryStore;

  lines: ProductionLine[] = [];
  suppliers: Supplier[] = [];
  inspections: QualityInspection[] = [];
  inventory: InventoryItem[] = [];
  boms: BOMEntry[] = [];

  private constructor() {
    this.seed();
  }

  static getInstance(): FactoryStore {
    if (!FactoryStore.instance) {
      FactoryStore.instance = new FactoryStore();
    }
    return FactoryStore.instance;
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

// Module-scope singleton
export const factoryStore = FactoryStore.getInstance();
