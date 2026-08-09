import type { GuideSnippet } from "./CopySnippet";

/** One-liners — paste into Chat to get a first Plan fast. */
export const STARTER_ONELINERS: GuideSnippet[] = [
  {
    id: "s1",
    label: "Mumbai heat cologne",
    difficulty: "Starter",
    outcome: "Light citrus Plan with Lab-mapped oils and a ₹ cost band.",
    text: "fresh citrus cologne for Mumbai heat",
  },
  {
    id: "s2",
    label: "Monsoon woody",
    difficulty: "Starter",
    outcome: "Damp-wood / vetiver-leaning Plan sized for humid evenings.",
    text: "soft woody perfume for rainy evenings in Kerala",
  },
  {
    id: "s3",
    label: "Office clean",
    difficulty: "Starter",
    outcome: "Clean musk-citrus Plan that stays polite in an AC office.",
    text: "clean office scent — not sweet, lasts through meetings",
  },
  {
    id: "s4",
    label: "Festival floral",
    difficulty: "Starter",
    outcome: "Jasmine-forward floral Plan with India-market note language.",
    text: "jasmine floral solid perfume for Diwali nights",
  },
];

/** Mid briefs — notes, format, longevity, budget. */
export const MID_BRIEFS: GuideSnippet[] = [
  {
    id: "m1",
    label: "Citrus + longevity",
    difficulty: "Intermediate",
    outcome: "EDP-style Plan with citrus top, soft musk drydown, ~6h target.",
    text: `Make a fresh citrus cologne for Indian summer.
Notes: bergamot + orange top, light floral heart, soft musk base.
Format: EDP (not solid). Longevity target: 6 hours in humidity.
Budget: under ₹800 for a small trial pour.`,
  },
  {
    id: "m2",
    label: "Solid vs spray",
    difficulty: "Intermediate",
    outcome: "Solid-perfume Plan with warmer woods; explicit solid format.",
    text: `I want a solid perfume (balm), not spray.
Vibe: sandalwood + soft spice, close to skin, office-safe.
Avoid heavy animalic notes. Keep cost under ₹600.
Plan only — map everything to Lab inventory.`,
  },
  {
    id: "m3",
    label: "Groom wedding",
    difficulty: "Intermediate",
    outcome: "Layered floral-woody Plan aimed at all-day outdoor heat.",
    text: `Wedding guest scent for outdoor baraat in Rajasthan heat.
Prefer rose + saffron hints without smelling like attar shop overload.
Longevity matters more than projection. Budget around ₹1,200.`,
  },
];

/** Full structured briefs — component-style Goal / Type / Inspiration. */
export const FULL_BRIEFS: GuideSnippet[] = [
  {
    id: "f1",
    label: "Structured citrus EDP",
    difficulty: "Advanced",
    outcome: "Full Plan with % lines, Lab mapping, and ₹ estimate ready to Build.",
    text: `Goal: Fresh daytime cologne for Mumbai commute + office.
Type: Eau de Parfum (spray), unisex, 8–12 materials max.
Inspiration: cold citrus peel over clean linen; not candy-sweet.
Constraints:
- Top: bergamot / citrus family from Lab stock
- Heart: soft florals only if needed for lift
- Base: light musk / woody — no heavy oud
- Longevity: 5–7 hours in humidity
- Budget: ≤ ₹900 for the trial formula
- India market: polite projection, heat-stable
Output: Plan with % and Lab inventory mapping. Do not Build until I say so.`,
  },
  {
    id: "f2",
    label: "Monsoon solid",
    difficulty: "Advanced",
    outcome: "Solid-balm Plan with woody-green profile and honest unmapped callouts.",
    text: `Goal: Skin-close solid perfume for monsoon evenings.
Type: Solid balm (not EDP). Intimate sillage.
Inspiration: wet teak + crushed green leaves after rain in Kochi.
Constraints:
- Prefer Lab-mapped oils only; call out anything unmapped
- Avoid loud gourmand / vanilla cake
- Warmth over sweetness
- Budget: ≤ ₹700
- Longevity on skin: 4+ hours
Output: Plan with materials, %, mapping, ₹. Wait for my Build.`,
  },
];

/** Component-style prompts that reliably produce a Buildable Plan. */
export const COMPONENT_PROMPTS: GuideSnippet[] = [
  {
    id: "c1",
    label: "Quick Plan → Build path",
    difficulty: "Starter",
    outcome: "A short citrus Plan you can approve and Build in one pass.",
    text: `Plan a simple fresh citrus cologne using only Lab inventory.
3–6 materials. Show % and ₹ estimate.
Keep it light for Indian heat. Stop after Plan — I'll hit Build.`,
  },
  {
    id: "c2",
    label: "Note pyramid brief",
    difficulty: "Intermediate",
    outcome: "Pyramid-structured Plan (top/heart/base) with Lab IDs where possible.",
    text: `Build me a Plan with a clear note pyramid:

Goal: Clean musk-citrus for daily office wear in Bangalore AC + outdoor lunch.
Type: EDP
Top: citrus peel freshness
Heart: soft white floral or clean tea-like lift
Base: skin musk + light wood
Constraints: under ₹1,000 · no oud · no heavy spice · map to Lab chemicals
Return: materials table with %, Lab mapping, ₹ total. Do not pour yet.`,
  },
  {
    id: "c3",
    label: "Refine-from-desk style",
    difficulty: "Intermediate",
    outcome: "Refinement brief you can paste after Send desk to Chat.",
    text: `I sent my current desk blend to Chat.
Refine the Plan: keep the woody base, brighten the top for Mumbai humidity,
trim anything unmapped, and stay under ₹1,100.
Show the revised Plan with % and mapping. Wait for Build.`,
  },
  {
    id: "c4",
    label: "Full component brief",
    difficulty: "Advanced",
    outcome: "Production-ready Plan: Goal / Type / Inspiration / Constraints → Build CTA.",
    text: `### Perfume brief (component)

**Goal:** Signature scent for evening dinners in Delhi winter — warm, not loud.
**Type:** EDP · unisex · 10 materials max
**Inspiration:** Cardamom chai steam + sandalwood cupboard + clean cotton scarf
**Constraints:**
- India market: moderate projection, longevity ≥ 7h indoors
- Budget: ₹800–₹1,500 trial
- Prefer Lab-mapped stock; list unmapped honestly
- Avoid candy gourmand and animalic leather
- IFRA-teaching awareness: keep heavy oils conservative

**Deliverable:** Plan only — materials, %, Lab mapping, ₹ band.
I will press Build when the Plan looks right.`,
  },
  {
    id: "c5",
    label: "Solid perfume factory brief",
    difficulty: "Advanced",
    outcome: "Solid-format Plan with process notes you can Build onto the wood desk.",
    text: `### Component brief — solid perfume

**Goal:** Pocket solid for travel — subtle floral-woody, airport-safe.
**Type:** Solid balm (not spray)
**Inspiration:** Fresh mogra at dusk + soft sandal
**Constraints:**
- Format must be solid / balm language in the Plan
- Longevity on pulse points: 4–6 hours
- Budget ≤ ₹650
- Heat-stable for summer suitcase
- Map to Lab inventory; no invented chemicals

Plan with % + ₹. Narrate Build steps when I approve.`,
  },
];
