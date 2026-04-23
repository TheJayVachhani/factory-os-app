import { NextResponse } from "next/server";
import { simEngine } from "@/lib/simulation/engine";
import type { Recommendation } from "@/lib/simulation/engine";

export async function POST(request: Request) {
  const { rec } = await request.json() as { rec: Recommendation };
  const state = simEngine.applyRecommendation(rec);
  return NextResponse.json(state);
}
