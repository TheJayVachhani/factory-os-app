import { NextResponse } from "next/server";
import { simEngine } from "@/lib/simulation/engine";

export async function GET() {
  return NextResponse.json(simEngine.getState());
}
