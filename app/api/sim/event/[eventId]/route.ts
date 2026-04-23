import { NextResponse } from "next/server";
import { simEngine } from "@/lib/simulation/engine";
import { getEventDef } from "@/lib/simulation/events";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const def = getEventDef(eventId);
  if (!def) {
    return NextResponse.json({ error: `Unknown event: ${eventId}` }, { status: 404 });
  }

  // Record event in simulation state
  simEngine.triggerEvent(def.id, def.label, def.description);
  // Apply the state effect (adds delays, blocks, flags)
  const state = simEngine.applyEventEffect((batches) => def.applyEffect(batches, simEngine.getState()));

  return NextResponse.json(state);
}
