# Alyra Perfume Builder IDE — Plan

**Date:** 2026-08-10  
**Owner:** Alyra Perfumer CTO (`alyra-perfumer-cto`)  
**Status:** Plan only — **do not implement the IDE in this pass**  
**Related:**  
- Agentic brain + bridge: [`alyra-perfumer-agentic-plan.md`](./alyra-perfumer-agentic-plan.md)  
- Brain readiness: [`alyra-perfumer-brain-readiness.md`](./alyra-perfumer-brain-readiness.md)  
- Design brief: [`superpowers/specs/2026-08-09-alyra-perfumer-agentic-design.md`](./superpowers/specs/2026-08-09-alyra-perfumer-agentic-design.md)  
- Schema: [`schemas/lab-bridge-formula.schema.json`](./schemas/lab-bridge-formula.schema.json)  
- Visual law: [`../DESIGN.md`](../DESIGN.md)

---

## 1. Product thesis (one paragraph)

**Cursor for perfume** means one atelier surface where the brief lives in a chat rail while the formula materializes on the wood desk in front of you: Plan mode by default (readable proposal, zero silent pours), then a single **Build** CTA that flips the agent into mutation mode so chemicals appear step by step with chat narration in lockstep. The stack is already agentic (Groq tools, FormulaCard, bidirectional Lab↔Perfumer bridge); this cycle is mostly a **UI vamp + orchestration mode switch** that absorbs `/perfumer` into the Lab shell instead of shipping users across two apps for the aha loop: brief → plan → Build → see pours.

---

## 2. Brutal honesty — built vs net-new

### Already built (reuse, do not rewrite)

| Layer | What exists | Evidence |
|-------|-------------|---------|
| Desk canvas | Inventory \| desk \| tutor on `md+`; phone desk-only + sheets | `LabShell`, `DESIGN.md` breakpoint table |
| Desk hydrate | `deskStore.loadFormula` (bulk place + pour + optional mix) | Used by market, invention, Open in Lab |
| Perfumer agent | Groq tool loop, SSE, FormulaCard, refine + brief memory | ZPL `alyra-perfumer` + `src/perfumer/*` |
| Lab bridge | `LabBridgeFormula`, Open in Lab, Continue in Perfumer, sessionStorage | `labBridge.ts`, `labIngredientMap.ts`, Vitest |
| Chat UX | Streaming, ThinkingPanel stages, chat list, FormulaCard | `/perfumer` page |
| Tutor | `ExplanationPanel` (right rail / phone sheet) | Existing chemistry tutor, not perfume plan panel |
| Nav | Separate `/lab` and `/perfumer` links | `NavChrome` |

### Net-new for this IDE (the real work)

| Gap | Honesty |
|-----|---------|
| Unified builder shell | Perfumer is still a **separate route** with max-width chat column. No IDE composition. |
| Closable L/R panels | Desktop rails are **always on**. No collapse chrome. |
| Top tabs Lab \| Tutor \| Chat | Mode today is desk \| scan only. Chat is another URL. |
| **Plan mode vs Build mode** | Open in Lab already mutates on click. There is **no** plan-gated agent; no Build CTA; no "propose only" tool policy. |
| Step-timed desk build | `loadFormula` is **instant bulk**. No event timeline (propose → add → % → mix → notes) synced to narration. |
| In-app plan panel readability | FormulaCard is solid for formulas; there is **no** dedicated Plan document UI (readable steps, approvals, Build). Eco/system docs stay in Markdown; in-app plan must match DESIGN (Cormorant/DM Sans, not tiny chrome type). |
| Chat-as-right-rail on Lab | Right rail is chemistry tutor, not Perfumer. |
| Orchestration switch | Backend has no `mode: plan \| build` flag; tools always "real" from the agent's POV; mutation is client-side CTA only. |

**Verdict:** Backend + bridge are ~70% of the agent story. The "Cursor IDE" experience is ~90% **net-new UI + a thin mode contract**. Do not pretend this is a CSS pass.

---

## 3. Information architecture

### Desktop (`md+`) — one instrument bench

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Alyra Labs   [ Lab | Tutor | Chat ]     XP / Goals / overflow          │
├──────────┬──────────────────────────────────────────────┬───────────────┤
│  LEFT    │           CENTER (always hero)               │  RIGHT        │
│  Explorer│           Desk canvas (wood)                 │  Chat + Plan  │
│  Inventory│          vessels / pours / Mix              │  (default on) │
│  (closable)│         Build timeline HUD (quiet)         │  closable     │
└──────────┴──────────────────────────────────────────────┴───────────────┘
```

| Region | Role | Default |
|--------|------|---------|
| **Center** | Desk canvas — brand hero per DESIGN.md. Never shrink type to "fit more chrome." | Always visible |
| **Left** | Inventory / explorer (notes, oils, equipment). Closable → desk goes full-bleed under header. | Open on Lab tab; may auto-collapse during Build focus (user preference) |
| **Right** | Chat + Plan stack: messages above, **Plan panel** (readable steps + **Build** CTA) pinned or accordion below. Closable. | Open when Chat tab or after first brief |
| **Top tabs** | **Lab** (desk focus), **Tutor** (chemistry explanation rail / sheet content), **Chat** (Perfumer absorbed here) | Lab default; Chat opens right panel |

**Tab semantics (precise):**

- **Lab** — center desk + left inventory. Right may stay collapsed unless a live Build is narrating.
- **Tutor** — surfaces `ExplanationPanel` content (reaction / scent notes). On desktop can be the right rail *or* a center overlay; prefer right rail swap: Tutor vs Chat are mutually exclusive **right-slot modes**, not three simultaneous columns.
- **Chat** — right slot = Perfumer chat + Plan. Left inventory remains available.

**Closable panels:** Icon affordance in panel header (and keyboard). Collapsed = thin grip / chevron only, not a second toolbar. Persist preference in `localStorage` (`alyra.builder.panels.v1`).

### Phone (`< md`) — desk-only law unchanged

Per DESIGN.md: **no broken 3-pane**. Desk full-bleed. Inventory and Tutor stay sheets/FABs. Chat/Plan = full-height sheet (or route fragment) over dimmed desk — same pattern as tutor today. Build narration = toast + optional compact timeline chip over desk, not a squeezed column.

### Absorbing Perfumer + Lab

| Today | Target |
|-------|--------|
| `/perfumer` standalone chat | Primary: Chat tab inside Lab shell. Keep `/perfumer` as deep-link / redirect into builder Chat for bookmarks. |
| Open in Lab → navigate `/lab?bridge=1` | Becomes **Build** (or Plan→Build) **without leaving the shell** when already on Lab. Bridge payload still powers hydrate. |
| Continue in Perfumer → `/perfumer?fromLab=1` | Becomes "Send desk to Chat" in-shell; reuse `ChatBridgePayload`. |
| Bidirectional `LabBridgeFormula` | Remains source of truth. IDE does not invent a second formula schema. |

---

## 4. Plan mode vs Build mode (state machine)

### States

```
idle ──brief──► planning ──(agent done)──► plan_ready
                                              │
                         user edits brief ────┘
                                              │
                                         [Build]
                                              ▼
                                         building ──► built
                                              │
                                         [Stop] → stopped (desk frozen at last step)
                                              │
                                         [Undo] → plan_ready (restore pre-build snapshot)
```

Optional later: `plan_ready` → refine turns stay in **planning** (agent updates Plan artifact only).

### Mode rules

| Mode | Agent / tools | Desk mutations | UI |
|------|---------------|----------------|-----|
| **Plan (default)** | Allowed: `generate_formula`, `search_*`, `calculate_formula_cost`, `apply_solid_constraints`, `validate_materials`, catalog, RAG, `analyze_dupe`, `web_search`, `refine_formula`. **Forbidden as mutations:** anything that calls `loadFormula` / `addChemicalToVessel` / Mix. `open_in_lab` / `lab_bridge` may **emit a Plan artifact** (preview payload) but must not auto-apply. | **None.** User may still manual-pour (human agency). Agent never silent-pours. | Readable Plan panel: accord thesis, line list %, map status, ₹, India/occasion notes, risks (unmapped). Primary CTA: **Build**. Secondary: Refine in chat. |
| **Build** | Client orchestrator consumes Plan / `LabBridgeFormula` and runs **timed desk actions**. Agent may stream **narration only** (or precomputed step copy). Prefer **no new tool rounds** mid-pour unless user asks to Stop + replan. | Sequenced: place vessel → add chem → set %/ml → stir → mix → tutor notes. | Timeline progress; chat step narration; **Stop**; after complete: **Undo to plan**, **Open Tutor**, Refine. |
| **Built / Stopped** | Back to Plan semantics for next turn. | Frozen unless user or new Build. | Diff vs plan if user hand-edited desk. |

### Undo / Stop

- **Stop:** Abort remaining queue; leave vessel as-is; chat says stopped at step N; mode → `stopped` then user can Undo or Resume (P1).
- **Undo:** Restore `deskStore` snapshot taken at Build click (serialize vessels). Return to `plan_ready`. Do not invent a full history stack in P0 — one-level undo is enough.
- **Clear board:** Existing hazard-gated clear; if mid-Build, treat as Stop + clear.

### Auth / guest honesty

Guest pour limits already gate `addChemicalToVessel`. Build must use the same `bypassGuestLimit` pattern as `loadFormula` **or** fail early with sign-up — pick one product rule in P0 and document it (recommend: Build counts as one guest action like Open in Lab today).

---

## 5. Step-by-step "build in front of you" timeline

Replace (or wrap) instant `loadFormula` with a **BuildQueue** driven by the Plan's `LabBridgeFormula`.

### Event vocabulary (client)

| Event | Desk action | Chat narration (example) |
|-------|-------------|--------------------------|
| `propose_accord` | Optional highlight / title chip on desk | "Starting from a humid-evening floral accord…" |
| `place_vessel` | `placeEquipment('beaker')` | "Placing a beaker on the wood." |
| `add_chemical` | `addChemicalToVessel` (one line) | "Pouring bergamot oil — top, heat-bright." |
| `set_amount` | `setChemicalAmount` if %/ml needs adjust | "Aiming ~2.0 ml teaching scale for that note." |
| `add_solvent` | Ethanol / carrier line if EDP | "Cutting with ethanol for the teaching EDP." |
| `stir` | `stirVessel` | "Stirring to wet the oils." |
| `mix` | `mixVessel` (if perfume path expects notes) | "Mixing — watching the scent notes come up." |
| `notes` | Ensure tutor / scent dossier visible | "Heart and base should read rose + soft musks." |
| `mapping_gap` | Toast only | "Skipping vanillin — not in Lab inventory yet (proxy later)." |
| `done` | Mode → built | "Build complete. Tweak on the desk or refine in chat." |

### Sync contract

1. Plan artifact includes ordered `buildSteps[]` (derived client-side from `lines` + vessel + format) **or** derive on Build click.
2. Right chat appends a **system/narrator** bubble (or ThinkingPanel-style line) **per event**, not one wall of text.
3. Timing: ~400–900ms between pours (respect `prefers-reduced-motion` → faster / instant with still-visible step list).
4. Unmapped lines: emit `mapping_gap`, never invent Lab chemicals (existing bridge invariant).

### Relation to today's Open in Lab

Open in Lab ≈ **Build with `instant: true`** (bulk `loadFormula`). Keep as power-user / accessibility path and as fallback when queue fails. Default CTA label becomes **Build**; secondary "Apply instantly" optional in P1.

---

## 6. Tool → Plan artifact vs Build action map

| Tool / signal | In Plan mode | In Build mode |
|---------------|--------------|---------------|
| `generate_formula` | Fills Plan: lines, accord, cost ₹, format | Narration source only if regenerating mid-session (prefer replan) |
| `refine_formula` | Updates Plan + FormulaCard diff; refresh preview `lab_bridge` | Blocked until Stop/Undo (or soft-block with confirm) |
| `search_ingredients` / catalog / RAG / dupe / web | Research → Plan footnotes / chips | Avoid mid-Build |
| `calculate_formula_cost` / `apply_solid_constraints` / `validate_materials` | Plan side panels (₹, solid chassis, IFRA-ish flags) | No |
| `lab_bridge` / `open_in_lab` | **Preview only** — store as Plan.payload; show map report | Consumed by BuildQueue → desk mutations |
| Client `buildLabBridgeFromStructured` | Same as above (preferred, saves tokens) | Same |
| Desk manual DnD | Always allowed | Always allowed; mark Plan "desk diverged" |

**Backend change (thin):** Optional request flag `orchestrationMode: "plan" | "build"`. P0 can stay **client-enforced** (never call hydrate until Build) with zero ZPL changes. P1: agent system prompt knows Plan vs Build so it does not imply "I just poured on your desk."

---

## 7. Plan panel UX (readability, not smaller type)

DESIGN.md density for instrument chrome stays for inventory labels. The **Plan panel is a reading surface**, not chrome:

- Display: Cormorant for plan title / accord name  
- Body: DM Sans `text-sm`+ comfortable leading (phone `text-sm`, desktop may use `text-sm`/`text-base` — **do not** use `text-[10px]` for plan steps)  
- Formula lines: JetBrains Mono for % and ids  
- Structure: numbered steps, clear labels (`Accord`, `Formula`, `Mapping`, `Cost`, `Build`) — no ATX `#` in model prose; UI headings are fine  
- Primary ink **Build** button; muted Refine / Reject  
- Unmapped materials called out in hazard/muted, never hidden  

Eco/system Markdown plans (`docs/*`) stay docs. In-app Plan is the interactive twin, not a dump of this file.

---

## 8. Mobile story

| Concern | Approach |
|---------|----------|
| 3-pane | Forbidden. Desk-only + sheets. |
| Chat | Sheet over desk; swipe/Done to return. |
| Plan + Build | Plan lives in Chat sheet; Build keeps sheet open **or** collapses to a slim progress bar so pours are visible (prefer collapse to progress). |
| Tutor | Existing FAB/sheet; mutually exclusive with Chat sheet if both fight for focus. |
| Closable L/R | N/A — sheets replace panels. |
| Success path | Brief in Chat sheet → readable Plan → Build → watch desk → open Tutor sheet for notes. |

---

## 9. Phased roadmap

### P0 — IDE shell + Plan/Build gate (effort: ~5–8 eng-days)

**Ship:**

1. Lab shell: closable left + right; right slot Chat vs Tutor; top tabs Lab | Tutor | Chat  
2. Embed Perfumer chat into right Chat slot (extract from page into shell-friendly layout)  
3. Plan panel from latest `structured` / `lab_bridge` with **Build** CTA  
4. BuildQueue wrapper over desk actions (step events + chat narrator)  
5. Desk snapshot Undo; Stop  
6. `/perfumer` redirects or thin wrapper into Lab?Chat for continuity  
7. Analytics: `builder_plan_ready`, `builder_build_start`, `builder_build_complete`, `builder_stop`  
8. QA: browse desktop + phone sheets; Vitest for step derivation from bridge; no LangChain  

**Risks:** Layout regressions on LabShell chrome; guest auth edge cases; inventory map gaps still frustrate Build (honest toasts).

### P1 — Polish + orchestration honesty (effort: ~1–2 weeks)

1. `orchestrationMode` in API / system prompt copy  
2. Resume after Stop; richer timeline HUD on desk  
3. Prefer in-shell Build over route hop; deep-link `?plan=` share (optional Firestore)  
4. Expand map hit-rate / inventory product decision (owned with bridge plan)  
5. Panel prefs sync; keyboard shortcuts (⌘B Build, ⌘\\ toggle panels — Mac-first)  
6. Playwright: brief → plan → Build → vessel contents assert  

**Risks:** Over-animating pours vs DESIGN "quiet atelier"; tutor/chat slot thrash.

### P2 — Ecosystem IDE (effort: multi-sprint)

1. Multi-plan history / branches (Cursor-like checkpoints)  
2. Teacher/market publish from Plan  
3. Collaborative session (out of scope until product demand)  
4. Revisit LangChain only if multi-agent graphs become real (**default: NO**)  

**Risks:** Scope creep into rewriting Perfumer backend; dashboard chrome violating DESIGN.

---

## 10. Explicit non-goals

- **Do not** rebuild the Perfumer backend or formula generator from scratch  
- **Do not** adopt LangChain / LangGraph  
- **Do not** shrink type to "fit the IDE" — cleaner layout, not denser microcopy  
- **Do not** expand Lab inventory to 1000 aroma chemicals in this UI cycle (bridge honesty remains)  
- **Do not** certified IFRA engine  
- **Do not** break phone desk-only / visible-scrollbar bans  
- **Do not** replace FormulaCard entirely — Plan panel **composes** it  
- **Do not** silent desk mutations in Plan mode (including "helpful" auto-Open-in-Lab)  
- **Do not** implement the full IDE in the planning pass (this document only)

---

## 11. Success metrics

| Metric | Target (soft-launch) |
|--------|----------------------|
| **Aha path** | User completes brief → visible Plan → clicks **Build** → sees ≥2 sequential pours with chat lines | ≥40% of Chat sessions that produce a formula |
| Time to first Build | Median &lt; 90s from first message when formula succeeds | Track |
| Plan-mode purity | Zero agent-initiated desk mutations before Build | Assert in QA + analytics |
| Map honesty | Unmapped lines shown; no fake chemicals | Spot-check |
| Mobile | No 3-column layout at `< md`; Build still visible on desk | Browse QA |
| Retention of DESIGN | Plan panel uses display/UI/mono correctly; desk stays hero | Design QA |
| Bridge reuse | Build consumes existing `LabBridgeFormula` | Code review gate |

North-star quote for demos: *"I described a wedding floral, read the plan, hit Build, and watched the beaker fill while chat explained each pour."*

---

## 12. File map (when implementation starts — not now)

| Path | Likely action |
|------|----------------|
| `src/desk/LabShell.tsx` | Tabs, closable panels, Chat slot host |
| `src/perfumer/PerfumerChat.tsx` | Shell-embed variant; Plan panel; Build entry |
| `src/perfumer/BuildQueue.ts` (new) | Step derivation + timed desk mutations |
| `src/perfumer/PlanPanel.tsx` (new) | Readable plan + Build CTA |
| `src/perfumer/labBridge.ts` | Snapshot helpers; keep schema |
| `src/store/deskStore.ts` | Maybe `serializeDesk` / restore; prefer external snapshot first |
| `src/app/perfumer/page.tsx` | Redirect or embed shell |
| `src/components/auth/NavChrome.tsx` | Single Builder entry vs dual links |
| ZPL `alyra-perfumer` | P0 optional; P1 `orchestrationMode` prompt |
| `DESIGN.md` | Short decision log row when shipping |

---

## 13. Decision log (planning)

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-08-10 | Plan-by-default + Build CTA | Matches Cursor plan/agent split; prevents silent pours |
| 2026-08-10 | Absorb Chat into Lab shell; keep bridge schema | UI vamp, not backend rewrite |
| 2026-08-10 | Tutor and Chat share right slot (not 4 columns) | DESIGN: desk hero, quiet chrome |
| 2026-08-10 | Client BuildQueue wraps `loadFormula` semantics | Reuse inventory map; add theater + control |
| 2026-08-10 | `/perfumer` becomes alias, not forever dual product | One builder surface |

---

## 14. Execution note

This is the **plan of record** for the Perfume Builder IDE UX. Implement only after explicit go-ahead, through Development → QA (browse + Vitest/Playwright + verdict) → Deploy. Prefer task slices from P0; do not start P2 chrome before Plan/Build purity is proven.
