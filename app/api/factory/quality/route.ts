import { NextResponse } from "next/server";
import { factoryStore } from "@/lib/factory/store";

export async function GET() {
  return NextResponse.json(factoryStore.inspections);
}
