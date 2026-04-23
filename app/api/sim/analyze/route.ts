import { simEngine } from "@/lib/simulation/engine";
import { getEventDef } from "@/lib/simulation/events";
import { analyzeEvent } from "@/lib/agents/sim-agent";
import type { AgentEvent } from "@/lib/agents/sim-agent";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");

  if (!eventId) {
    return new Response("Missing eventId", { status: 400 });
  }

  const def = getEventDef(eventId);
  if (!def) {
    return new Response(`Unknown event: ${eventId}`, { status: 404 });
  }

  const state = simEngine.getState();
  const agentContext = def.buildAgentContext(state);

  const encoder = new TextEncoder();

  function encodeEvent(event: AgentEvent): Uint8Array {
    return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const recs = await analyzeEvent(agentContext, (event) => {
          controller.enqueue(encodeEvent(event));
        });
        // Store recommendations on the engine for the apply endpoint
        simEngine.setRecommendations(recs);
      } catch (err) {
        controller.enqueue(
          encodeEvent({ type: "error", message: err instanceof Error ? err.message : "Unknown error" })
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
