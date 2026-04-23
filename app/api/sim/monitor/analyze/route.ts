import { simEngine } from "@/lib/simulation/engine";
import { getFactoryStore } from "@/lib/factory/store";
import { scanForAnomalies, buildAnomalyContext } from "@/lib/simulation/monitor";
import { analyzeEvent } from "@/lib/agents/sim-agent";
import type { AgentEvent } from "@/lib/agents/sim-agent";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const anomalyId = searchParams.get("anomalyId") ?? "";

  const state = simEngine.getState();
  const store = getFactoryStore();
  const anomalies = scanForAnomalies(state, store);
  const anomaly = anomalies.find((a) => a.id === anomalyId);

  if (!anomaly) {
    return new Response(`Unknown anomaly: ${anomalyId}`, { status: 404 });
  }

  const context = buildAnomalyContext(anomaly, state, store);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: AgentEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      try {
        const recs = await analyzeEvent(context, emit);
        simEngine.setRecommendations(recs);
      } catch (err) {
        emit({ type: "error", message: err instanceof Error ? err.message : "Unknown error" });
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
