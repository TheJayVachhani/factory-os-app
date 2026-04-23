export type LineStatus = "running" | "idle" | "maintenance" | "down";
export type SupplierStatus = "active" | "delayed" | "at-risk" | "inactive";
export type DefectSeverity = "critical" | "major" | "minor";
export type Disposition = "pass" | "rework" | "scrap" | "hold";

export interface ProductionLine {
  id: string;
  name: string;
  status: LineStatus;
  currentProduct: string;
  scheduledUnits: number;
  completedUnits: number;
  throughputPerHour: number;
  shiftEnd: string;
  operatorCount: number;
}

export interface Supplier {
  id: string;
  name: string;
  country: string;
  components: string[];
  leadTimeDays: number;
  onTimeRate: number;
  status: SupplierStatus;
  lastDelivery: string;
  nextExpectedDelivery: string;
  delayReason?: string;
}

export interface DefectEntry {
  type: string;
  severity: DefectSeverity;
  count: number;
}

export interface QualityInspection {
  id: string;
  lineId: string;
  batchId: string;
  timestamp: string;
  inspectorId: string;
  defectsFound: number;
  defectTypes: DefectEntry[];
  passRate: number;
  disposition: Disposition;
}

export interface InventoryItem {
  id: string;
  partNumber: string;
  description: string;
  quantityOnHand: number;
  reorderPoint: number;
  reorderQuantity: number;
  unitCost: number;
  supplierId: string;
  location: string;
  lastRestocked: string;
}

export interface BOMComponent {
  partNumber: string;
  quantity: number;
}

export interface BOMEntry {
  productId: string;
  productName: string;
  components: BOMComponent[];
}
