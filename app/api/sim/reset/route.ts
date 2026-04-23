import { NextResponse } from "next/server";
import { simEngine } from "@/lib/simulation/engine";

export async function POST() {
  const state = simEngine.reset();
  return NextResponse.json(state);
}
