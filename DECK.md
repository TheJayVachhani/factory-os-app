# Factory OS — Project Deck

---

## Slide 1 — The Problem

### Manufacturing operations run on slow, reactive decisions

Aerospace production involves **compounding dependencies**: a single supplier delay ripples into procurement holds, line starvation, quality re-work, and missed delivery windows — often before any operator notices.

**The gap today:**
- Dashboards show *what happened* — not what it means or what to do
- Impact assessment is manual: cross-reference suppliers → inventory → BOM → line capacity
- Decision latency is measured in hours; in aerospace, that means days of schedule slip
- No system connects the dots across domains (supply chain + production + quality + inventory) simultaneously

**The question:**
> Can an AI agent replace the manual triage process — scanning live operational data, assessing blast radius, and delivering specific, executable recommendations — faster than a human analyst?

---

## Slide 2 — Why Agentic?

### This problem cannot be solved with a single query

A disruption response requires **sequential, branching reasoning across multiple data domains**:

```
Supplier delayed
  → Which batches are in procurement from this supplier?
  → Which products do those batches feed?
  → Do we have enough inventory to bridge the gap?
  → Are there alternative suppliers with compatible lead times?
  → If not, are they findable on the open market?
  → What is the priority order for recommendations?
```

No retrieval pipeline, no RAG system, no static tool can do this. It requires:

| Capability | Why needed |
|---|---|
| **Multi-turn tool use** | Each answer changes what to query next |
| **Cross-domain reasoning** | Supplier data → inventory → BOM → line status in one reasoning chain |
| **Live web search** | Alternative supplier sourcing requires real-world knowledge |
| **Structured output** | Recommendations must be machine-executable, not prose |
| **Proactive triggering** | The agent should notice problems, not wait to be asked |

The agentic loop is not a convenience — it is the only architecture that fits the problem.

---

## Slide 3 — System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  CLIENT  (React 19, Next.js 16 App Router)                       │
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────┐  ┌─────────┐  │
│  │ KanbanBoard │  │ ControlPanel │  │AgentPanel │  │Monitor  │  │
│  │ (6 stages)  │  │ (advance/    │  │(SSE feed  │  │Strip    │  │
│  │             │  │  auto-run/   │  │ + recs)   │  │(alerts) │  │
│  │             │  │  events)     │  │           │  │         │  │
│  └─────────────┘  └──────────────┘  └───────────┘  └─────────┘  │
└──────────────────────────────────────────────────────────────────┘
         ↑ SSE streams          ↑ REST polling (5s)
┌──────────────────────────────────────────────────────────────────┐
│  API ROUTES  (Next.js Route Handlers)                            │
│                                                                  │
│  /sim/state  /sim/advance  /sim/event/:id  /sim/apply            │
│  /sim/analyze (SSE)        /sim/monitor    /sim/monitor/analyze  │
└──────────────────────────────────────────────────────────────────┘
         ↓                          ↓
┌─────────────────────┐   ┌─────────────────────────────────────┐
│  SimulationEngine   │   │  AI Agent (lib/agents/sim-agent.ts) │
│                     │   │                                     │
│  90-day batch FSM   │   │  claude-sonnet-4-6                  │
│  6 pipeline stages  │   │  17 factory tools                   │
│  5 event types      │   │  web_search (server-side)           │
│  6 rec effect types │   │  SSE emit stream                    │
│  DB sync (optional) │   │  Up to 20 agentic turns             │
└─────────────────────┘   └─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────────┐
│  IFactoryStore  (strategy pattern)                              │
│                                                                 │
│  DATA_SOURCE=sim  →  SimulatedFactoryStore  (in-memory)        │
│  DATA_SOURCE=db   →  DatabaseFactoryStore   (SQLite/Drizzle)   │
└─────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────────┐
│  Monitor  (lib/simulation/monitor.ts)                           │
│  Rule-based scan → 5 anomaly types → stable dedup IDs          │
└─────────────────────────────────────────────────────────────────┘
```

**Key design choices:**
- Module-scope singletons for engine and store — one shared state across all API routes
- SSE (ReadableStream) for agent output — no WebSocket complexity, works with any HTTP client
- `dynamic require()` to keep `better-sqlite3` out of the module graph in sim mode

---

## Slide 4 — What We Built

### A full-stack agentic operations platform, built incrementally in three phases

---

**Phase 1 — Simulation core**

- `SimulationEngine`: 90-day production pipeline, finite state machine for batch progression
- 6 stages: Queue → Procurement → Manufacturing → QC → Shipping → Delivered
- Stage base durations: procurement 12d, manufacturing 20d, QC 5d, shipping 7d
- 5 surprise events with pre-defined batch effects (delays, blocks, urgent inserts)
- Seeded factory data: 5 lines, 12 suppliers, 20 inventory items, 3 products with full BOMs
- Deliberately broken data: SUP-001 delayed (titanium), SUP-009 at-risk (landing gear)

---

**Phase 2 — AI agent + data layer**

- 17-tool agent covering all factory domains (lines, suppliers, inventory, quality, BOM)
- `submit_recommendation` as a structured tool — effect_type + effect_params, not prose
- 6 typed recommendation effects: `switch_supplier`, `expedite_order`, `quarantine_batch`, `take_line_offline`, `bring_line_online`, `add_safety_stock`
- Anthropic's `web_search_20250305` server-side tool — live supplier sourcing with zero client complexity
- `IFactoryStore` interface with two swappable implementations (sim / SQLite via Drizzle ORM)
- Complete DB schema: factory tables + sim state tables, idempotent seeder

---

**Phase 3 — Proactive monitoring + auto-run**

- `scanForAnomalies()`: rule-based scanner, 5 anomaly categories, stable dedup IDs
- `buildAnomalyContext()`: anomaly-tailored agent context per type
- `GET /api/sim/monitor`: polling endpoint, runs scan on every request
- `GET /api/sim/monitor/analyze`: SSE stream, same agent loop seeded with anomaly context
- `MonitorStrip`: live alert bar, severity-coded pills (red/amber/grey), per-pill Analyze button
- Auto-run toggle: +1 day every 2s, pauses on analysis start, stops at day 90

---

## Slide 5 — Key Results

### What the agent actually does when triggered

**Supplier delay event (SUP-001 Tanaka Industries, +14 days):**

Agent tool call sequence observed:
```
get_delayed_suppliers()          → confirms SUP-001 status, delay reason
get_inventory_levels(below_reorder=true) → PART-TI-SHEET: 45 on hand, reorder at 100
get_bom("PROD-A1")               → titanium sheet used in 3 of 8 components
check_lead_times("PART-TI-SHEET") → SUP-001: 45d, no alternatives in system
web_search("aerospace titanium sheet supplier Japan alternative")
                                 → finds VSMPO-AVISMA, Toho Titanium, ATI
get_supplier_risk_report()       → flags 2 single-source components
check_bom_availability(...)      → can build 8 of 24 scheduled units
submit_recommendation × 4
```

Recommendations produced:
1. Switch BATCH-SIM-03 to alternative titanium supplier (−8 days)
2. Add safety stock 200 units PART-TI-SHEET ($34,000)
3. Expedite BATCH-SIM-07 (reduce base days by 5)
4. Initiate dual-sourcing qualification for PART-TI-SHEET

**Proactive monitor findings on fresh state (Day 1, no events triggered):**

The scanner surfaces on load — from seeded data alone:
- 2 × `inventory_low` warnings (titanium sheet, landing gear struts — intentionally seeded below reorder)
- 2 × `supplier_risk` warnings (SUP-001 delayed, SUP-009 at-risk)
- 1 × `quality_alert` warning (existing inspection record with 87% pass rate)

The system is already surfacing real problems before the user touches anything.

---

## Slide 6 — What Worked

**`submit_recommendation` as a typed tool, not a text field**

The single most important architectural decision. By making the agent call a tool with a defined schema (`effect_type`, `effect_params`) rather than writing prose recommendations, we get machine-executable output with no parsing step. Accepted recommendations directly mutate simulation state.

**Anthropic's server-side `web_search_20250305`**

Zero client-side complexity. Anthropic executes the search during the API call; results appear as `web_search_tool_result` blocks in the same response. The agent seamlessly incorporates real supplier data without any additional infrastructure.

**SSE + ReadableStream for agent transparency**

Real-time streaming of tool calls, reasoning, and results creates an observable agent — users see exactly what the agent is doing and why, which builds trust in the recommendations.

**`IFactoryStore` strategy pattern**

Switching between in-memory simulation and SQLite required zero changes to the agent or API routes. The abstraction held perfectly across all 17 tools.

**Stable anomaly IDs for deduplication**

Format: `batch-{id}-blocked`, `supplier-{id}-delayed`, `inventory-{partNumber}-low`. The same anomaly returns the same ID across scans, enabling the client to track "first seen" and avoid duplicate notifications.

**Rule-based monitor as a complement to the agent**

The monitor is cheap (no LLM call, runs on every poll), always-on, and deterministic. The agent is expensive and runs on demand. The two layers compose well: monitor surfaces what, agent reasons about why and what to do.

---

## Slide 7 — What Failed (and How We Fixed It)

**SDK type gaps for server tools**

`web_search_20250305` is not in the Anthropic TypeScript SDK's `Tool` union type. Response blocks of type `server_tool_use` and `web_search_tool_result` also don't appear in the SDK's content block types.

*Fix:* Cast `allTools` as `unknown as Anthropic.Tool[]` and iterate `response.content as unknown[]` with `Record<string, unknown>` field access. Works, but brittle — will need updating when the SDK adds first-class types.

**`better-sqlite3` in Turbopack**

Next.js 16 with Turbopack cannot bundle native Node modules. Initial build failed with a module resolution error for `better-sqlite3`.

*Fix:* `serverExternalPackages: ["better-sqlite3"]` in `next.config.ts` + dynamic `require()` inside `getFactoryStore()` to keep it entirely out of the module graph when `DATA_SOURCE=sim`.

**Stale closures in the auto-run interval**

`setInterval` captured initial values of `isAnalyzing` and `state` — the tick function couldn't see updated state and would advance even while the agent was running.

*Fix:* `useRef` mirrors for `isAnalyzingRef` and `stateRef`, kept in sync with `useEffect`. The interval reads from refs, never from stale closure state.

**Agent over-relying on web search before exhausting factory tools**

In early system prompt versions, the agent would web-search on the first mention of any supplier, even when the factory tools had sufficient data to answer the question.

*Fix:* Tightened the system prompt to make web search conditional — only when a supplier is "at-risk, delayed, or insolvent" or inventory is "critically low with no viable in-system alternative."

**Module singleton resets on dev hot-reload**

`simEngine` and `factoryStore` are module-scope singletons. In Next.js dev mode, hot module replacement can re-initialize them, losing state mid-session.

*Status: Known, not fixed.* In production builds this doesn't occur. The SQLite mode (`DATA_SOURCE=db`) is the correct solution — state survives any module reload.

---

## Slide 8 — What We Would Do Next

### Ranked by value-to-effort ratio

---

**1. Auto-trigger analysis on critical anomalies** *(Near-term)*

During auto-run, compare anomaly IDs tick-to-tick. If a new critical anomaly appears, pause auto-run and automatically launch agent analysis — no click required. Creates a fully autonomous watch mode.

```typescript
// One useEffect change in page.tsx
const newCritical = newAnomalies.find(
  a => a.severity === "critical" && !prevIds.has(a.id)
);
if (newCritical && autoAnalyzeCritical) handleAnalyzeAnomaly(newCritical);
```

---

**2. Agent conversation mode** *(Medium-term)*

After analysis completes, allow follow-up questions in natural language ("What if we can't find an alternative titanium supplier?"). The agent responds using the same factory tools, with conversation history maintained as a `Message[]` array. Resets on new event trigger.

New route: `POST /api/sim/chat` — one agent turn, no full event loop.

---

**3. Recommendation outcome tracking** *(Medium-term)*

Record whether accepted recommendations actually improved the targeted metric. After N days, check: did the batch delay reduce? Did inventory restock? Surface as an "Outcomes" view in the AgentPanel. Closes the feedback loop and creates a dataset for evaluating agent quality.

New DB table: `outcome_checks { recId, checkDay, metric, before, after, improved }`.

---

**4. Analytics panel** *(Medium-term)*

The SQLite DB already captures everything: events, recommendations, batch state, simulation days. Build a second view with:
- Event timeline
- Recommendation accept/ignore rates
- Average cycle time per stage per product
- Supplier health trends over simulation days

No new data collection needed — just queries and charts.

---

**5. Real ERP/MES integration** *(Long-term)*

The `IFactoryStore` interface is the integration point. Implement `ERPFactoryStore` against a real system's API, add `DATA_SOURCE=erp` to the selector, and wire `applyRecommendation()` effects to real mutations (create PO, update work order). The agent tools, monitor rules, and SSE infrastructure require zero changes.

---

**6. Webhook event ingestion** *(Long-term)*

Replace manual event triggers with a `POST /api/webhooks/event` endpoint. Map supplier portal notifications, MES alerts, and IoT threshold breaches to the existing event structure. Optionally auto-trigger agent analysis on receipt.

---

## Slide 9 — The Broader Point

### What this project demonstrates about agentic systems

**Agents are not chatbots.** The value here is not question-answering — it is the ability to traverse a multi-domain operational graph, formulate an assessment, search external sources, and produce typed executable output, in a single automated loop.

**The abstraction layer matters more than the model.** The `IFactoryStore` interface, the typed `submit_recommendation` schema, and the stable anomaly IDs are what make the system composable and extensible. Swap the model, swap the data backend — the architecture holds.

**Proactive + reactive is the right split.** Rules are cheap, deterministic, and always-on. LLMs are expensive, powerful, and on-demand. Use each where it fits: rules for "is there a problem?", agent for "why, and what do we do?".

**Transparency is a feature.** Streaming tool calls to the UI is not cosmetic. Users who see the agent's reasoning accept recommendations at a higher rate than users who see only the conclusion. The SSE feed is trust infrastructure.

---

## Slide 10 — Summary

| Dimension | Detail |
|---|---|
| **Domain** | Aerospace production operations |
| **Stack** | Next.js 16, TypeScript, Anthropic SDK, SQLite/Drizzle |
| **Model** | claude-sonnet-4-6 |
| **Agent tools** | 17 factory tools + web_search + submit_recommendation |
| **Agentic turns** | Up to 20 per analysis |
| **Monitoring** | 5 anomaly categories, polling every 5s |
| **Data backends** | In-memory sim (default) or SQLite (DATA_SOURCE=db) |
| **Recommendations** | 6 typed effect types, directly executable |
| **Streaming** | SSE (ReadableStream), real-time tool call feed |
| **Next milestone** | Auto-trigger analysis + agent conversation mode |

> The system already works. The seeded data surfaces real anomalies on load, the agent produces coherent multi-step analyses with live web results, and accepted recommendations visibly mutate batch state. The next phase is closing the autonomy gap — from "user clicks Analyze" to "agent notices and acts."
