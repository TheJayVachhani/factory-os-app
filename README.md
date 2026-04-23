# Factory OS

An interactive aerospace production simulation with an AI agent that responds to factory disruptions in real time.

Built with **Next.js 15**, **TypeScript**, and **Claude** (Anthropic).

---

## What it does

Factory OS simulates a 90-day production pipeline for an aerospace manufacturer building three aircraft variants (Atlas A1, Boreas B2, Cirrus C3). Batches of parts move through six pipeline stages:

```
Queue → Procurement → Manufacturing → QC → Shipping → Delivered
```

You control time (+1/+7/+30 days) and can trigger **surprise events** — a supplier delay, a QC failure, a line breakdown, a demand spike, or a supplier insolvency. When an event fires, the **AI agent** activates:

1. Calls 16 factory tools to read live state (lines, suppliers, inventory, quality records)
2. Streams its tool calls and reasoning to the UI in real time
3. Submits 2–4 structured **recommendations** (switch supplier, expedite order, quarantine batch, etc.)
4. You choose to **Accept** or **Ignore** each — accepted recommendations mutate the simulation state

---

## Getting started

**Prerequisites:** Node.js 18+, an [Anthropic API key](https://console.anthropic.com/)

```bash
git clone https://github.com/TheJayVachhani/factory-os-app.git
cd factory-os-app
npm install
cp .env.local.example .env.local   # then add your ANTHROPIC_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it redirects to `/simulation`.

---

## Project structure

```
app/
  simulation/page.tsx           # Main simulation view (client component)
  api/
    sim/                        # Simulation state API
      state/route.ts            # GET  → current SimState
      advance/route.ts          # POST → advance N days
      event/[eventId]/route.ts  # POST → trigger a surprise event
      analyze/route.ts          # GET  → SSE stream of agent analysis
      apply/route.ts            # POST → apply a recommendation
      reset/route.ts            # POST → reset to Day 1
    factory/                    # Factory data API (read-only)
      lines/ suppliers/ inventory/ quality/

components/simulation/
  KanbanBoard.tsx               # 6-column pipeline board
  StageColumn.tsx               # Single stage with batch cards
  BatchCard.tsx                 # Batch card with progress bar + flags
  ControlPanel.tsx              # Day controls + event triggers
  AgentPanel.tsx                # SSE tool-call feed + agent response
  RecommendationCard.tsx        # Accept / Ignore card

lib/
  factory/
    types.ts                    # Domain interfaces (ProductionLine, Supplier, etc.)
    store.ts                    # FactoryStore singleton (in-memory)
    seed.ts                     # Realistic aerospace factory seed data
  simulation/
    engine.ts                   # SimulationEngine: 90-day pipeline, batch FSM
    events.ts                   # 5 surprise event definitions + state effects
  agents/
    sim-agent.ts                # SimAgent: Anthropic agentic loop, 16 factory tools
```

---

## Factory data

The seed data models a realistic aerospace operation:

- **5 production lines** — Fuselage Assembly, Avionics Integration, Wing Assembly, Final Assembly, Flight Test Prep
- **12 global suppliers** — Japan, Germany, USA, India, UK, France, Israel, South Korea, Italy, Brazil, China
- **20 inventory items** — two intentionally below reorder point (titanium sheet, landing gear struts)
- **3 products with full BOMs** — Atlas A1 (utility airframe), Boreas B2 (ISR platform), Cirrus C3 (cargo UAV)
- **Deliberate problems seeded in** — SUP-001 Tanaka Industries delayed, SUP-009 Alenia Landing Gear at-risk

---

## Surprise events

| Event | Effect |
|---|---|
| ⚠ Titanium Supplier Delay | +14 days on all SUP-001 procurement batches |
| 🔴 Batch Fails QC Inspection | Sends a QC batch back to manufacturing (+8 days) |
| 🔧 LINE-3 Emergency Breakdown | Blocks all LINE-3 manufacturing batches (+10 days) |
| 📈 Urgent Order: 3× PROD-B2 | Injects an urgent new batch into the queue |
| 💀 SUP-009 Ceases Operations | Blocks PROD-A1 and PROD-C3 batches (+20 days) |

---

## Agent architecture

The AI agent uses a manual agentic loop with the Anthropic SDK — no MCP subprocess required:

```
Event triggered
  → buildAgentContext(state) constructs a situational prompt
  → Claude calls factory tools (get_inventory_levels, check_lead_times, etc.)
  → Tool results feed back as tool_result messages
  → Claude calls submit_recommendation (2–4 times) with structured effect params
  → Claude writes a concise summary analysis
  → All events streamed to UI via SSE
  → User accepts → applyRecommendation() mutates SimulationEngine state
```

The `submit_recommendation` tool captures structured data (`effect_type`, `effect_params`) that maps directly to simulation state mutations — no free-text parsing needed.

---

## Extending to real data

The tool schemas and agent patterns are designed to be portable. To connect real systems:

1. **Replace `lib/factory/store.ts`** with adapters to your ERP/MES/WMS APIs — the 16 tool schemas stay the same
2. **Replace `simEngine.applyRecommendation()`** with real API calls (create PO, update line status, etc.)
3. **Replace manual event triggers** with webhooks from supplier portals, MES alerts, or IoT feeds

See [factory-os-mcp](https://github.com/TheJayVachhani/factory-os-mcp) for the original MCP server prototype this was built from.

---

## Tech stack

- [Next.js 15](https://nextjs.org/) — App Router, Turbopack
- [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-node) — claude-sonnet-4-6
- [Tailwind CSS v4](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- TypeScript, in-memory state (no database required)
