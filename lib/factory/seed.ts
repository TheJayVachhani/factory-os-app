import type {
  ProductionLine,
  Supplier,
  QualityInspection,
  InventoryItem,
  BOMEntry,
} from "./types";

export function seedProductionLines(): ProductionLine[] {
  return [
    { id: "LINE-1", name: "Line 1 — Fuselage Assembly", status: "running", currentProduct: "PROD-A1", scheduledUnits: 12, completedUnits: 7, throughputPerHour: 1.2, shiftEnd: new Date(Date.now() + 6 * 3600000).toISOString(), operatorCount: 8 },
    { id: "LINE-2", name: "Line 2 — Avionics Integration", status: "running", currentProduct: "PROD-A1", scheduledUnits: 12, completedUnits: 9, throughputPerHour: 1.5, shiftEnd: new Date(Date.now() + 6 * 3600000).toISOString(), operatorCount: 6 },
    { id: "LINE-3", name: "Line 3 — Wing Assembly", status: "running", currentProduct: "PROD-B2", scheduledUnits: 8, completedUnits: 3, throughputPerHour: 0.6, shiftEnd: new Date(Date.now() + 6 * 3600000).toISOString(), operatorCount: 10 },
    { id: "LINE-4", name: "Line 4 — Final Assembly", status: "idle", currentProduct: "PROD-A1", scheduledUnits: 6, completedUnits: 0, throughputPerHour: 0, shiftEnd: new Date(Date.now() + 6 * 3600000).toISOString(), operatorCount: 4 },
    { id: "LINE-5", name: "Line 5 — Flight Test Prep", status: "maintenance", currentProduct: "PROD-C3", scheduledUnits: 4, completedUnits: 2, throughputPerHour: 0, shiftEnd: new Date(Date.now() + 6 * 3600000).toISOString(), operatorCount: 3 },
  ];
}

export function seedSuppliers(): Supplier[] {
  return [
    { id: "SUP-001", name: "Tanaka Industries", country: "Japan", components: ["PART-TI-SHEET", "PART-TI-TUBE"], leadTimeDays: 28, onTimeRate: 0.72, status: "delayed", lastDelivery: "2026-03-10", nextExpectedDelivery: "2026-04-20", delayReason: "Raw material shortage from upstream smelter; 2-week slip on titanium sheet allocation" },
    { id: "SUP-002", name: "AeroComposites GmbH", country: "Germany", components: ["PART-CF-PANEL", "PART-CF-SPAR"], leadTimeDays: 21, onTimeRate: 0.95, status: "active", lastDelivery: "2026-03-22", nextExpectedDelivery: "2026-04-12" },
    { id: "SUP-003", name: "Meridian Avionics", country: "United States", components: ["PART-FCC", "PART-NAV-MOD", "PART-COMM-UNIT"], leadTimeDays: 14, onTimeRate: 0.91, status: "active", lastDelivery: "2026-03-25", nextExpectedDelivery: "2026-04-08" },
    { id: "SUP-004", name: "Bharat Precision Castings", country: "India", components: ["PART-TURB-BLADE", "PART-MOUNT-BRKT"], leadTimeDays: 35, onTimeRate: 0.83, status: "active", lastDelivery: "2026-03-05", nextExpectedDelivery: "2026-04-09" },
    { id: "SUP-005", name: "SkyFast Fasteners", country: "United Kingdom", components: ["PART-HEX-BOLT", "PART-RIVET-AL", "PART-RIVET-TI"], leadTimeDays: 7, onTimeRate: 0.98, status: "active", lastDelivery: "2026-03-28", nextExpectedDelivery: "2026-04-04" },
    { id: "SUP-006", name: "ChinaWing Materials", country: "China", components: ["PART-AL-SHEET", "PART-AL-EXTRUSION"], leadTimeDays: 18, onTimeRate: 0.87, status: "active", lastDelivery: "2026-03-18", nextExpectedDelivery: "2026-04-05" },
    { id: "SUP-007", name: "Dassault Hydraulics", country: "France", components: ["PART-HYD-PUMP", "PART-HYD-LINE"], leadTimeDays: 25, onTimeRate: 0.89, status: "active", lastDelivery: "2026-03-12", nextExpectedDelivery: "2026-04-06" },
    { id: "SUP-008", name: "Toray Advanced Films", country: "Japan", components: ["PART-THERM-WRAP", "PART-SEAL-TAPE"], leadTimeDays: 12, onTimeRate: 0.94, status: "active", lastDelivery: "2026-03-26", nextExpectedDelivery: "2026-04-07" },
    { id: "SUP-009", name: "Alenia Landing Gear", country: "Italy", components: ["PART-LG-STRUT", "PART-LG-WHEEL"], leadTimeDays: 42, onTimeRate: 0.78, status: "at-risk", lastDelivery: "2026-02-20", nextExpectedDelivery: "2026-04-15", delayReason: "Quality hold on last shipment — awaiting re-inspection" },
    { id: "SUP-010", name: "Elbit Wiring Systems", country: "Israel", components: ["PART-WIRE-HARNESS", "PART-CONNECTOR"], leadTimeDays: 16, onTimeRate: 0.92, status: "active", lastDelivery: "2026-03-20", nextExpectedDelivery: "2026-04-05" },
    { id: "SUP-011", name: "Samsung Aero Displays", country: "South Korea", components: ["PART-MFD", "PART-HUD-UNIT"], leadTimeDays: 20, onTimeRate: 0.96, status: "active", lastDelivery: "2026-03-15", nextExpectedDelivery: "2026-04-04" },
    { id: "SUP-012", name: "Embraer Seating Co", country: "Brazil", components: ["PART-SEAT-FRAME", "PART-SEAT-FABRIC"], leadTimeDays: 30, onTimeRate: 0.85, status: "active", lastDelivery: "2026-03-01", nextExpectedDelivery: "2026-04-01" },
  ];
}

export function seedInspections(): QualityInspection[] {
  return [
    { id: "QC-001", lineId: "LINE-1", batchId: "BATCH-101", timestamp: "2026-03-28T09:15:00Z", inspectorId: "INS-A", defectsFound: 2, defectTypes: [{ type: "surface_scratch", severity: "minor", count: 1 }, { type: "dimensional_oor", severity: "major", count: 1 }], passRate: 0.94, disposition: "pass" },
    { id: "QC-002", lineId: "LINE-3", batchId: "BATCH-302", timestamp: "2026-03-28T11:30:00Z", inspectorId: "INS-B", defectsFound: 5, defectTypes: [{ type: "material_flaw", severity: "critical", count: 2 }, { type: "surface_scratch", severity: "minor", count: 3 }], passRate: 0.71, disposition: "hold" },
    { id: "QC-003", lineId: "LINE-2", batchId: "BATCH-201", timestamp: "2026-03-27T14:00:00Z", inspectorId: "INS-A", defectsFound: 0, defectTypes: [], passRate: 1.0, disposition: "pass" },
    { id: "QC-004", lineId: "LINE-3", batchId: "BATCH-301", timestamp: "2026-03-27T08:45:00Z", inspectorId: "INS-C", defectsFound: 3, defectTypes: [{ type: "material_flaw", severity: "major", count: 2 }, { type: "weld_porosity", severity: "critical", count: 1 }], passRate: 0.78, disposition: "rework" },
    { id: "QC-005", lineId: "LINE-1", batchId: "BATCH-102", timestamp: "2026-03-29T10:00:00Z", inspectorId: "INS-B", defectsFound: 1, defectTypes: [{ type: "fastener_torque", severity: "minor", count: 1 }], passRate: 0.97, disposition: "pass" },
    { id: "QC-006", lineId: "LINE-4", batchId: "BATCH-401", timestamp: "2026-03-26T16:20:00Z", inspectorId: "INS-A", defectsFound: 4, defectTypes: [{ type: "alignment_error", severity: "major", count: 2 }, { type: "surface_scratch", severity: "minor", count: 2 }], passRate: 0.82, disposition: "rework" },
    { id: "QC-007", lineId: "LINE-5", batchId: "BATCH-501", timestamp: "2026-03-25T13:00:00Z", inspectorId: "INS-C", defectsFound: 0, defectTypes: [], passRate: 1.0, disposition: "pass" },
    { id: "QC-008", lineId: "LINE-3", batchId: "BATCH-303", timestamp: "2026-03-29T15:30:00Z", inspectorId: "INS-B", defectsFound: 6, defectTypes: [{ type: "material_flaw", severity: "critical", count: 3 }, { type: "dimensional_oor", severity: "major", count: 2 }, { type: "surface_scratch", severity: "minor", count: 1 }], passRate: 0.65, disposition: "scrap" },
  ];
}

export function seedInventory(): InventoryItem[] {
  return [
    { id: "INV-001", partNumber: "PART-TI-SHEET", description: "Titanium sheet 6Al-4V, 1.2mm", quantityOnHand: 18, reorderPoint: 40, reorderQuantity: 100, unitCost: 1250, supplierId: "SUP-001", location: "WH-A-01", lastRestocked: "2026-03-10" },
    { id: "INV-002", partNumber: "PART-TI-TUBE", description: "Titanium tubing 6Al-4V, 25mm OD", quantityOnHand: 85, reorderPoint: 30, reorderQuantity: 60, unitCost: 420, supplierId: "SUP-001", location: "WH-A-02", lastRestocked: "2026-03-10" },
    { id: "INV-003", partNumber: "PART-CF-PANEL", description: "Carbon fiber panel, 2m x 1m", quantityOnHand: 120, reorderPoint: 50, reorderQuantity: 80, unitCost: 890, supplierId: "SUP-002", location: "WH-B-01", lastRestocked: "2026-03-22" },
    { id: "INV-004", partNumber: "PART-CF-SPAR", description: "Carbon fiber spar, 3m", quantityOnHand: 65, reorderPoint: 25, reorderQuantity: 40, unitCost: 1650, supplierId: "SUP-002", location: "WH-B-02", lastRestocked: "2026-03-22" },
    { id: "INV-005", partNumber: "PART-FCC", description: "Flight control computer", quantityOnHand: 14, reorderPoint: 10, reorderQuantity: 20, unitCost: 28500, supplierId: "SUP-003", location: "WH-C-01", lastRestocked: "2026-03-25" },
    { id: "INV-006", partNumber: "PART-NAV-MOD", description: "Navigation module GPS/INS", quantityOnHand: 22, reorderPoint: 12, reorderQuantity: 24, unitCost: 14200, supplierId: "SUP-003", location: "WH-C-02", lastRestocked: "2026-03-25" },
    { id: "INV-007", partNumber: "PART-TURB-BLADE", description: "Turbine blade, single crystal", quantityOnHand: 200, reorderPoint: 100, reorderQuantity: 300, unitCost: 3200, supplierId: "SUP-004", location: "WH-D-01", lastRestocked: "2026-03-05" },
    { id: "INV-008", partNumber: "PART-HEX-BOLT", description: "Hex bolt AN3-5A, aerospace grade", quantityOnHand: 5000, reorderPoint: 2000, reorderQuantity: 8000, unitCost: 1.8, supplierId: "SUP-005", location: "WH-E-01", lastRestocked: "2026-03-28" },
    { id: "INV-009", partNumber: "PART-RIVET-AL", description: "Aluminum rivet AN470AD4", quantityOnHand: 12000, reorderPoint: 5000, reorderQuantity: 15000, unitCost: 0.35, supplierId: "SUP-005", location: "WH-E-02", lastRestocked: "2026-03-28" },
    { id: "INV-010", partNumber: "PART-AL-SHEET", description: "Aluminum alloy 2024-T3 sheet, 1.6mm", quantityOnHand: 95, reorderPoint: 40, reorderQuantity: 80, unitCost: 380, supplierId: "SUP-006", location: "WH-A-03", lastRestocked: "2026-03-18" },
    { id: "INV-011", partNumber: "PART-HYD-PUMP", description: "Hydraulic pump, 3000 PSI", quantityOnHand: 8, reorderPoint: 6, reorderQuantity: 12, unitCost: 9800, supplierId: "SUP-007", location: "WH-F-01", lastRestocked: "2026-03-12" },
    { id: "INV-012", partNumber: "PART-WIRE-HARNESS", description: "Main wiring harness assembly", quantityOnHand: 11, reorderPoint: 8, reorderQuantity: 16, unitCost: 6500, supplierId: "SUP-010", location: "WH-C-03", lastRestocked: "2026-03-20" },
    { id: "INV-013", partNumber: "PART-LG-STRUT", description: "Main landing gear strut", quantityOnHand: 4, reorderPoint: 6, reorderQuantity: 10, unitCost: 45000, supplierId: "SUP-009", location: "WH-G-01", lastRestocked: "2026-02-20" },
    { id: "INV-014", partNumber: "PART-MFD", description: "Multi-function display 8x10", quantityOnHand: 18, reorderPoint: 10, reorderQuantity: 20, unitCost: 12400, supplierId: "SUP-011", location: "WH-C-04", lastRestocked: "2026-03-15" },
    { id: "INV-015", partNumber: "PART-SEAT-FRAME", description: "Pilot seat frame, crashworthy", quantityOnHand: 12, reorderPoint: 8, reorderQuantity: 16, unitCost: 4200, supplierId: "SUP-012", location: "WH-H-01", lastRestocked: "2026-03-01" },
    { id: "INV-016", partNumber: "PART-MOUNT-BRKT", description: "Engine mount bracket, forged", quantityOnHand: 30, reorderPoint: 15, reorderQuantity: 30, unitCost: 2100, supplierId: "SUP-004", location: "WH-D-02", lastRestocked: "2026-03-05" },
    { id: "INV-017", partNumber: "PART-RIVET-TI", description: "Titanium rivet, flush head", quantityOnHand: 3500, reorderPoint: 2000, reorderQuantity: 6000, unitCost: 1.2, supplierId: "SUP-005", location: "WH-E-03", lastRestocked: "2026-03-28" },
    { id: "INV-018", partNumber: "PART-THERM-WRAP", description: "Thermal protection wrap, 0.5mm", quantityOnHand: 45, reorderPoint: 20, reorderQuantity: 40, unitCost: 560, supplierId: "SUP-008", location: "WH-A-04", lastRestocked: "2026-03-26" },
    { id: "INV-019", partNumber: "PART-AL-EXTRUSION", description: "Aluminum extrusion 6061-T6, L-channel 3m", quantityOnHand: 50, reorderPoint: 20, reorderQuantity: 40, unitCost: 290, supplierId: "SUP-006", location: "WH-A-05", lastRestocked: "2026-03-18" },
    { id: "INV-020", partNumber: "PART-LG-WHEEL", description: "Landing gear wheel assembly, 8in", quantityOnHand: 7, reorderPoint: 6, reorderQuantity: 12, unitCost: 8900, supplierId: "SUP-009", location: "WH-G-02", lastRestocked: "2026-02-20" },
  ];
}

export function seedBOMs(): BOMEntry[] {
  return [
    {
      productId: "PROD-A1",
      productName: "Atlas A1 — Light Utility Airframe",
      components: [
        { partNumber: "PART-AL-SHEET", quantity: 14 },
        { partNumber: "PART-CF-PANEL", quantity: 6 },
        { partNumber: "PART-FCC", quantity: 1 },
        { partNumber: "PART-NAV-MOD", quantity: 1 },
        { partNumber: "PART-HYD-PUMP", quantity: 2 },
        { partNumber: "PART-WIRE-HARNESS", quantity: 1 },
        { partNumber: "PART-LG-STRUT", quantity: 2 },
        { partNumber: "PART-MFD", quantity: 2 },
        { partNumber: "PART-SEAT-FRAME", quantity: 2 },
        { partNumber: "PART-HEX-BOLT", quantity: 340 },
        { partNumber: "PART-RIVET-AL", quantity: 1200 },
      ],
    },
    {
      productId: "PROD-B2",
      productName: "Boreas B2 — High-Altitude ISR Platform",
      components: [
        { partNumber: "PART-TI-SHEET", quantity: 10 },
        { partNumber: "PART-TI-TUBE", quantity: 8 },
        { partNumber: "PART-CF-PANEL", quantity: 12 },
        { partNumber: "PART-CF-SPAR", quantity: 4 },
        { partNumber: "PART-FCC", quantity: 2 },
        { partNumber: "PART-NAV-MOD", quantity: 2 },
        { partNumber: "PART-TURB-BLADE", quantity: 24 },
        { partNumber: "PART-HYD-PUMP", quantity: 2 },
        { partNumber: "PART-WIRE-HARNESS", quantity: 2 },
        { partNumber: "PART-MFD", quantity: 3 },
        { partNumber: "PART-HEX-BOLT", quantity: 520 },
        { partNumber: "PART-RIVET-TI", quantity: 2000 },
        { partNumber: "PART-THERM-WRAP", quantity: 8 },
      ],
    },
    {
      productId: "PROD-C3",
      productName: "Cirrus C3 — Cargo Delivery UAV",
      components: [
        { partNumber: "PART-AL-SHEET", quantity: 8 },
        { partNumber: "PART-AL-EXTRUSION", quantity: 6 },
        { partNumber: "PART-CF-PANEL", quantity: 4 },
        { partNumber: "PART-FCC", quantity: 1 },
        { partNumber: "PART-NAV-MOD", quantity: 1 },
        { partNumber: "PART-MOUNT-BRKT", quantity: 4 },
        { partNumber: "PART-WIRE-HARNESS", quantity: 1 },
        { partNumber: "PART-LG-WHEEL", quantity: 3 },
        { partNumber: "PART-HEX-BOLT", quantity: 200 },
        { partNumber: "PART-RIVET-AL", quantity: 800 },
      ],
    },
  ];
}
