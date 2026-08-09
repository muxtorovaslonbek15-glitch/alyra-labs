# Alyra Perfumer Agentic Implementation Plan

> **For agentic workers:** Use skill `alyra-perfumer-cto` + `chemlab-dev-pipeline`. Prefer task-by-task execution. Checkbox syntax for tracking.  
> **Design brief:** `docs/superpowers/specs/2026-08-09-alyra-perfumer-agentic-design.md`  
> **Schema stub:** `docs/schemas/lab-bridge-formula.schema.json`  
> **CTO skill:** `.cursor/skills/alyra-perfumer-cto/SKILL.md`

**Goal:** Turn Alyra Master Perfumer into a token-efficient agentic assistant that creates/refines formulas with tools and lets the user click **Open in Lab** so Alyra Lab places the right chemicals on the desk.

**Architecture:** Keep the existing Groq tool-calling loop in `alyra-perfumer`. Add `open_in_lab` as a structured side-channel (not desk mutation on the server). Map Perfumer ingredient ids → Lab `chemicalId`s, then hydrate via `deskStore.loadFormula`. Tighten prompts + tool-result summarization for token budget. India = full market mindset in persona, not INR alone.

**Tech stack:** Node (ZPL `alyra-perfumer`), Groq function calling, Next.js chemistry app (`src/perfumer`, `src/store/deskStore`), existing Alyra catalog sync, optional Tavily web search.

## Global Constraints

- ₹ / INR only; never $ or USD in user-visible text
- Indian market mindset: heat/humidity, weddings/festivals/gifting, gourmand/florals/oud-attar/fresh-for-heat, India sourcing + cost sensitivity, Alyra solid/refillable brand
- No em dashes / en dashes as pauses; no ATX `#` headings in model output (`polishReply` enforced)
- Never invent materials or Alyra SKUs; IFRA flags are indicative only
- **LangChain: NO** (as of 2026-08-09) — harden Groq tools
- Deploy only after vault session `qa_status: PASS`
- Do not commit secrets; ZPL `.env` / chemistry `.env.local` only

---

## 1. Current state audit (as of 2026-08-09)

Perfumer is a real Groq agent on ZPL (`alyra-perfumer/lib/agent.js`, ~1.3k lines) with intent gating, parallel tools, SSE stream, chat persistence, and a 1009-row ingredients DB plus live `alyra.in` catalog tools. Chemistry already has `/perfumer` UI (`FormulaCard`, structured payload types) and Lab desk hydrate via `deskStore.loadFormula` plus market deep links at `/lab/formula/[id]`. Gaps: no `open_in_lab` tool or CTA; formula ids are Perfumer-native while Lab fragrance inventory is a ~51-note teaching set with only ~14 id overlaps; replies still re-embed fat tool JSON into the model context; India is mostly ₹ + a thin climate line in `systemPrompt.js`, not occasion/preference/sourcing depth; README tool list is stale vs catalog tools already shipped.

---

## 2. LangChain verdict

### Decision: **NO**

| Question | Answer |
|----------|--------|
| Does LangChain unlock Groq tool calling? | No — already native in `agent.js` |
| Does it fix Lab bridge? | No — that is a mapper + UI contract |
| Does it reduce tokens? | No — often increases framework overhead |
| Does custom RAG need LangChain? | No — `lib/rag.js` is fine |
| When revisit? | Only if you need multi-provider graphs, durable workflows across services, or a team standardized on LC — not before Lab bridge + token cuts ship |

**Alternatives (preferred):**

1. Harden current Groq loop (intent tools, result summarizer, `open_in_lab`)
2. Optional later: tiny 8B router model for intent only (still not LangChain)
3. If graphs ever needed: thin custom state machine > LangGraph cosplay

Brutal honesty: adding LangChain now is resume-driven complexity. Ship the Lab bridge and token budget first.

**Token discipline is the real lever (2026-08-09):** free Groq (~30 RPM / ~12K TPM / ~1K RPD on 70B) dies on fat system prompts + multi-tool loops + 12k tool dumps. Prefer local `generate_formula` → one short compose, tool summarizer, TTL cache, optional 8B fallback / template narration on 429. Key rotation (`GROQ_API_KEYS`) is secondary and usually org-shared.

---

## 3. Agentic architecture

```
┌─────────────┐     SSE/JSON      ┌──────────────────────┐
│ /perfumer   │◄─────────────────►│ alyra-perfumer agent │
│ FormulaCard │   structured +    │ Groq + TOOLS[]       │
│ Open in Lab │   short prose     │ intent → toolsFor…   │
└──────┬──────┘                   └──────────┬───────────┘
       │ sessionStorage / token               │
       ▼                                      ▼
┌─────────────┐                      ingredients / catalog /
│ /lab        │                      cost / solid / validate /
│ loadFormula │                      open_in_lab (payload)
└─────────────┘
```

### Tools (current + P0)

| Tool | Status | Notes |
|------|--------|-------|
| `generate_formula` | Exists | Prefer for creates; return compact JSON |
| `search_ingredients` | Exists | Skip on simple_create (already) |
| `calculate_formula_cost` | Exists | ₹ only |
| `apply_solid_constraints` | Exists | Solids |
| `validate_materials` | Exists | IFRA-ish |
| `search_alyra_catalog` / `get_alyra_scent` | Exists | Never invent SKUs |
| `retrieve_alyra_formulas` | Exists | Intent-gated |
| `analyze_dupe` / `web_search` | Exists | Research / inspired-by only |
| **`open_in_lab`** | **P0 add** | Builds `LabBridgeFormula` + mapping report; does not mutate Lab |

### Orchestration rules

1. Intent gate first (already): `simple_create` → `generate_formula` once → answer.
2. After tools: **summarize** results (ids, %, cost ₹, flags) before next model round; drop full catalogs.
3. Final assistant message: 1–3 sentence lead + labels only if needed; **full formula lives in `structured` / FormulaCard**.
4. Streaming: keep status events (`Composing the formula…`); emit `lab_bridge` event when payload ready.
5. `open_in_lab`: callable when a formula exists in turn state; frontend may also build payload client-side from `structured.formula` without a second model round (preferred for token cost).

### Streaming contract (extend)

```ts
// existing: status, tool, delta, done, error
// add:
{ type: "lab_bridge", payload: LabBridgeFormula }
```

Frontend stores latest `lab_bridge` on the assistant message; FormulaCard reads it for CTA.

---

## 4. Lab bridge contract

**Schema file:** `docs/schemas/lab-bridge-formula.schema.json` (v1 stub).

### Core fields

- `schemaVersion: 1`
- `title`, `format: EDP | Oil | Solid`
- `vessel.equipmentId` (default `beaker`)
- `lines[]`: `perfumerIngredientId`, `labChemicalId | null`, `name`, `percent`, `amountMl`, `mapStatus`
- `mappingReport`: mapped/unmapped counts
- optional `solidChassis`, `costInr`, `indiaContext`, `disclaimer`

### Amount policy (teaching desk)

Lab vessels use **ml**, not % of concentrate. Derive:

```
amountMl = max(0.5, round(percent / 100 * teachingBatchMl, 1))
```

Defaults: `teachingBatchMl = 20` for EDP-style demos; include `c2h5oh` solvent line when format is EDP if Lab expects ethanol carrier (align with perfume recipes: ethanol + signature oils).

### ID mapping (critical)

| Layer | Id space | Example |
|-------|----------|---------|
| Perfumer DB | ingredient `id` | `vanillin`, `hedione`, `iso-e-super` |
| Lab inventory | `Chemical.id` | `vanilla-extract`, `limonene`, `c2h5oh` |
| Fragrance notes | note id → chemicalId | `vanilla` → `vanilla-extract` |

**P0 mapper file (to implement):** `src/perfumer/labIngredientMap.ts` (chemistry) mirrored or shared logic from `alyra-perfumer/lib/labMap.js`.

Rules:

1. Exact id match if Lab has same id (`limonene`)
2. Alias table (e.g. `vanillin` → `vanilla-extract`, `iso-e-super` → nearest Lab woody/iso proxy if any)
3. Family proxy only with `mapStatus: "proxy"` and user-visible disclaimer
4. Else `unmapped` — CTA still works for mapped subset; toast lists missing materials

**Honesty:** Until Lab inventory expands, many aroma chemicals cannot appear on desk. P0 ships **best-effort mapping** + clear UX, not fake chemicals.

### UX flow

1. User: "Make a humid-evening wedding floral solid under ₹800 / 50g"
2. Agent: `generate_formula` (+ solid constraints) → short prose + FormulaCard + ₹
3. User clicks **Open in Lab**
4. Client: take `lab_bridge` or map `structured.formula` → `sessionStorage.setItem("alyra.labBridge.v1", JSON)`
5. `router.push("/lab?bridge=1")`
6. Lab shell on mount: read storage, `loadFormula({ equipmentId, contents })`, clear key, toast title
7. If `unmappedCount > 0`: toast "Placed N of M materials; X not in Lab inventory yet"

Deep-link alternative (P1): publish ephemeral Firestore formula (reuse `/lab/formula/[id]`) for shareable links. P0 prefers sessionStorage to avoid auth/Firestore dependency for guest flows.

---

## 5. India market mindset (system prompt invariants)

Fold into `lib/systemPrompt.js` (and CTO skill). **India ≠ FX conversion.**

### Required persona blocks

**Climate:** Advise for heat and humidity (India metros / wedding season). Favor heat-stable bases and boosters; set expectations that solids project less; mention sweat and fabric for occasion wear.

**Occasion culture:** When brief is vague, ask or infer: wedding / festive / gifting / daily office / travel. Suggest concentration and load accordingly (celebration gourmands denser; daytime fresh lighter).

**Preference patterns (defaults, not stereotypes):**

- Gourmand / celebration sweets (vanillin, ethyl maltol, lactones)
- Florals for gifting and ceremony
- Oud / attar-adjacent warmth when asked (honest about cost and IFRA)
- Fresh citrus-aromatic for heat and daytime

**Sourcing & cost:** Prefer materials common to Indian indie / aroma-chem supply; flag rare naturals; always ₹; offer low/mid tiers.

**Brand:** Alyra is India's solid / refillable house (alyra.in). Prefer house solids when brief fits; never invent SKUs; use catalog tools.

**Currency:** ₹ only. `polishReply` continues to scrub `$` / USD / dollars.

### Generator heuristics (P0/P1)

- Bias `generate_formula` vibes toward India-relevant families when unspecified
- Attach optional `indiaContext` on lab bridge payload for tutor copy later

---

## 6. Token reduction tactics (concrete)

| Tactic | Where | Target effect |
|--------|-------|----------------|
| Short reply policy in system prompt | `systemPrompt.js` | −30–50% completion tokens |
| Formula in structured side-channel only | agent finalizer + UI | Less duplicated % lists in prose |
| Summarize tool results | new `lib/toolSummarize.js` | Cap each tool message ~1–2k chars |
| Lower context window | `PERFUMER_CONTEXT_TURNS=10`, `CHARS=16000` | Longer chats before truncate |
| Truncate stored assistant content | `context.js` | Already 6k/msg; lower to 2.5k for assistants |
| Intent deny list | existing `toolsForIntent` | Keep; add deny `open_in_lab` until formula exists |
| Client-side Lab map | FormulaCard | Avoid second model call for Open in Lab |
| Drop full cost item arrays from tool→model | `calculate_formula_cost` summary | Keep totals + warnings only for model |
| Optional 8B router | P2 only | Only if intent heuristics mis-fire in prod metrics |

Do **not** shrink the ingredients DB; shrink what re-enters the prompt.

---

## 7. Phased roadmap

### P0 — Agent + Lab bridge MVP (effort: ~3–5 eng-days)

- [ ] Expand India mindset block in `systemPrompt.js` (climate, occasion, preferences, sourcing, brand, ₹)
- [ ] Add short-reply + side-channel instructions
- [ ] Implement `labMap` alias table for top ~40 teaching overlaps/proxies
- [ ] Add `open_in_lab` tool **or** server helper that builds schema payload after `generate_formula`
- [ ] Emit `lab_bridge` on stream `done` / chat response
- [ ] FormulaCard **Open in Lab** CTA + sessionStorage + `/lab` hydrate
- [ ] Tool-result summarizer for cost / search / catalog
- [ ] Env defaults: lower context turns/chars
- [ ] Tests: mapper unit tests; bridge schema validate; smoke chat still works
- [ ] QA browse: create formula → Open in Lab → chemicals visible on desk

### P1 — Hardening (effort: ~1–2 weeks)

- [ ] Expand Lab perfume inventory OR richer proxy set (product call with CPO)
- [ ] Shareable bridge via ephemeral `/lab/formula/[id]` publish
- [ ] `refine_formula` tool (delta % edits without full regen)
- [ ] India occasion chips in Perfumer brief UI (tiny UI; DESIGN.md)
- [ ] Metrics: tokens/turn, map hit-rate, Open-in-Lab CTR
- [ ] IFRA category awareness aligned with Lab `cat4` teaching checks (still indicative)

### P2 — Ecosystem (effort: multi-sprint)

- [ ] Teacher / market publish from Perfumer formulas
- [ ] Optional small router model
- [ ] Cross-app auth session so bridge survives devices
- [ ] Revisit LangChain **only** if multi-agent graphs become real (unlikely)

---

## 8. File map (implementation)

| Path | Action |
|------|--------|
| `ZPL/.../alyra-perfumer/lib/systemPrompt.js` | India mindset + short replies |
| `ZPL/.../alyra-perfumer/lib/agent.js` | `open_in_lab`, summarize, emit lab_bridge |
| `ZPL/.../alyra-perfumer/lib/labMap.js` | **Create** id mapper |
| `ZPL/.../alyra-perfumer/lib/toolSummarize.js` | **Create** |
| `chemistry/docs/schemas/lab-bridge-formula.schema.json` | Stub exists; keep in sync |
| `chemistry/src/perfumer/labIngredientMap.ts` | **Create** (client mirror or fetch map) |
| `chemistry/src/perfumer/labBridge.ts` | **Create** storage + apply helpers |
| `chemistry/src/perfumer/FormulaCard.tsx` | Open in Lab CTA |
| `chemistry/src/perfumer/types.ts` | `LabBridgeFormula` type |
| `chemistry/src/desk/LabShell.tsx` or lab page | Consume `?bridge=1` |
| `chemistry/src/store/deskStore.ts` | Reuse `loadFormula` (likely no change) |

---

## 9. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Wrong / missing Lab chem ids | High | Explicit mapStatus; toast unmapped; never invent Lab chemicals |
| Users think IFRA tool = legal clearance | High | Disclaimer on card + validate_materials copy |
| Dupe / IP claims | Med | Existing analyze_dupe disclaimer; educational framing |
| Latency (multi-tool + 70B) | Med | Intent deny list; summarize; client-side Lab open |
| Token burn on long chats | Med | Context knobs + short prose + no formula dump in history |
| India persona becomes stereotype | Med | Ask occasion; offer ranges; avoid "all Indians want X" |
| Inventory gap frustrates Open in Lab | High | Honest UX; P1 inventory expansion decision |
| LangChain rewrite distraction | Med | CTO veto until P0/P1 done |

---

## 10. Success metrics

- Open in Lab: ≥1 mapped chemical placed on desk for common floral/gourmand demos
- Map hit-rate on generated lines: track; aim ≥40% on teaching-friendly briefs in P0, ≥70% after P1 inventory
- Median assistant completion tokens down vs baseline (measure 20 chats before/after)
- Zero $ / USD in polished replies (smoke assert)
- India keywords present in system prompt + spot-check advice mentions climate or occasion when relevant

---

## 11. Execution notes

I'm using the **writing-plans** discipline: this doc is the actionable plan; the design brief is the locked direction; the schema stub is the contract seed.

**Do not full-implement the Lab bridge in the planning pass** beyond the schema stub and CTO artifacts (already done).

Suggested first build task after approval: India prompt + `labMap` + FormulaCard CTA wired to `loadFormula` for the exact-overlap subset (`limonene`, oils that match, etc.) before expanding proxies.
