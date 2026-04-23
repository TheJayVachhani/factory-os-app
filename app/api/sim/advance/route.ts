import { NextResponse } from "next/server";
import { simEngine } from "@/lib/simulation/engine";

export async function POST(request: Request) {
  const { days } = await request.json() as { days: number };
  const state = simEngine.advance(days);
  return NextResponse.json(state);
}
