import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "path";
import * as schema from "./schema";

const DB_PATH = path.join(process.cwd(), "factory-os.db");

// Module-scope singleton — one connection per process
const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export type DB = typeof db;

// Create all tables if they don't exist — runs synchronously at module load
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS production_lines (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL,
    current_product TEXT NOT NULL,
    scheduled_units INTEGER NOT NULL,
    completed_units INTEGER NOT NULL,
    throughput_per_hour REAL NOT NULL,
    shift_end TEXT NOT NULL,
    operator_count INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    country TEXT NOT NULL,
    lead_time_days INTEGER NOT NULL,
    on_time_rate REAL NOT NULL,
    status TEXT NOT NULL,
    last_delivery TEXT NOT NULL,
    next_expected_delivery TEXT NOT NULL,
    delay_reason TEXT
  );

  CREATE TABLE IF NOT EXISTS supplier_components (
    supplier_id TEXT NOT NULL,
    part_number TEXT NOT NULL,
    PRIMARY KEY (supplier_id, part_number)
  );

  CREATE TABLE IF NOT EXISTS quality_inspections (
    id TEXT PRIMARY KEY,
    line_id TEXT NOT NULL,
    batch_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    inspector_id TEXT NOT NULL,
    defects_found INTEGER NOT NULL,
    pass_rate REAL NOT NULL,
    disposition TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS defect_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inspection_id TEXT NOT NULL,
    type TEXT NOT NULL,
    severity TEXT NOT NULL,
    count INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS inventory_items (
    id TEXT PRIMARY KEY,
    part_number TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    quantity_on_hand INTEGER NOT NULL,
    reorder_point INTEGER NOT NULL,
    reorder_quantity INTEGER NOT NULL,
    unit_cost REAL NOT NULL,
    supplier_id TEXT NOT NULL,
    location TEXT NOT NULL,
    last_restocked TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bom_entries (
    product_id TEXT PRIMARY KEY,
    product_name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bom_components (
    product_id TEXT NOT NULL,
    part_number TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    PRIMARY KEY (product_id, part_number)
  );

  CREATE TABLE IF NOT EXISTS sim_state (
    id INTEGER PRIMARY KEY,
    current_day INTEGER NOT NULL,
    last_event_id TEXT
  );

  CREATE TABLE IF NOT EXISTS sim_batches (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    product_label TEXT NOT NULL,
    line_id TEXT NOT NULL,
    supplier_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    stage TEXT NOT NULL,
    days_in_stage INTEGER NOT NULL,
    base_days INTEGER NOT NULL,
    delay_days INTEGER NOT NULL,
    flags TEXT NOT NULL DEFAULT '[]',
    start_day INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sim_events (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    description TEXT NOT NULL,
    day INTEGER NOT NULL,
    triggered_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sim_recommendations (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    label TEXT NOT NULL,
    reasoning TEXT NOT NULL,
    effect_type TEXT NOT NULL,
    effect_params TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    applied_at INTEGER
  );
`);
