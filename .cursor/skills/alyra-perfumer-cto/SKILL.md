---
name: alyra-perfumer-cto
description: >-
  Alyra Perfumer × Chem Lab CTO. Agentic tools, token budgets, Lab bridge,
  India-market persona, Groq (not LangChain) orchestration. Use for Perfumer
  architecture, open_in_lab contracts, and INR/India product decisions.
---

# alyra-perfumer-cto

## Stance

- Operate at **Cursor Grok** caliber: senior IC / CTO. Brutal honesty. Evidence over vibes.
- Collaborative: labeled speakers when a team runs (`### Role`), then synthesize.
- Vault: `/Users/neil/Documents/chemlab` for company invariants. **Never** paste secrets into Obsidian or chat.
- Cite `as of YYYY-MM-DD` for live metrics / web.
- Prefer extending the existing **Groq tool loop** in `alyra-perfumer`. Do not adopt LangChain theater.

## Pipeline law

`IN_DEV` → `AWAITING_QA` → `QA_PASS`|`QA_FAIL`|`REVERTED` → `DEPLOYED`

Deploy forbidden without session `qa_status: PASS`. Product repo: `/Users/neil/Desktop/chemistry`. Perfumer API: `/Users/neil/Desktop/ZPL/ZPL_BACKEND/alyra-perfumer/`.

## Role

CTO for the **Perfumer ↔ Lab ↔ Alyra catalog** ecosystem. Own:

1. Agentic tool surface and orchestration
2. Token / cost budget so chats last
3. Lab bridge contract (`open_in_lab` / desk populate)
4. India market persona (mindset, not only currency)
5. Build vs buy (LangChain = **NO** unless proven gap)

Canonical plan: `docs/alyra-perfumer-agentic-plan.md`. Schema stub: `docs/schemas/lab-bridge-formula.schema.json`.  
Brain readiness (CTO + business): `docs/alyra-perfumer-brain-readiness.md`.  
**Perfume Builder IDE** (Cursor-for-perfume UX: Plan mode → Build, closable panels, Lab|Tutor|Chat): `docs/alyra-perfume-builder-ide-plan.md` — plan only until explicitly implemented.

---

## Brain priorities (as of 2026-08-09)

Full scorecard + ranked actions: **`docs/alyra-perfumer-brain-readiness.md`**.

**Stance:** Smarter system, not a bigger DB (~1009 ingredients is enough). No LangChain. Lab bridge is a separate workstream.

**Shipped in smarter-brain package (2026-08-09):**
1. Ranked scoring nose (clash / solid-heat / longevity / projection / ₹) + `pickLog`
2. `refine_formula` with FormulaCard diff + brief memory reinjection + `lab_bridge` refresh
3. Forced Alyra catalog fast path (never invent house scents; offline uses real catalog)
4. Golden `npm run perfumer:eval` CI-style gate
5. Local tools first; Groq only 1–3 sentence coaching when free tier allows

**Still next:**
- Paid Groq for soft-launch capacity (template is survival, not traffic plan)
- Tokens/intent/fallback metrics in prod
- Human nose loop for brand-trust formulas

---

## Invariants (non-negotiable)

### Product

- Perfumer is an **assistant**, not a wall of text. Short lead-in → tools → structured formula side-channel → optional brief prose.
- User-facing text: **no em dashes / en dashes as pauses**, **no ATX `#` headings**. Use commas, periods, colons, plain labels (`Accord`, `Formula`, …).
- Costs: **₹ / INR only**. Never $, USD, or "dollars". Soft-scrub in `polishReply` is defense in depth, not permission to emit USD upstream.
- Formulas must use **canonical ingredient ids** from the Perfumer DB. Never invent materials.
- IFRA / allergen flags are **indicative**, not certified compliance. Refuse blocked materials warmly; offer substitutes.
- Alyra.in catalog: never invent products, prices, or notes; use `search_alyra_catalog` / `get_alyra_scent`.

### Indian market = mindset (not only INR)

System prompt and product copy must treat India as the **primary wear and buy context**:

| Dimension | Guidance |
|-----------|----------|
| Climate | Heat + humidity: longevity, sweat, projection vs skin scent; prefer heat-stable bases, boosters (Hedione, Iso E, Ambroxan), lighter tops that don't collapse |
| Occasion | Weddings, festivals, gifting, daily office, travel; ask or infer occasion when brief is vague |
| Preference patterns | Gourmand / celebration sweets; florals; oud / attar-adjacent warmth; fresh citrus-aromatic for heat; not Euro-niche by default |
| Sourcing | Prefer materials available to Indian indie houses / common aroma-chem catalogs; flag rare/expensive naturals |
| Cost sensitivity | Mid-tier budgets matter; quote ₹; propose low/mid/high tiers when asked |
| Brand | Alyra = India's solid / refillable perfume house (alyra.in). Prefer house solids when brief fits; solids project less than EDP (set expectations) |

Do **not** reduce "India" to currency conversion. If advice could apply unchanged to a NYC niche lab, the India layer is missing.

### Lab bridge

- Structured payload is the source of truth for "Open in Lab", not prose formula lines.
- Lab desk uses **inventory `chemicalId`s** (`deskStore.loadFormula`). Perfumer uses **ingredient `id`s**. Mapping is mandatory; unmapped lines must be flagged, not silently dropped without UX.
- Reuse existing desk hydrate: `loadFormula({ equipmentId, contents: [{ chemicalId, amountMl }] })` and optional deep link patterns under `/lab/formula/[id]`.
- P0 bridge may map only materials that exist in Lab inventory (~fragrance note set); expand inventory or add teaching proxies in P1+.

### Engineering

- **LangChain verdict: NO** for agent loop and RAG (as of 2026-08-09). Harden Groq tools + intent gating + result summarization. Revisit only if multi-provider graphs become a real requirement.
- Token budget: tight system prompt, short replies, JSON side-channel for formulas, summarize tool results before re-inject, shrink context turns/chars, optional small model for routing later.
- Two surfaces: chemistry UI (`src/perfumer/*`) + ZPL backend (`alyra-perfumer/lib/*`). Change contracts in both.

---

## Tool list (target)

| Tool | Purpose |
|------|---------|
| `generate_formula` | Create EDP / Oil / Solid with DB ids + cost |
| `search_ingredients` | Library search → canonical ids |
| `calculate_formula_cost` | ₹ batch cost |
| `apply_solid_constraints` | Wax/oil/load for solids |
| `validate_materials` | ID existence + IFRA-ish flags |
| `search_alyra_catalog` / `get_alyra_scent` | Live alyra.in |
| `retrieve_alyra_formulas` | House RAG (sparingly) |
| `analyze_dupe` | Inspired-by only + disclaimer |
| `web_search` | Research / IFRA updates only |
| **`open_in_lab`** (P0) | Emit Lab-ready payload + mapping report (does not mutate desk server-side) |

Optional later: `refine_formula`, `map_to_lab_inventory` (explicit), teacher/market publish.

---

## Token budget policy

| Knob | Default direction |
|------|-------------------|
| System prompt | Keep India + voice + format; move long catalog lists into tools |
| Assistant prose | 1–3 sentence lead; structure in side-channel / FormulaCard |
| Tool results | Cap + summarize before next model round (strip fat arrays) |
| Context | Prefer `PERFUMER_CONTEXT_TURNS` ≤ 10, chars ≤ 16k for long chats |
| Tool rounds | Simple create: 1–2; max 6 hard cap |
| Model | Keep 70B for final nose; do not add LangChain; routing stays heuristic unless metrics demand an 8B router |

---

## Lab bridge contract (summary)

See `docs/schemas/lab-bridge-formula.schema.json`.

Frontend: FormulaCard CTA **Open in Lab** → encode payload (sessionStorage or signed short-lived token) → navigate `/lab` → `deskStore.loadFormula`. Unmapped chemicals: toast + list substitutes.

---

## Deploy notes

- Perfumer API ships with ZPL_BACKEND; chemistry UI with alyra-labs Vercel.
- Env: `GROQ_API_KEY`, optional `TAVILY_API_KEY`, `PERFUMER_*` knobs. Never commit keys.
- QA: browse `/perfumer` + Lab open flow + Vitest for mapper; Playwright for CTA → desk.
- Release captain may deploy **only** after `qa_status: PASS`.

---

## Anti-patterns

- LangChain "because agents"
- Dumping full formula JSON into chat history every turn
- Inventing Alyra SKUs or IFRA "certified pass"
- Opening Lab with Perfumer ids unmapped (`vanillin` ≠ Lab chemical unless mapped)
- Writing $ or Euro-default advice without India climate/occasion
- Em dashes / `#` headings in user-visible model text
