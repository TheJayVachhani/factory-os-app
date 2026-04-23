# Factory OS — Extension Roadmap

Current state: simulation with proactive monitoring, AI agent (tools + web search), optional SQLite persistence, auto-run mode.

---

## Near-term

### 1. Auto-trigger analysis on critical anomalies

**What:** During auto-run, if the monitor scan finds a new *critical* anomaly that wasn't present in the previous tick, automatically pause auto-run and launch agent analysis — no manual click required.

**Where:**
- `app/simulation/page.tsx` — in the auto-run `tick()`, compare previous anomaly IDs to new ones, auto-call `handleAnalyzeAnomaly(critical)` if a new critical appears
- Add an "Auto-analyze critical" toggle to `ControlPanel.tsx` so users can opt in/out

**Sketch:**
```typescript
// In tick(), after fetchAnomalies():
const prevIds = new Set(prevAnomaliesRef.current.map(a => a.id));
const newCritical = newAnomalies.find(a => a.severity === "critical" && !prevIds.has(a.id));
if (newCritical && autoAnalyzeCriticalRef.current) {
  setIsAutoRunning(false);
  handleAnalyzeAnomaly(newCritical);
}
prevAnomaliesRef.current = newAnomalies;
```

---

### 2. Auto-run speed control

**What:** Let users choose the tick interval — 0.5s (fast-forward), 2s (default), 5s (slow review).

**Where:**
- `ControlPanel.tsx` — add a small segmented control or slider under the ▶ Run button
- `page.tsx` — pass `tickMs` state into the auto-run `useEffect` dependency

---

### 3. Anomaly "first seen" badges

**What:** Show how many days an anomaly has persisted. Helps distinguish a long-running issue from a newly emerged one.

**Where:**
- `lib/simulation/monitor.ts` — `Anomaly.detectedAt` is already set; the page needs to track a `firstSeen: Map<anomalyId, dayNumber>` ref
- `MonitorStrip.tsx` — render `Day {firstSeenDay}` beside each pill

---

## Medium-term

### 4. Agent conversation mode

**What:** After analysis completes, let the user type a follow-up question in natural language (e.g. "What if we can't find an alternative titanium supplier?"). The agent replies using the same factory tools without re-running the full event loop.

**Architecture:**
- Add a chat input below the agent response in `AgentPanel.tsx`
- New API route: `POST /api/sim/chat` — accepts `{ messages: Message[], question: string }`, runs one agent turn with tools, returns SSE
- The page maintains a `conversationHistory: Message[]` state, appended to on each question
- Conversation resets when a new event or anomaly is triggered

---

### 5. Recommendation outcome tracking

**What:** Record whether accepted recommendations actually improved the metric they targeted. After N days, check if the batch delay reduced, supplier status changed, inventory restocked, etc.

**Architecture:**
- `lib/db/schema.ts` — add `outcome_checks` table: `{ recId, checkDay, metric, before, after, improved }`
- `lib/simulation/engine.ts` — on `advance()`, for each applied recommendation with `checkDay <= currentDay`, run the outcome check and persist
- Surface in the AgentPanel as "Outcomes" tab: list recommendations + their measured impact

---

### 6. Analytics panel

**What:** A second view (or slide-over) showing historical data from the DB — event timeline, recommendation accept/ignore rates, batch cycle times by stage, supplier health trends.

**Architecture:**
- New page: `app/analytics/page.tsx`
- New API routes under `/api/analytics/`:
  - `GET /events` — event log with timestamps
  - `GET /recommendations` — all recs with status + outcomes
  - `GET /cycle-times` — average days per stage per product
  - `GET /supplier-health` — on-time rate trend over simulation days
- Charts: use `recharts` (already common in Next.js stacks) or plain SVG sparklines to keep bundle lean

---

## Longer-term

### 7. Real ERP/MES integration

**What:** Plug a real data source into the existing `IFactoryStore` interface — the agent tools, monitor rules, and recommendation effects all work unchanged.

**How:**
1. Implement `ERPFactoryStore` in `lib/factory/store-erp.ts` against your ERP's REST/GraphQL API
2. Add `DATA_SOURCE=erp` case to `getFactoryStore()` in `store.ts`
3. Map `applyRecommendation()` effects to real mutations (create PO in ERP, update work order status in MES)

**Integration candidates:**
- **SAP** — use the OData v4 API or the SAP Business Technology Platform SDK
- **Oracle Fusion** — REST APIs for Supply Chain Management
- **Custom MES** — wrap your existing API in the `IFactoryStore` interface; only the data shape changes

---

### 8. Webhook event ingestion

**What:** Instead of manually triggering surprise events, receive them from external systems via webhooks — supplier delay notifications, MES alerts, IoT threshold breaches.

**Architecture:**
- `POST /api/webhooks/event` — authenticated endpoint accepting a standardized payload
- Maps incoming payload to a `SurpriseEventDef`-compatible structure, calls `simEngine.triggerEvent()` + `applyEventEffect()`
- Optionally auto-triggers agent analysis (same as approach #1 above)

**Payload shape:**
```typescript
interface WebhookPayload {
  source: "supplier-portal" | "mes" | "iot" | "erp";
  type: "delay" | "quality-failure" | "line-down" | "inventory-alert";
  entityId: string;
  severity: "warning" | "critical";
  detail: Record<string, unknown>;
}
```

---

### 9. Agent memory (cross-session learning)

**What:** The agent currently starts fresh every analysis. Persistent memory lets it reference prior decisions — "Last time SUP-001 delayed titanium, switching to SUP-007 cut the delay by 6 days."

**Architecture:**
- `lib/db/schema.ts` — add `agent_memory` table: `{ id, type, content, createdAt, expiresAt }`
- Memory types: `supplier_outcome` (what happened when we switched), `inventory_pattern` (this part runs low every 20 days), `line_reliability` (LINE-3 breaks down 3x per cycle)
- `lib/agents/sim-agent.ts` — at analysis start, query relevant memory entries and prepend to `SYSTEM_PROMPT`
- After analysis, extract learnings from agent response and persist as new memory entries

---

### 10. Multi-user / shared operations

**What:** Multiple operators working the same simulation (or real factory) — shared state, activity log, role-based actions.

**Architecture:**
- Replace module-singleton `simEngine` with DB-backed state (already possible with `DATA_SOURCE=db`)
- Add auth (NextAuth.js or Clerk) with roles: `operator` (view + accept recs), `supervisor` (trigger events + reset), `analyst` (read-only + agent)
- Activity log: record who triggered what event, who accepted which recommendation
- Real-time sync: use a shared DB + polling, or add a WebSocket layer (e.g. Pusher or Ably) to broadcast state changes to all connected clients

---

## Quick wins to pick up first

If returning to this after a break, the recommended sequence:

1. **Auto-trigger on critical** (#1) — single `useEffect` change, immediate UX payoff
2. **Conversation mode** (#4) — high value, bounded scope, reuses all existing agent infrastructure
3. **Analytics panel** (#6) — the DB schema is already capturing everything needed; just build the queries and charts
4. **Outcome tracking** (#5) — closes the feedback loop and makes the agent's impact measurable
