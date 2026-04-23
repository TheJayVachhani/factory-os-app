import { NextResponse } from "next/server";
import { simEngine } from "@/lib/simulation/engine";
import { getFactoryStore } from "@/lib/factory/store";
import { scanForAnomalies } from "@/lib/simulation/monitor";

export const dynamic = "force-dynamic";

export function GET() {
  const state = simEngine.getState();
  const store = getFactoryStore();
  const anomalies = scanForAnomalies(state, store);
  return NextResponse.json({ anomalies });
}
