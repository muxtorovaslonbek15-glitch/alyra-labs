# Alyra Perfumer — Brain readiness (CTO + Business)

**As of:** 2026-08-09 (smarter brain package shipped)  
**Scope:** Make the *brain* smarter and production-ready. Not a bigger ingredient DB (~1009 already). Lab bridge is owned by a parallel workstream — noted for fit, not implemented here.  
**Canonical plan:** `docs/alyra-perfumer-agentic-plan.md`  
**Live brain:** `/Users/neil/Desktop/ZPL/ZPL_BACKEND/alyra-perfumer/`  
**UI:** `/Users/neil/Desktop/chemistry/src/perfumer/`

---

## Shipped (2026-08-09 smarter brain package)

| Item | Status |
|------|--------|
| Score-based nose + clash / longevity / projection / ₹ / solid-heat | **Shipped** (`formulaGenerator.js` ranked picks + `pickLog`) |
| `refine_formula` intents + FormulaCard **diff** (±%) + `lab_bridge` refresh | **Shipped** |
| Structured **brief memory** across turns (heuristic extract, MySQL/file persist) | **Shipped** (`briefState.js`, `chat.brief`) |
| Golden `npm run perfumer:eval` (CI exit 1) | **Shipped** — cake, woody rose solid, harsh, Alyra lineup, less sweet, more projection, brief retain, diff |
| Catalog-first fast path (forced tools + offline catalog truth) | **Shipped** |
| Local tools first; Groq only short coaching; free-tier survival | **Shipped** (template narrate when cooling) |

**Eval gate:** `cd ZPL_BACKEND && npm run perfumer:eval` must print `ALL PASS`.

---

## Executive snapshot

You already have a real agent, not a ChatGPT wrapper: local `generate_formula`, intent-gated tools, tool-result summarizer, tight context, Groq 429 survival (8B fallback + template narrate), Alyra catalog tools, and a `/perfumer` FormulaCard + SSE UX.

**How far from production-ready (brain only):**

| Bar | Distance |
|-----|----------|
| Soft-launch demo (Alyra team + friendly indie) | **~60%** — usable today if Groq paid or template-ok, answers are "plausible family recipes" |
| Brand-trust production (customers believe formulas) | **~35–40%** — generator is template theater; no eval harness; free-tier TPM will fail under real traffic |
| Chem Lab ecosystem product (Perfumer → desk → teach) | **~25% brain+product** — Lab bridge missing (other agent); brain alone ~55% without desk loop |

**North star for this doc:** smarter system, not more rows. Double down on formula quality, short structured replies, catalog truth, India wear advice, and reliability under Groq limits.

---

## ### [CTO]

### Current brain architecture

```
User brief (/perfumer SSE or POST /chat)
        │
        ▼
 classifyIntent ──► simple_create | catalog | research | dupe | general
        │
        ├─ simple_create (fast path, preferred)
        │     local generate_formula (DB pick + cost + solid chassis)
        │           │
        │           ├─ Groq: ONE short compose/narrate (70B → 8B on 429)
        │           └─ else narrateFormula template (0 TPM)
        │
        └─ other intents
              Groq tool loop (max ~3 rounds) + toolsForIntent deny-list
              tool results → summarizeToolResult (~1800 chars)
              polishReply (₹ scrub, no em dash / # headings)
        │
        ▼
 structured payload + sections → FormulaCard
 chatStore persistence + buildContextMessages (≤6 turns / 8k chars)
```

| Layer | Files | What it actually does |
|-------|-------|------------------------|
| Orchestration | `lib/agent.js` (~1.5k) | Intent gate, fast path, tool loop, SSE, forced local formula on create |
| Prompt | `lib/systemPrompt.js` | Short India persona + tool discipline (~token-aware) |
| Formula "nose" | `lib/formulaGenerator.js` | **Deterministic family templates** (gourmand/citrus/floral/oriental/woody/default) + `search()` first-hit |
| Solids | `lib/solidConstraints.js` | Wax/oil/load bands, volatile-top warnings, diffusion notes |
| Cost | `lib/cost.js` | ₹ via `PERFUMER_USD_INR` |
| Catalog | `lib/alyraCatalog.js` + `data/alyra-catalog.json` | **3 scents**, ~12 commerce SKUs (synced) |
| House RAG | `lib/rag.js` + `data/alyra-formulas.json` | **57** keyword docs — not embeddings |
| Survival | `lib/groqClient.js`, `lib/narrate.js`, `lib/cache.js`, `lib/toolSummary.js`, `lib/context.js` | Key cool/rotate, model fallback, template offline, TTL cache, truncated history |
| DB | `data/ingredients.json` | **1009** rows with IFRA notes, cost tiers, `solidSuitable` — **enough** |

**Tools (live):** `generate_formula`, `search_ingredients`, `calculate_formula_cost`, `apply_solid_constraints`, `validate_materials`, `search_alyra_catalog`, `get_alyra_scent`, `retrieve_alyra_formulas`, `analyze_dupe`, `web_search`.  
**Not live (P0 elsewhere):** `open_in_lab` / `lab_bridge` event.

**Groq limits (honesty):** Free ~30 RPM / ~12K TPM / ~1K RPD on 70B is org-shared. Survival stack is real; it is **not** a production capacity plan. Same-org `GROQ_API_KEYS` mostly share quota.

### Production-ready scorecard (1–10)

| Dimension | Score | Evidence |
|-----------|------:|----------|
| Quality of answers | **5** | Creates work; families feel samey; no real refine/harsh-fix logic; LLM mostly narrates a local recipe |
| Latency | **7** | Simple create is local+compose; multi-tool research slower but gated |
| Cost / rate limits | **4** | Clever survival; free tier dies under QA+users; paid Groq not productized as requirement |
| Reliability | **7** | Template/catalog/IFRA offline paths; 429 mapped; timeouts; formula still returns when model dies |
| Observability | **3** | Smoke + live QA scripts exist; no tokens/turn, intent mix, cache hit, or quality scores in prod |
| Safety / IFRA honesty | **6** | Disclaimers + indicative flags; risk users treat as clearance |
| Lab ecosystem fit | **3** | Structured formula ready; desk map/CTA not shipped (parallel) |
| Multi-chat memory | **5** | Chat CRUD + history; context truncated hard (correct for TPM, weak for multi-turn refine) |

**Weighted brain readiness:** ~**5.0 / 10** for brand-trust production; ~**6.5 / 10** as an internal atelier copilot with paid Groq.

### How far from production-ready (brutal stages)

1. **Demo-ready (you are here+):** Fast create, FormulaCard, India voice, catalog tools, 429 not blanking the user.  
2. **Soft-launch ready (~+2–3 weeks of brain focus):** Golden evals green; formula generator differentiated; prose never re-lists %; paid Groq; metrics on tokens/intent; refine path.  
3. **Customer-trust ready:** Eval + human nose loop; IFRA category framing clearer; Alyra lineup always tool-backed; refine + harsh-fix that actually mutates lines; Lab open loop live.  
4. **Scale-ready:** Paid quotas, worker-safe cache or Redis later, not more ingredients.

**Bottom line:** ~**40%** of the way to "customers trust this as Alyra's chemist." ~**60%** of the way to "ship soft launch to makers who already know formulas are sketches." The ceiling is **not** the DB — it is `formulaGenerator.js` sameness + free Groq + missing evals.

### Double-down list (make EXISTING features smarter)

1. **`formulaGenerator.js` quality (highest leverage)**  
   - Stop "first search hit" as the nose. Score candidates by: family fit, `typicalUsagePercent`, `solidSuitable`, India heat (favor boosters / stable bases), budget tier, avoid duplicate roles.  
   - Add brief-driven **deltas**: birthday cake (more lactones/maltol, less Iso E), woody rose solid (PEA + rose oxide discipline + woody base, chassis), harsh fix (cut harsh tops, add musks/Hedione — **mutate existing lines**, don't only regenerate family template).  
   - Cap lines (~12–16 for teaching clarity); respect usage max bands when normalizing.

2. **Solid constraints as product, not afterthought**  
   - Always attach chassis + load warnings on `type: Solid`.  
   - Bias generator toward radiant boosters when solid; warn citrus oxidation / vanillin bloom (already partially in `solidConstraints.js` — surface in structured + short prose).

3. **Alyra catalog RAG truth**  
   - Catalog path already has offline `narrateOffline`. Harden: catalog intent **must** call `search_alyra_catalog` / `get_alyra_scent` before prose; never invent SKUs (prompt already says this — enforce in agent with forced tool like create forces formula).  
   - Keep sync script healthy (`scripts/sync-alyra-catalog.js`); 3 scents is fine if always accurate.

4. **India persona in the generator, not only the system prompt**  
   - `inferFamily` + vibe keywords for wedding / humid / office / gifting / attar-adjacent.  
   - Attach `indiaContext` string on structured payload (climate/occasion one-liner) so FormulaCard / Lab can show it without re-asking the LLM.

5. **Cost INR as a first-class coach**  
   - Offer low/mid tiers by swapping luxury naturals → synthetics using existing `costTier` / substitutes fields — **in the generator**, not a second essay.

6. **Streaming UX honesty**  
   - Status events are good. Emit structured early on simple_create so FormulaCard paints before prose finishes.  
   - Template fallback: stream chunks OK; label softly that formula is lab-composed (don't fake "thinking" for 8 seconds of nothing).

7. **Cache golden briefs**  
   - `lib/cache.js` TTL exists. Seed cache keys for: birthday cake, woody rose solid, Alyra lineup, Lyral sub, harsh floral fix. Instant demos, 0 TPM.

8. **Template vs real LLM policy (explicit)**  
   | Situation | Use |
   |-----------|-----|
   | `PERFUMER_TEMPLATE_ONLY=1` / all keys cooling / 429 after budget | `narrateFormula` / `narrateOffline` |
   | `simple_create` with paid Groq | Local formula + **short** 70B narrate (no tool dump) |
   | Catalog / IFRA facts | Prefer tools + short compose; offline catalog OK |
   | Vague coaching / multi-constraint refine | Real LLM + `refine` tool (build) — not 6 tool rounds of search |

9. **Cleaner bot: less prose, better structure**  
   - Today `narrate.js` still dumps a full `- name (id): %` formula into chat **and** FormulaCard. Kill prose formula list when `structured.formula` is present; keep Accord + 2 sentences Explanation/Improvements.  
   - `polishReply` already scrubs dashes/$ — keep.  
   - Prefer fewer tools on create (already denies search/web/RAG) — extend deny for cost/solid if `generate_formula` already returned them.

10. **Eval harness + golden briefs**  
    - Promote `scripts/perfumer-live-qa.mjs` + `smoke-chats.js` into a **brain eval**: assert structured lines exist, no `$`, no `#`, catalog mentions only real handles, solid requests include chassis, birthday cake contains vanillin/maltol/lactone class, woody rose contains rose-family + woody base.  
    - Gate "smarter" PRs on eval, not vibes.

### Cleaner bot checklist

- [ ] Prose: 1–2 sentences + labels; **no % dump** if FormulaCard has lines  
- [ ] Fewer tools on create path (already good); forced catalog tools on catalog intent  
- [ ] Eval harness with golden briefs (birthday cake, woody rose solid, harsh fix, Alyra lineup)  
- [ ] `refine_formula` (delta % / swap id) instead of full regen on "too sweet / harsh"  
- [ ] Metrics: tokens/turn, intent%, template-fallback%, cache hit%, formula family mix  

### What NOT to do

- **LangChain / LangGraph theater** — native Groq loop already ships; LC adds tokens and ceremony (CTO veto stands).  
- **Scrape to 5k ingredients** — 1009 with metadata is not the bottleneck; retrieval quality and usage bands are.  
- **More UI chrome** on `/perfumer` (dashboards, chip walls, second sidebars) before the nose is better.  
- **Multi-agent "crew"** of models for perfume — burns TPM, hurts latency.  
- **Claiming IFRA certified** or inventing Alyra SKUs.  
- **Waiting on Lab bridge** to improve formulas — bridge is UX leverage; brain quality is independent.

---

## ### [Business / CPO]

### Who this is for

| Segment | Job to be done | Why Perfumer beats generic ChatGPT |
|---------|----------------|--------------------------------------|
| **Alyra Labs** (primary brand) | Sketch solids, talk lineup truthfully, stay on-brand India | Live catalog tools + house RAG + solid chassis language |
| **Indian indie makers** | Cheap, heat-aware starting formulas in ₹ | Local generator + cost + climate coaching, not Euro niche defaults |
| **Chem Lab students / teachers** | See chemistry as smell + % + desk | Structured formula → (soon) Open in Lab teaching loop |

Not for: IFRA legal sign-off, production SDS, or "clone Baccarat Rouge exactly."

### Value prop vs ChatGPT perfume prompts

ChatGPT: fluent fiction, invented materials, $ prices, weak solid craft, no Alyra SKU truth.  
**Alyra Perfumer:** canonical ingredient ids, ₹ cost, solid constraints, catalog-backed house answers, FormulaCard, rate-limit survival that still returns a formula.  

**Honesty gap:** Under the hood many creates are **template blends narrated by an LLM**. That is fine for atelier sketches if labeled; fatal if marketed as "AI master perfumer genius." Sell **structured lab assistant for Indian solids**, not magic nose.

### Feature double-down that moves revenue / brand

1. **Open in Lab** (other workstream) — turns chat into Chem Lab demo → funnel to product. Brain must emit clean structured lines.  
2. **Alyra catalog truth** — every lineup answer is a brand trust moment; hallucinations here are worse than a mediocre cake formula.  
3. **Solid-first** — Alyra's wedge; default advice and generator bias toward solids when brief fits.  
4. **INR + India climate / occasion** — differentiation you can put on a landing page; ChatGPT won't own this unless prompted every time.  
5. **FormulaCard as the product** — prose is coaching; the card is the SKU of the feature.

### Risks

| Risk | Why it hurts | Mitigation |
|------|--------------|------------|
| Hallucinated / samey formulas | Brand looks amateur | Better generator + evals; "atelier sketch" framing |
| IFRA treated as clearance | Legal/trust | Stronger card disclaimer; never "certified" |
| Catalog hallucination | Alyra brand damage | Forced catalog tools + offline sync path |
| Groq free tier | Soft launch fails mid-demo | Paid Dev plan as launch gate; template only as backup |
| Overbuilding agent theater | Burns calendar vs Lab + growth | This doc's NOT list |

### Near-term roadmap that sells the product

**Week 1–2 (brain):** Generator scoring + India brief heuristics; kill prose % dump; forced catalog tools; golden eval CI-ish script; paid Groq in prod env.  
**Week 2–3 (product loop):** Lab bridge CTA ships (parallel) — market "design in Perfumer, see it on the desk."  
**Week 3–4:** `refine_formula` + harsh/sweet fix paths; occasion chips only if they feed the generator (tiny UI).  
**Later:** Shareable Lab formulas, teacher publish — after trust metrics move.

**Keep / kill / pivot (CEO lens):**  
- **Keep:** Groq tools + local formula + FormulaCard + India/₹ + catalog tools.  
- **Kill:** Ingredient expansion as strategy; LangChain; chatty multi-tool creates.  
- **Pivot messaging:** From "AI master perfumer" → "India-first solid perfume lab assistant with real materials and Alyra lineup truth."

---

## Joint: Top 10 actions (leverage = smartness gain ÷ effort)

Ranked for **brain smartness**, concrete file-level work. Lab bridge listed only where it unlocks ecosystem — implementation owned elsewhere.

| # | Action | Effort | Smartness gain | Where |
|---|--------|--------|----------------|-------|
| 1 | **Score-based material picking + usage-band respect** in generator (replace naïve first-hit) | M | Very high | `lib/formulaGenerator.js`, `lib/ingredients.js` |
| 2 | **Golden eval harness** (4 briefs + asserts: structure, ₹, no invent SKU, solid chassis) | S–M | High (forces quality) | `scripts/perfumer-eval.mjs` (evolve live-qa), CI optional |
| 3 | **Stop duplicating formula % in prose** when structured exists; shorten `narrateFormula` | S | High (cleaner bot) | `lib/narrate.js`, compose prompt in `agent.js` |
| 4 | **Forced catalog tools** on catalog intent (mirror forced generate on create) | S | High (brand trust) | `lib/agent.js` |
| 5 | **India/occasion/budget heuristics** inside generator + `indiaContext` on structured | S–M | High | `formulaGenerator.js`, types on chemistry side |
| 6 | **`refine_formula` tool** (delta % / swap / cut harsh tops) for multi-turn | M | High | new `lib/refineFormula.js`, `agent.js` TOOLS |
| 7 | **Paid Groq + env policy**; template only as survival; document launch gate | S | High (reliability) | ZPL `.env`, README, ops vault note (no secrets in git) |
| 8 | **Seed TTL cache** for golden briefs (0 TPM demos) | S | Med–high | `lib/cache.js` + warm script |
| 9 | **Observability counters**: tokens/turn, intent, fallback%, cache hit | S–M | Med (steers next work) | `agent.js` health or lightweight log metrics |
| 10 | **Open in Lab contract consume** (structured → desk) — parallel agent | M | Ecosystem high | chemistry `labBridge` / FormulaCard — *not this workstream* |

**Honorable mention (do after 1–6):** denser house RAG text for 57 docs (better keywords), not more ingredients; optional 8B **intent-only** router only if `classifyIntent` mis-fires in metrics.

---

## Appendix — Evidence notes (2026-08-09)

- Ingredients: **1009**; IFRA notes / cost fields present on rows surveyed.  
- Alyra catalog: **3** scents (`fruit-damour`, `riva-azul`, `ecos-de-lisboa`), **12** products.  
- House formula RAG: **57** documents.  
- Context defaults: 6 turns, 8000 chars, 1200 chars/msg; tool results ~1800 chars.  
- Create path: local formula + single narrate; `PERFUMER_TEMPLATE_ONLY` skips Groq.  
- Frontend: FormulaCard + SSE; no Open in Lab CTA yet.  
- LangChain: **NO** (see agentic plan).

---

## Related docs

- `docs/alyra-perfumer-agentic-plan.md` — Lab bridge + token tactics + P0 checklist  
- `docs/superpowers/specs/2026-08-09-alyra-perfumer-agentic-design.md` — design brief  
- `.cursor/skills/alyra-perfumer-cto/SKILL.md` — living CTO skill (Brain priorities → this file)
