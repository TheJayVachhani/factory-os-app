# Factory OS

An aerospace production simulation with an AI operations agent that monitors, investigates, and recommends actions in real time.

Built with **Next.js 16**, **TypeScript**, **Claude** (Anthropic), and **SQLite** (optional).

---

## What it does

Factory OS simulates a 90-day production pipeline for an aerospace manufacturer building three aircraft variants (Atlas A1, Boreas B2, Cirrus C3). Batches move through six pipeline stages:

```
Queue → Procurement → Manufacturing → QC → Shipping → Delivered
```

### Manual mode
Advance time (+1/+7/+30 days) and trigger **surprise events** — a supplier delay, a QC failure, a line breakdown, a demand spike, or a supplier insolvency. The AI agent activates on each event.

### Auto-run mode
Press **▶ Run** and the simulation advances one day every two seconds automatically. The monitor strip surfaces anomalies as they emerge — click **Analyze** on any alert to dispatch the agent immediately.

### AI agent
When analysis triggers (event or anomaly), the agent:

1. Calls 17 factory tools to read live state (lines, suppliers, inventory, quality records, BOMs)
2. Uses **Anthropic's built-in web search** to find alternative aerospace suppliers when needed
3. Streams its tool calls and reasoning to the UI in real time via SSE
4. Submits 2–4 structured **recommendations** (switch supplier, expedite order, quarantine batch, add safety stock, etc.)
5. You **Accept** or **Ignore** each — accepted recommendations mutate the simulation state

---

## Getting started

**Prerequisites:** Node.js 18+, an [Anthropic API key](https://console.anthropic.com/)

```bash
git clone https://github.com/TheJayVachhani/factory-os-app.git
cd factory-os-app
npm install
cp .env.local.example .env.local   # add your ANTHROPIC_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — redirects to `/simulation`.

### SQLite mode (optional)

To persist state across server restarts and use a real DB backend:

```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-...
DATA_SOURCE=db
```

The database file (`factory-os.db`) is created and seeded automatically on first request. Leave `DATA_SOURCE` unset (or set to `sim`) for the default in-memory simulation mode.

---

## Project structure

```
app/
  simulation/page.tsx             # Main simulation view
  api/
    sim/
      state/route.ts              # GET  → current SimState
      advance/route.ts            # POST → advance N days
      event/[eventId]/route.ts    # POST → trigger surprise event
      analyze/route.ts            # GET  → SSE: agent analyzes event
      apply/route.ts              # POST → apply a recommendation
      reset/route.ts              # POST → reset to Day 1
      monitor/
        route.ts                  # GET  → current anomaly scan
        analyze/route.ts          # GET  → SSE: agent analyzes anomaly
    factory/                      # Factory data (read-only)
      lines/ suppliers/ inventory/ quality/

components/simulation/
  KanbanBoard.tsx                 # 6-column pipeline board
  StageColumn.tsx                 # Single stage with batch cards
  BatchCard.tsx                   # Batch card with progress + flags
  ControlPanel.tsx                # Day controls, auto-run, event triggers
  AgentPanel.tsx                  # SSE tool-call feed + agent response
  RecommendationCard.tsx          # Accept / Ignore card
  MonitorStrip.tsx                # Live anomaly alert bar

lib/
  factory/
    types.ts                      # Domain interfaces
    store.ts                      # IFactoryStore interface + factory function
    store-sim.ts                  # SimulatedFactoryStore (in-memory)
    store-db.ts                   # DatabaseFactoryStore (SQLite via Drizzle)
    seed.ts                       # Aerospace factory seed data
  simulation/
    engine.ts                     # SimulationEngine: 90-day batch FSM
    events.ts                     # 5 surprise event definitions
    monitor.ts                    # Anomaly scanner + agent context builder
  agents/
    sim-agent.ts                  # Agentic loop, 17 tools, web search
  db/
    schema.ts                     # Drizzle table schemas
    client.ts                     # better-sqlite3 + Drizzle client
    seed.ts                       # Idempotent DB seeder
```

---

## Proactive monitoring

The monitor continuously scans for five anomaly types:

| Type | Triggers when |
|---|---|
| `batch_delay` | Batch is blocked, or 5+ / 14+ days behind schedule |
| `supplier_risk` | Supplier status is `delayed` or `at-risk` |
| `inventory_low` | Item at or below reorder point; stockout = critical |
| `quality_alert` | Inspection pass rate below 90% |
| `line_down` | Production line is `down` or `maintenance` |

Each anomaly appears as a pill in the **Monitor Strip** (below the header), color-coded by severity: red = critical, amber = warning, grey = info. Clicking **Analyze** on any pill triggers the full agent loop with context tailored to that specific anomaly.

---

## Surprise events

| Event | Effect |
|---|---|
| ⚠ Titanium Supplier Delay | +14 days on all SUP-001 procurement batches |
| 🔴 Batch Fails QC Inspection | Returns QC batch to manufacturing (+8 days) |
| 🔧 LINE-3 Emergency Breakdown | Blocks all LINE-3 manufacturing batches (+10 days) |
| 📈 Urgent Order: 3× PROD-B2 | Injects an urgent new batch into the queue |
| 💀 SUP-009 Ceases Operations | Blocks PROD-A1 and PROD-C3 batches (+20 days) |

---

## Agent architecture

The agent uses a manual agentic loop with the Anthropic SDK — no MCP subprocess required.

```
Trigger (event or anomaly)
  → Build situational context string
  → Claude calls factory tools (get_inventory_levels, check_lead_times, …)
  → Tool results appended as tool_result messages
  → Claude uses web_search (server-side) for alternative supplier sourcing
  → Claude calls submit_recommendation (2–4 times) with typed effect params
  → Claude writes a concise summary
  → All events streamed to UI via SSE (ReadableStream)
  → User accepts → applyRecommendation() mutates SimulationEngine state
```

`submit_recommendation` captures structured data (`effect_type`, `effect_params`) that maps directly to simulation mutations — no free-text parsing required.

### Recommendation effect types

| Effect | What it does |
|---|---|
| `switch_supplier` | Reassigns a batch's supplierId, reduces delay days |
| `expedite_order` | Cuts base + delay days for a single batch |
| `take_line_offline` | Flags manufacturing batches on that line as blocked |
| `bring_line_online` | Removes blocked flag from all batches on a line |
| `quarantine_batch` | Moves batch to QC, adds 3-day hold |
| `add_safety_stock` | Updates inventory quantity on hand |

---

## Data layer

The factory data layer uses a **strategy pattern** switchable via `DATA_SOURCE` env var:

```
DATA_SOURCE=sim  →  SimulatedFactoryStore  (in-memory arrays, default)
DATA_SOURCE=db   →  DatabaseFactoryStore   (SQLite via Drizzle ORM)
```

Both implement `IFactoryStore` — the agent tools and all API routes are agnostic to which backend is active. Dynamic `require()` keeps `better-sqlite3` (a native module) out of the module graph entirely when running in sim mode.

---

## Factory seed data

- **5 production lines** — Fuselage Assembly, Avionics Integration, Wing Assembly, Final Assembly, Flight Test Prep
- **12 global suppliers** — Japan, Germany, USA, India, UK, France, Israel, South Korea, Italy, Brazil, China
- **20 inventory items** — two intentionally below reorder point (titanium sheet, landing gear struts)
- **3 products with full BOMs** — Atlas A1 (utility airframe), Boreas B2 (ISR platform), Cirrus C3 (cargo UAV)
- **Deliberate problems seeded in** — SUP-001 Tanaka Industries delayed, SUP-009 Alenia Landing Gear at-risk

---

## Extending to real data

The architecture is designed for progressive replacement:

1. **Implement `IFactoryStore`** against your ERP/MES/WMS APIs — all 17 agent tool schemas stay unchanged
2. **Wire `DATA_SOURCE`** to select your implementation at runtime
3. **Replace `simEngine.applyRecommendation()`** with real API calls (create PO, update line status, etc.)
4. **Replace manual event triggers** with webhooks from supplier portals, MES alerts, or IoT feeds
5. **Replace the polling monitor** with push subscriptions (WebSockets, SSE from your backend)

---

## Tech stack

- [Next.js 16](https://nextjs.org/) — App Router, Turbopack
- [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-node) — `claude-sonnet-4-6`, built-in `web_search_20250305`
- [Drizzle ORM](https://orm.drizzle.team/) + [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — synchronous SQLite (optional)
- [Tailwind CSS v4](https://tailwindcss.com/)
- TypeScript
