import type {
  ProductionLine, Supplier, QualityInspection, InventoryItem, BOMEntry,
} from "./types";

// ── Interface ─────────────────────────────────────────────────────────────────

export interface IFactoryStore {
  // Direct array access (mirrors current agent tool usage)
  readonly lines: ProductionLine[];
  readonly suppliers: Supplier[];
  readonly inspections: QualityInspection[];
  readonly inventory: InventoryItem[];
  readonly boms: BOMEntry[];

  // Line queries
  getLineById(id: string): ProductionLine | undefined;
  updateLineStatus(lineId: string, status: ProductionLine["status"]): ProductionLine | undefined;

  // Supplier queries
  getSupplierById(id: string): Supplier | undefined;
  getSuppliersByCountry(country: string): Supplier[];
  getDelayedSuppliers(): Supplier[];
  getSuppliersForComponent(partNumber: string): Supplier[];

  // Inspection queries
  getInspectionsByLine(lineId: string): QualityInspection[];
  getInspectionsByBatch(batchId: string): QualityInspection[];

  // Inventory queries
  getInventoryByPart(partNumber: string): InventoryItem | undefined;
  getItemsBelowReorder(): InventoryItem[];
  updateInventoryQuantity(partNumber: string, delta: number): InventoryItem | undefined;

  // BOM queries
  getBOM(productId: string): BOMEntry | undefined;
}

// ── Factory function ──────────────────────────────────────────────────────────

let _store: IFactoryStore | null = null;

export function getFactoryStore(): IFactoryStore {
  if (_store) return _store;

  if (process.env.DATA_SOURCE === "db") {
    // Dynamic import keeps better-sqlite3 out of the module graph when DATA_SOURCE=sim
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DatabaseFactoryStore } = require("./store-db") as typeof import("./store-db");
    _store = DatabaseFactoryStore.getInstance();
  } else {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { SimulatedFactoryStore } = require("./store-sim") as typeof import("./store-sim");
    _store = SimulatedFactoryStore.getInstance();
  }

  return _store!;
}

// Backward-compat export used by existing API routes and agent
export const factoryStore = new Proxy({} as IFactoryStore, {
  get(_target, prop) {
    return (getFactoryStore() as unknown as Record<string | symbol, unknown>)[prop];
  },
  set(_target, prop, value) {
    (getFactoryStore() as unknown as Record<string | symbol, unknown>)[prop] = value;
    return true;
  },
});
