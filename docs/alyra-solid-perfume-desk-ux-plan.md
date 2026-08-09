# Alyra Solid Perfume — Desk UX Plan

**Status:** Brainstorm / plan only (no product code)  
**Date:** 2026-08-10 (rev: auto-detect + reveal animation; **no solid mode toggle**)  
**Audience:** Neil + parent agent  
**Canon:** [`DESIGN.md`](../DESIGN.md) · [`branding/BRAND_BRIEF.md`](../branding/BRAND_BRIEF.md) · [alyra.in](https://www.alyra.in/) · existing Perfumer solid tools (`apply_solid_constraints`, catalog, India persona)

---

## Executive summary (paste-ready)

- Alyra sells **solid perfume**. The Lab desk still sells **liquid chem class**. Brand brief says “companion to the physical compact”; the pixels disagree.
- **No solid mode toggle.** Users never pick “solid mode.” The desk **auto-detects** solid intent from brief / formula / Open-in-Lab / Alyra catalog and **morphs the vessel** (beaker ↔ tin). Ambiguous → ask once in chat, or keep liquid for teaching chems.
- Chat brain is ahead of the desk: solids, ₹, India climate, Alyra SKUs. Desk must **show** melt → blend → set and a matte puck / tin, or Open-in-Lab still lands in a beaker and breaks the story.
- **Wow beat:** after Build / Cast completes, perfume should feel **generated into reality** — melt pool → cool → opaque matte puck snaps into tin → optional lid close → soft Press. Eye-catching, on-brand (DESIGN.md: no purple AI glow spam). Abstract scent aura OK; no fake smell-cam.
- Steal Alyra’s ritual language for UX: **Press · Warm · Wear**. Heat / Cool remap as **melt / set** when solid is detected; Mix becomes **Cast**.
- FormulaCard surfaces **chassis ratios** (wax:oil:FO). Competition awareness stays **chat-side**; desk visuals stay Alyra solid identity.
- Do **not**: fake scent, kill liquid teaching, scrape competitor formulas, bolt Shopify onto the desk, or add a mode switch UI.
- Success moment: Build finishes → a **tin with a set puck materializes** on wood; user thinks “this is Alyra’s lab,” not “another beaker sim.”

---

## 1. Problem — liquid lab vs solid brand

### What Alyra is (market truth)

From [alyra.in](https://www.alyra.in/) (as of 2026-08-10):

- **India’s first solid perfume brand** — alcohol-free balm, refillable weighted case, pan refills (~₹699), made for Indian heat/humidity.
- Lineup language: Fruit d’Amour, Riva Azul, Ecos de Lisboa — stories pressed into balm, “never sharp, never loud.”
- Ritual: **Press. Warm. Wear.** Finger lifts balm → pulse points → body heat blooms scent close to skin.
- Positioning: spray wasn’t built for bag / airport / Delhi summer; balm is.

Brand brief + DESIGN.md already claim the product is a **solid perfume companion lab**. That claim is currently **copy-true, desk-false**.

### What the desk is today

| Surface | Reality |
|---------|---------|
| Place | `+ Beaker` |
| Physics | Liquid free-surface waves, pour, stir, shake, boil |
| Process | Heat / Cool as bunsen + ice bath under **glass** |
| React | Mix → equation / tutor language from liquid chemistry |
| Empty state | “Place a beaker. Pour notes. Mix.” |
| Perfumer bridge | Can emit solid chassis + constraints — hydrate still looks like oils in glass |

### The mismatch (brutal)

Users open Alyra Labs expecting the **compact / balm** story. They get Chem Lab cosplay with fragrance oils. Chat can say “solid, 20% FO load, beeswax chassis, humid wedding” while the desk shows a shiny meniscus. Cognitive dissonance kills the “wow.”

This is not a missing feature list. It is a **category signal failure**. If the first vessel on wood is a beaker, the product is still liquid-first no matter what the homepage says.

---

## 2. Product thesis — solid identity without a “mode”

**Solid on the desk** = auto vessel morph + ritual + formula literacy — **not** a user-facing mode, not a fork of the app.

### One sentence

> When the formula is solid, the desk becomes an atelier for a refill — melt the chassis, blend the scent, cast the puck into reality, then press / warm / wear.

### What it is

| Axis | Liquid (default when detected) | Solid (auto when detected) |
|------|--------------------------------|----------------------------|
| Hero object | Beaker / glass well | Tin · pan · matte balm puck |
| Medium | Translucent liquid, waves | Opaque → soft matte wax; softens under Heat |
| Process story | Pour → Mix → react | Melt → Blend → Cast / Set |
| Primary CTA | Mix | Cast (or Mix narrated as set-into-balm) |
| Wear payoff | Reaction FX / equation | Press · Warm · Wear + **reveal animation** |
| Education | Stoichiometry, hazards, ethanol | Chassis literacy, load %, India heat softening |
| How user enters | Place beaker / liquid payload | **Auto** from signals — never a “Solid mode” control |

### What it is not

- Not a Shopify clone of alyra.in on `/lab`
- Not abandoning liquid chemistry education (school / STEM / classic perfume oil work stays)
- Not AR scent or fake “smell clouds” that pretend to be video of smelling
- Not “solid = hide ethanol” only in chat while desk stays glass
- **Not a solid mode toggle, segmented Solid|Liquid control, or settings switch**

### Phone rule

DESIGN.md still holds: desk-only first viewport; sheets for inventory/tutor. Solid vessel must read at **phone hero scale** — the puck (and its reveal) is the memorable thing.

---

## 3. Why no mode toggle (product argument)

### The trap

A “Solid mode” toggle feels like product diligence. It is actually a **category apology**:

1. **Users don’t think in modes.** They think “I want a solid for Delhi summer” or “show me HCl.” Making them flip a switch teaches the *app*, not perfume.
2. **Toggle = two products glued together.** Every empty state, Place cluster, and Build path forks in the user’s head. DESIGN.md wants one desk composition — not a dashboard with mode chrome.
3. **Brand already chose.** Alyra is solid perfume. Biasing the *system* toward solid when the brief is solid is honesty; asking the user to “enter solid mode” is soft denial that liquid is still the default UI.
4. **Toggle farm creep.** Once Solid exists, someone adds Spray / Attar / Cream. DESIGN.md anti-pattern: pill clusters competing with the desk.
5. **Build already knows.** FormulaCard, Lab bridge, catalog SKUs, and agent tools already carry `type` / chassis. Surfacing that as a switch duplicates state and creates desync (“toggle says liquid, card says Solid”).

### The rule instead

**Intent → vessel morph.** Detection (below) owns the switch. UI owns the silhouette, labels, and reveal. Chat owns one clarifying question when ambiguous. Place `+ Beaker` / `+ Tin` remain **equipment** for manual authorship — not a global mode.

### What we still allow (not toggles)

| Affordance | Why it’s OK |
|------------|-------------|
| `+ Beaker` / `+ Tin` in Place cluster | Equipment, same as today — authoring gesture, not app mode |
| Chat: “Solid or spray for this brief?” once | Clarification when signals conflict — then lock vessel |
| Empty copy that mentions tin *or* beaker based on last session / path | Soft bias, not a control |

---

## 4. Detection signals (client + agent structured fields)

Detection is **deterministic preference order**, not ML guesswork on the desk. Chat may propose; structured fields win.

### 4.1 Preference order (highest wins)

1. **Explicit structured payload** on Open-in-Lab / Build / Lab bridge formula  
2. **Alyra catalog solid SKU** selected or referenced as source  
3. **Agent / FormulaCard `type: Solid`** (or equivalent enum)  
4. **Chassis block present** (wax · carrier · FO load with solid-constraint tool applied)  
5. **Brief language** (client or agent NLP tags — wax/balm/solid/tin/compact/press-to-skin)  
6. **Default liquid** for teaching chemistry (acids, bases, classic glassware goals) and for explicit EDP / spray / ethanol / “juice” language  

When (1)–(4) say solid → **morph to tin** without asking.  
When user said EDP / spray / ethanol / hybrid-as-liquid → **stay beaker**.  
When only weak brief language and no structured type → **ask once in chat** or default liquid if the active goal is STEM/chem teaching.

### 4.2 Client-side signals

| Signal | Source | Action |
|--------|--------|--------|
| Lab bridge / Build payload `type: "Solid"` | Perfumer → desk | Tin vessel; solid labels; cast reveal path |
| Payload `chassis: { wax, oil, fo }` (or ratios) | FormulaCard / bridge | Same as solid; surface chassis on card |
| `apply_solid_constraints` result attached | Tool side-channel | Solid path |
| Catalog handle ∈ Alyra solids (Fruit d’Amour, Riva Azul, Ecos de Lisboa, …) | Catalog pick / Open SKU | Solid path; house visual identity |
| Manual Place `+ Tin` | User equipment | Enter solid vessel for that vessel only |
| Manual Place `+ Beaker` | User equipment | Liquid vessel; do not force solid |
| Active goal / inventory = teaching chems (HCl, NaOH, glassware STEM) | Goals / domain | Prefer liquid; ignore weak “balm” chat fluff |
| Session last vessel solid + continuing same formula id | Continuity | Keep tin until formula type flips |

### 4.3 Agent structured fields (chat → desk)

Prefer fields the Lab bridge / FormulaCard already want — plan-level names, not impl:

| Field | Meaning |
|-------|---------|
| `type: "Solid" \| "Liquid" \| "EDP" \| …` | Canonical vessel intent |
| `formFactor: "balm" \| "spray" \| "oil" \| …` | Optional finer grain; balm ⇒ solid vessel |
| `chassis: { waxPct, oilPct, foPct }` | Solid literacy + detection |
| `catalogSku` / `alyraSku` | House solid when set |
| `vesselHint: "tin" \| "beaker"` | Explicit override from agent (rare; prefer `type`) |
| `confidence: "high" \| "low"` | `low` ⇒ chat asks once before Build morphs desk |
| `wearProfile: "close" \| "projecting"` | Copy only; does not flip vessel alone |

Competition / “inspired by Brand X” tags stay on the **message / analysis** object — never drive vessel chrome or reveal skins.

### 4.4 Edge cases

| Case | Behavior |
|------|----------|
| Hybrid brief (“solid for bag, also mist for party”) | Chat picks primary deliverable once; desk follows that `type`. Do not show two modes. |
| User said EDP / eau / spray / alcohol | Liquid beaker even if they also said “soft.” |
| Ambiguous perfume brief, no `type` | Chat asks once: “Solid balm or alcohol spray?” Then lock. |
| Teaching chems / STEM goal | Default liquid; solid language in tutor does not morph vessel. |
| User places Tin then opens liquid FormulaCard | Card / Build wins on hydrate — morph to beaker (or clear + place beaker with narration). Structured payload beats leftover equipment. |
| User places Beaker then Build Solid | Morph beaker → tin with short crossfade / replace narration (“Casting into tin…”). |
| Conflict: card Solid, user mid-liquid pour | Prefer **new Build** to reset vessel; don’t silently recolor liquid as wax mid-pour. |
| Reduced motion | Skip melt→snap spectacle; hard-cut to set puck in tin (see storyboard). |

### 4.5 What detection must never do

- Never require a settings or chrome **Solid mode** switch  
- Never morph vessel on every chat token mid-stream — wait for Plan accept / Build / Open-in-Lab / Place  
- Never use competitor brand names as visual themes on the tin  

---

## 5. Chat brain (no code) — solid-first, competition-aware, catalog-true

Chat is already closer than the desk (`apply_solid_constraints`, catalog tools, India persona, ₹). This section is **prompt / product literacy**, not implementation.

### 5.1 Solid-first prompts (persona invariants)

When the brief fits Alyra / balm / travel / heat / “solid perfume”:

- Default **Solid** in structured output unless user explicitly wants Eau / spray / ethanol carrier.
- Always speak **chassis**: wax : carrier oil : fragrance load (bands, not fake precision to 0.01%).
- Always set expectations: solids **project softer**, sit **close to skin**, reapply from pocket; Indian summer **softens** balm in case (alyra.in FAQ — normal, not a defect).
- Prefer heat-stable bases / boosters; warn volatile tops that flash off in balm differently than in alcohol.
- Language: precise, unhurried, close-to-skin — align with “quiet permanence,” not “banging viral scent cloud.” Product can still feel *banging* via **ritual + matte object + reveal**, not shouty copy.
- Emit `type` + `chassis` + `confidence` so the desk can morph without a toggle.

### 5.2 Competition / market awareness without IP theft

**Chat-side only.** Desk never dresses as a competitor compact.

**Allowed**

- Category education: solid vs attar vs alcohol spray vs cream perfume — wear, heat, travel, sting, projection.
- “Inspired by” / “in the direction of” **public market language** (family, vibe, occasion): e.g. fresh citrus-aromatic solid for humid commute; fruity-floral wedding balm.
- Point to **Alyra SKUs by name** when brief matches (Fruit d’Amour / Riva Azul / Ecos de Lisboa) via catalog tools — never invent handles.
- Compare **user’s sketch** to house lineup: “closer to Azul’s breezy register than d’Amour’s berry-rose.”

**Forbidden**

- Scraping or reconstructing **competitor formulas**, IFRA dossiers stolen from brands, or “dupe this SKU 1:1 with stolen GCMS.”
- Claiming chemical identity with a commercial juice you do not own.
- Training / RAG on pirated formula PDFs.
- Competitor-branded vessel skins, lids, or “dupe reveal” animations on the desk.

**`analyze_dupe` / web_search posture:** research **positioning and note families** only; output remains original teaching formula + chassis + ₹ + disclaimers. Label sketches as atelier sketches, not “master formula of Brand X.”

### 5.3 Wax / oil / fragrance-load literacy

| Concept | User-facing truth |
|---------|-------------------|
| Wax | Structure / melt point / matte hold — beeswax, candelilla, etc. as teaching classes |
| Carrier oil | Softness, slip, skin feel — too much = greasy tin |
| FO / fragrance load | Scent strength vs bleed / sweating oil; solids often run lower effective projection than EDP |
| Softening in heat | Expected in India; sealed case keeps tidy |
| Alcohol-free | No sting narrative; different bloom curve than spray |

FormulaCard / structured payload should already carry chassis; **chat prose must not dump % tables** — point at the card.

### 5.4 Alyra catalog

- House truth only via catalog tools / curated RAG.
- Prefer house solids when brief fits; offer custom solid when user wants authorship.
- Never invent SKUs, prices, or “secret fourth scent.”
- Bridge to desk: Open in Lab / Build carries `type: Solid` + chassis so the vessel **morphs** — no mode UI.

---

## 6. Desk UI/UX ideas (the meat)

Constraint filter from DESIGN.md: monochrome luxury atelier, wood + glass/metal, Cormorant / DM Sans / JetBrains Mono, desk hero, no purple, no badge clutter, Heat = amber, Cool = ice, Mix = ink primary, `prefers-reduced-motion` respected.

### 6.1 Solid vessel — tin / pan / balm puck

**Hero silhouette:** shallow circular **pan** nested in a quiet **compact / tin** ring on ebony wood — not a beaker, not a rectangular “card of wax.”

| Element | Treatment |
|---------|-----------|
| Outer | Thin champagne-metal or ink rim (SVG), weighted like Alyra case — restraint over chrome shine |
| Inner well | Circular pan; fill is **balm body**, not liquid meniscus |
| Idle fill (post-set) | Matte, soft opacity; subtle grain or soft radial falloff — **no continuous free-surface waves** |
| Selection | Same vessel-card chrome as today; footer clusters remapped (below) |
| Multi-vessel | Optional second pan for A/B chassis tests — keep rare; phone still one hero |

Place cluster: `+ Tin` · `+ Beaker` as equipment — **not** labeled “modes.” Separators per DESIGN.md.

### 6.2 Phase metaphor — melt → blend → set

Heat / Cool **already exist** as vessel-attached physics. Do not invent a second thermodynamics system — **re-skin and re-label** when solid is detected.

| Phase | Maps from | Visual | Rail label (solid detected) |
|-------|-----------|--------|-----------------------------|
| **Melt** | Heat on | Soft amber wash in pan; balm glosses slightly, edges soften; optional slow “give” | Heat → **Melt** |
| **Blend** | Stir (and quiet pour-into-pan) | Soft swirl in matte body; notes tint the puck, not a layered liquid column | Stir |
| **Set / Cast** | Cool on **or** primary Mix | Opacity rises, matte returns; feeds into **reveal** (below) | Cool → **Set** · Mix → **Cast** |

**Honest sequencing for Build narration:** Melt chassis → add FO / oils → Stir → Cast/Set → **Reveal** → optional Press ritual.

Shake can stay secondary (less meaningful for balm) or hide when solid is detected to reduce noise.

### 6.3 Texture / opacity — matte wax vs shiny liquid

| Liquid | Solid |
|--------|-------|
| Translucent, specular highlight, wave idle | Matte, chalk-soft or beeswax soft, minimal specular |
| Vertical fill level in glass | Horizontal puck thickness / radius fill |
| Color as dissolved dye in solvent | Color as tinted wax mass (richer, flatter) |
| Ethanol sheen fantasy | Alcohol-free story: no “spirit” gloss |

WebGL fluid well: either **bypass** when solid-detected or run a **highly damped, non-wave** material shader. Fallback SVG matte disc is enough for P0 silhouette; **P0 wow = reveal storyboard**, not shader flex.

### 6.4 Press / Warm / Wear (after reveal)

Mirror alyra.in ritual without claiming real olfaction. Gate: only after Cast + reveal completes.

| Step | Interaction | Visual payoff |
|------|-------------|----------------|
| **Press** | Tap / long-press puck (or fingertip affordance) | Soft indent ripple in matte surface; tiny “lift” of balm highlight |
| **Warm** | Short pulse linked to Melt residue or wrist-heat metaphor | Amber micro-bloom from contact point — same amber token as Heat |
| **Wear** | Confirm / auto after Warm | Abstract **close-radius scent aura** (soft ink/champagne particles or haze within ~1 vessel radius) — **not** a nose video, **not** a room-filling VFX flex |

Phone: Press target ≥44px on the puck itself. XP / first-discovery toast can fire quietly after reveal or first Press (“First balm set”).

### 6.5 Formula card — solid chassis visible

Suggested visible block (mono, JetBrains):

```
Chassis  wax 42 · oil 38 · FO 20
State    set · matte · alcohol-free
Wear     close · reapply from tin
₹        … (if present)
```

- IFRA teaching screen stays; label Category appropriately for leave-on balm when you educate (still “teaching aid, not certified”).
- Open in Lab CTA: “Open tin on desk” when `type: Solid` — still no mode toggle.

### 6.6 Empty states + Build narration

**Empty desk** (no forced solid empty state):

> Place a beaker or tin. Pour notes. Mix — or cast a balm.

When last Build / session was solid, soft bias:

> Place a tin. Melt the chassis. Blend notes. Cast the balm.

Subline (muted): *Fine perfume, in solid form — press, warm, wear.*

**Build / Plan narration (chat → desk):**

1. “Placing tin…” (or morphing vessel…)
2. “Melting wax · oil chassis…”
3. “Blending fragrance load…”
4. “Casting puck…” → **handoff to reveal storyboard**
5. Optional: “Ready — press to wear.”

No silent pours (IDE plan invariant). Solid Build should be **as legible as liquid pours**, with phase labels instead of beaker fill alone.

### 6.7 Tool rail remapping (when solid detected)

| Cluster | Liquid | Solid detected |
|---------|--------|----------------|
| Place | + Beaker | + Tin (+ Beaker still available as equipment) |
| Process | Stir · Heat · Cool · Shake | Stir · **Melt** · **Set** (Shake optional/hidden) |
| React | Mix | **Cast** (ink primary, still one pulsing CTA) |
| Reset | Clear | Clear |

Heat/Cool **physical FX** stay; copy and material response change. No “Mode” cluster.

---

## 7. Reveal animation storyboard (post Build / Cast)

**Purpose:** After Cast completes, the perfume should feel **generated into reality** — a solid tin/puck that materializes, sets, becomes tangible. This is the wow. It is craft spectacle, not AI theater.

**Trigger:** Build queue finishes solid cast **or** user hits Cast on a solid-detected vessel with enough fill.  
**Non-triggers:** Mid-chat typing; competitor “dupe” analysis; liquid Mix.

### 7.1 Beats (full motion)

| Beat | Time (approx) | Visual | Sound (optional, quiet) |
|------|---------------|--------|-------------------------|
| **0 · Hold** | 0–100ms | Tin open on wood; pan holds a **glossy melt pool** (note-tinted, soft amber edge if Melt was on). Desk chrome still. | — |
| **1 · Cool** | 100–500ms | Amber wash fades; ice/cool rim optional (DESIGN Cool token). Pool viscosity rises — swirl damps, specular shrinks. | Soft settle tick |
| **2 · Opacity lock** | 500–900ms | Pool loses translucency → **matte wax**. Color flattens (tinted mass, not dye-in-solvent). Micro grain appears. | — |
| **3 · Snap / set** | 900–1200ms | Puck **snaps** to a firm disc: slight scale 1.02→1.0, edge sharpens, height reads as solid. One decisive motion — not a bounce spam. | Quiet “set” click (wood/metal, not UI blip) |
| **4 · Seat in tin** | 1200–1600ms | Puck settles into pan ring; champagne rim catches a single light kiss. Optional lid arc closes ~40–60% then rests open, or full close + reopen to show Press target. | Soft lid hush |
| **5 · Tangible** | 1600–2000ms | Idle matte; faint fingertip Press affordance (no badge). Optional **abstract** close-radius aura (ink/champagne, &lt;1 vessel radius) — then fade. | — |
| **6 · Ready** | 2000ms+ | Cast CTA quiet; Press enabled; toast if first balm. | — |

Total target: **~1.6–2.2s** for full spectacle. Demo / marketing can hold beat 5 aura longer; product default keeps it short.

### 7.2 Timing principles

- **One climax:** the snap (beat 3). Everything before is preparation; everything after is settle.
- **Ease:** melt/cool = ease-out slow; snap = short ease-in-out or nearly linear punch; lid = gentle ease-in-out.
- **No loop** on the reveal — run once per Cast / Build. Idle after is static matte (or near-static).
- **Interruptible:** Clear / new Build cancels mid-reveal → hard cut to empty or new vessel.
- **Phone:** same beats, slightly shorter (cap ~1.6s); Press affordance larger; lid optional if it eats height.

### 7.3 Reduced motion (`prefers-reduced-motion`)

| Full | Reduced |
|------|---------|
| Melty pool → cool → snap | Hard cut: open tin + **already-set matte puck** |
| Lid arc | Lid already open or omitted |
| Aura particles | Static soft tint ring or none |
| Scale punch | Opacity crossfade only (≤200ms) |

Still communicate “this is solid perfume” via silhouette — never skip the tin.

### 7.4 Motion principles (on-brand)

1. **Material over magic** — wax opacity and rim light, not shader rainbows.  
2. **Physics-adjacent** — cool → firm is believable; teleporting glitter is not.  
3. **Silence of chrome** — no confetti, no XP fireworks on the vessel during reveal (toast after, quiet).  
4. **One accent color** — amber during cool-from-melt residue only; then ink/champagne/matte.  
5. **Spectacle serves silhouette** — if the tin doesn’t read, the animation failed regardless of frames.  
6. **Earned** — reveal only after Cast/Build, so Wear/Press feels like payoff not wallpaper.

### 7.5 Build narration ↔ beats

Align chat/desk step labels so the eye and the copy finish together:

1. Melting… → (pre-reveal melt pool may already be on desk)  
2. Blending… → tint pool  
3. Casting… → beats 1–3  
4. “Set.” → beats 4–5  
5. “Press to wear.” → beat 6  

---

## 8. Visual spectacle without tacky AI aesthetics

### What “wow” means here

**Craft arrival:** watching a balm become a real object on the desk — the same emotional beat as alyra.in’s compact in hand, translated to SVG/CSS/WebGL restraint.

### Allowed spectacle

| Do | Why it fits Alyra / DESIGN.md |
|----|-------------------------------|
| Melt gloss → matte lock | Real wax behavior; amber/ice tokens already exist |
| Single snap set | Decisive, memorable, not a particle orgy |
| Champagne rim light kiss | Material metal, not neon |
| Soft Press indent | Ritual = brand language |
| Close-radius abstract aura | Suggests scent without claiming smell-cam |
| Wood stays hero; vessel centered | Memorable thing = desk composition |

### Forbidden spectacle (tacky AI / game juice)

| Don’t | Why |
|-------|-----|
| Purple / violet / iridescent “AI glow” | DESIGN.md anti-pattern; reads as generic LLM UI |
| Soft seafoam edtech gradients on the puck | Same |
| Room-filling particle fog / bloom spam | Competes with desk; looks like a slot win |
| Photoreal nose / wrist smell-cam video | We can’t deliver olfaction; breaks trust |
| Floating emoji ☁️✨ badges on the tin | HUD clutter |
| Infinite idle shimmer / breathing glow | Anxiety jewelry, not atelier |
| Competitor-branded “dupe reveal” skins | Chat-side education only |
| Confetti / coin burst / level-up on Cast | Gamification toast is enough, quiet |
| Morphing face / avatar “gen AI” flourishes | Not perfume; not Alyra |

### Test (brutal)

Mute the UI chrome and watch only the desk for 2 seconds after Cast. If a stranger says “AI app,” fail. If they say “solid perfume tin,” pass.

---

## 9. What NOT to do

| Don’t | Why |
|-------|-----|
| **Add a solid mode toggle / segmented Solid\|Liquid control** | Category apology; duplicates structured intent; chrome noise |
| Fake photoreal scent / smell-cam | Breaks trust; we can’t deliver olfaction |
| Abandon liquid chemistry education | Still need beakers for STEM, classic juice, ethanol hazards |
| Scrape competitor formulas / GCMS leaks | Legal + brand risk; “inspired-by” only |
| Replace desk with product PDP | Labs is authorship, shop is alyra.in |
| Purple AI / seafoam edtech relapse | DESIGN.md anti-patterns |
| Five mode toggles + badge HUD | Desk must stay empty and dominant |
| Pretend solid Mix is stoichiometry fireworks | Balm set is craft, not explosion |
| Invent Alyra SKUs or “secret juice” | Catalog tools or silence |
| Overbuild WebGL wax before SVG tin + reveal read | Silhouette + storyboard first |
| Competitor visuals on the tin | Competition stays chat-side |

---

## 10. Phased roadmap

Effort = eng + design relative to current desk (Heat/Cool/Mix/GlassVessel already shipped).

### P0 — “They see a solid” + “it becomes real”

**Goal:** Category signal in &lt;2 seconds **and** Cast/Build ends in a believable reveal.

- Solid vessel SVG: tin + matte puck (no wave idle).
- Detection from `type` / chassis / catalog / Open-in-Lab — **no mode toggle**.
- Auto-place or morph to tin on solid Build; skip beaker hydrate.
- Remap labels Melt / Set / Cast; reuse Heat/Cool FX.
- **Reveal storyboard P0:** cool → matte lock → snap set → seat in tin (lid optional). Reduced-motion hard cut.
- FormulaCard chassis strip (wax:oil:FO).
- Build narration steps aligned to reveal beats.
- Chat: solid-default + `confidence` + ask-once when ambiguous (prompt/docs).

**Effort:** M (vessel skin + detection wiring + reveal + card + copy). Highest ROI.

### P1 — “They feel the ritual”

- Press · Warm · Wear + abstract close aura (post-reveal only).
- Matte ↔ soft gloss under Melt; firmer snap polish.
- Shake hidden when solid-detected; optional second pan.
- Lid close/open polish; first-balm toast.
- Guide page: solid ritual vs liquid lab (still no toggle language).
- Reduced-motion paths locked in QA.

**Effort:** M.

### P2 — “Atelier depth”

- Soft WebGL or shader wax (damped); refill-pan swap metaphor.
- A/B chassis compare; India heat “softens in case” coach chip (quiet).
- Market / shelf thumbnails as pans not bottles where solid.
- Deeper competition-education cards in **Chat only**.
- Optional: case exterior skins matching brand black compact — still minimal.

**Effort:** L; only after P0 success moment is undeniable.

---

## 11. Success moment

**Scene:** User (or demo) asks Chat for a humid-evening solid under a ₹ budget, or taps Build on a Solid FormulaCard. No mode switch.

**What they see:**

1. Desk wood. Vessel **morphs to a tin** (or places one) — not a beaker.
2. Amber melt → notes tint a pool → **Cast** → cool → matte → **snap** into a set puck → optional lid.
3. Soft Press affordance; optional **Warm** / close **Wear** aura.
4. Card shows **wax · oil · FO**. Copy says alcohol-free, close wear.

**What they think (verbatim target):**

> “Oh — this is solid perfume. This is Alyra.”

If they still think “nice beaker app,” P0 failed — ship more silhouette + reveal, less chat prose.  
If they think “AI magic glow,” reveal failed — strip particles, keep material.

---

## 12. Design-system compliance checklist

- [ ] Desk remains hero; chrome quiet (Cormorant empty headline, DM Sans UI, mono chassis).
- [ ] **No Solid mode toggle** in chrome, settings, or empty state.
- [ ] Tokens only: ink, amber (melt/warm), ice (set), hazard (clear), champagne metal rim — no purple/glow spam.
- [ ] Phone: desk-only; Press ≥44px; no scrollbar chrome.
- [ ] Heat/Cool stay vessel-physical; solid is re-label + material + reveal, not a second physics engine.
- [ ] One primary CTA (Cast/Mix).
- [ ] `prefers-reduced-motion`: hard-cut set puck; no aura dance.
- [ ] Competition education never skins the tin.
- [ ] Anti-patterns: no floating scent emoji badges on the puck; no confetti on Cast.

---

## 13. Open decisions for Neil

1. **Default empty desk:** Neutral (beaker *or* tin copy) vs soft tin-bias after solid session? Recommendation: **Neutral empty; tin-bias only after solid session / Alyra marketing entry.**
2. **Primary CTA copy:** `Cast` vs keep `Mix` with subtitle “set into balm”? Recommendation: **Cast** when solid detected — clearer category.
3. **Lid in P0 reveal:** Full lid close or open-pan only? Recommendation: **Open pan + snap seat in P0; lid arc in P1** (phone height).
4. **Ambiguous brief:** Always ask once vs default solid for perfume-domain? Recommendation: **Ask once when `confidence: low`; default solid when perfume wear brief is clear.**
5. **Wear aura:** Ship in P1 or cut if QA reads game juice?

---

## 14. Related docs

- `DESIGN.md` — vessel rail, Heat/Cool, motion, phone split  
- `branding/BRAND_BRIEF.md` — “Compose scent. Press to skin.”  
- `docs/alyra-perfumer-agentic-plan.md` — India mindset, solid tools, Open in Lab  
- `docs/alyra-perfumer-brain-readiness.md` — solid-first wedge, chassis literacy  
- `docs/superpowers/specs/2026-08-09-alyra-perfumer-agentic-design.md`  
- `docs/superpowers/specs/2026-08-10-lab-chrome-simplification-design.md` — keep chrome calm while adding tin  
- Vault MOC: `/Users/neil/Documents/chemlab/Agents/Alyra/Plans.md`  

---

*Plan only. No deploy. No ntfy. No product code in this pass. Implementation starts only when Neil picks P0 scope + open decisions.*
