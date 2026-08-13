export type DemoLevel = "Tiny" | "Bigger" | "Full atelier";

export type FormulaRow = {
  name: string;
  percent: number;
  note?: string;
};

export type SampleOutput =
  | {
      kind: "formula";
      title: string;
      vibe: string;
      rows: FormulaRow[];
      costInr: string;
      mapped: number;
      unmapped?: string[];
      footer?: string;
    }
  | {
      kind: "build";
      title: string;
      steps: string[];
      result: string;
    }
  | {
      kind: "refine";
      title: string;
      before: string[];
      after: string[];
      delta: string;
    }
  | {
      kind: "chem";
      title: string;
      problem: string;
      onDesk: string[];
      result: string;
    };

export type GuideDemo = {
  id: string;
  level: DemoLevel;
  title: string;
  win: string;
  prompt: string;
  sample: SampleOutput;
};

export const DEMOS: GuideDemo[] = [
  {
    id: "tiny-citrus",
    level: "Tiny",
    title: "One-line cologne",
    win: "A short Plan with 4 Lab oils, %, and a ₹ band. Desk stays empty until you Build.",
    prompt: "fresh citrus cologne for Mumbai heat",
    sample: {
      kind: "formula",
      title: "Mumbai heat citrus",
      vibe: "Cold peel, clean linen, polite projection for AC + outdoor lunch.",
      rows: [
        { name: "Bergamot oil", percent: 28, note: "top" },
        { name: "Sweet orange", percent: 18, note: "top" },
        { name: "Hedione", percent: 22, note: "heart" },
        { name: "Iso E Super", percent: 32, note: "base" },
      ],
      costInr: "₹420–₹580 trial",
      mapped: 4,
      footer: "Hit Build when you like it. Timed pours land on the wood.",
    },
  },
  {
    id: "tiny-office",
    level: "Tiny",
    title: "Office-safe clean",
    win: "A soft musk-citrus Plan that reads polite in meetings, not sweet.",
    prompt: "clean office scent, not sweet, lasts through meetings",
    sample: {
      kind: "formula",
      title: "Meeting musk",
      vibe: "Skin-close freshness. Survives Bangalore AC without shouting.",
      rows: [
        { name: "Lemon oil", percent: 16, note: "top" },
        { name: "Dihydromyrcenol", percent: 20, note: "top" },
        { name: "Galaxolide", percent: 34, note: "base" },
        { name: "Cashmeran", percent: 18, note: "base" },
        { name: "Hedione", percent: 12, note: "heart" },
      ],
      costInr: "₹510–₹690 trial",
      mapped: 5,
    },
  },
  {
    id: "bigger-edp",
    level: "Bigger",
    title: "EDP with longevity target",
    win: "A fuller Plan: note pyramid, humidity longevity, budget call, Lab mapping.",
    prompt: `Make a fresh citrus cologne for Indian summer.
Notes: bergamot + orange top, light floral heart, soft musk base.
Format: EDP (not solid). Longevity target: 6 hours in humidity.
Budget: under ₹800 for a small trial pour.`,
    sample: {
      kind: "formula",
      title: "Summer EDP · 6h target",
      vibe: "Bergamot lift, soft floral heart, musk drydown that holds in humidity.",
      rows: [
        { name: "Bergamot oil", percent: 22, note: "top" },
        { name: "Sweet orange", percent: 12, note: "top" },
        { name: "Linalool", percent: 10, note: "heart" },
        { name: "Hedione", percent: 18, note: "heart" },
        { name: "Galaxolide", percent: 24, note: "base" },
        { name: "Iso E Super", percent: 14, note: "base" },
      ],
      costInr: "₹640–₹780 trial",
      mapped: 6,
      footer: "Format locked to EDP. Longevity call: ~6h in humid air (teaching estimate).",
    },
  },
  {
    id: "bigger-solid",
    level: "Bigger",
    title: "Solid balm, not spray",
    win: "A solid-perfume Plan with warmer woods. Format stays balm language.",
    prompt: `I want a solid perfume (balm), not spray.
Vibe: sandalwood + soft spice, close to skin, office-safe.
Avoid heavy animalic notes. Keep cost under ₹600.
Plan only. Map everything to Lab inventory.`,
    sample: {
      kind: "formula",
      title: "Pocket sandal solid",
      vibe: "Warm wood on skin. Intimate sillage. Travel-safe balm.",
      rows: [
        { name: "Sandalwood oil", percent: 30, note: "base" },
        { name: "Cardamom", percent: 12, note: "heart" },
        { name: "Benzyl acetate", percent: 14, note: "heart" },
        { name: "Vanillin", percent: 8, note: "base" },
        { name: "Iso E Super", percent: 36, note: "base" },
      ],
      costInr: "₹480–₹590 trial",
      mapped: 5,
      footer: "Solid / balm format called out in the Plan. Ready when you press Build.",
    },
  },
  {
    id: "build-desk",
    level: "Bigger",
    title: "Plan → Build on the desk",
    win: "After you approve, timed pours hit the wood with narration. Stop or Undo anytime.",
    prompt: `Plan a simple fresh citrus cologne using only Lab inventory.
3–6 materials. Show % and ₹ estimate.
Keep it light for Indian heat. Stop after Plan. I'll hit Build.`,
    sample: {
      kind: "build",
      title: "What Build looks like",
      steps: [
        "Place beaker on the desk",
        "Pour Bergamot oil · 28%",
        "Pour Sweet orange · 18%",
        "Pour Hedione · 22%",
        "Pour Iso E Super · 32%",
        "Narration: bright top, clean drydown",
      ],
      result:
        "Vessel filled. Formula saved to the Plan. Refine in Chat, or Mix to read Information.",
    },
  },
  {
    id: "refine-diff",
    level: "Bigger",
    title: "Refine what is on the desk",
    win: "Send desk to Chat, paste a refine brief, get a clearer before → after Plan.",
    prompt: `I sent my current desk blend to Chat.
Refine the Plan: keep the woody base, brighten the top for Mumbai humidity,
trim anything unmapped, and stay under ₹1,100.
Show the revised Plan with % and mapping. Wait for Build.`,
    sample: {
      kind: "refine",
      title: "Refine diff",
      before: [
        "Oud accord 12% (unmapped)",
        "Sandalwood 28%",
        "Bergamot 10%",
        "Trial ~ ₹1,340",
      ],
      after: [
        "Oud removed (not in Lab stock)",
        "Sandalwood 30%",
        "Bergamot 18% + Lemon 8%",
        "Iso E Super 24%",
        "Trial ~ ₹980",
      ],
      delta: "Brighter top. Inventory-only. Under ₹1,100. Build when ready.",
    },
  },
  {
    id: "chem-desk",
    level: "Bigger",
    title: "Chem problem on the desk",
    win: "Not only perfume. Pour real Lab chemicals, Mix, and get an Information explanation.",
    prompt: "Walk me through making a simple copper sulfate solution on the desk, step by step.",
    sample: {
      kind: "chem",
      title: "Desk + Information result",
      problem: "Demonstrate dissolving CuSO₄·5H₂O in water, then Mix for the equation.",
      onDesk: [
        "Place beaker",
        "Pour water",
        "Add copper sulfate crystals",
        "Stir → blue solution forms",
        "Mix → Information opens with the reaction notes",
      ],
      result:
        "Blue well on ebony wood. Information explains hydration / dissolution. Stars if it is a first discovery.",
    },
  },
  {
    id: "full-atelier",
    level: "Full atelier",
    title: "Full component brief",
    win: "Production-ready Plan: Goal / Type / Inspiration / Constraints → % table, mapping, ₹ band.",
    prompt: `### Perfume brief (component)

Goal: Signature scent for evening dinners in Delhi winter. Warm, not loud.
Type: EDP · unisex · 10 materials max
Inspiration: Cardamom chai steam + sandalwood cupboard + clean cotton scarf
Constraints:
- India market: moderate projection, longevity ≥ 7h indoors
- Budget: ₹800–₹1,500 trial
- Prefer Lab-mapped stock; list unmapped honestly
- Avoid candy gourmand and animalic leather
- IFRA-teaching awareness: keep heavy oils conservative

Deliverable: Plan only. Materials, %, Lab mapping, ₹ band.
I will press Build when the Plan looks right.`,
    sample: {
      kind: "formula",
      title: "Delhi winter dinner · EDP",
      vibe: "Cardamom steam, sandal cupboard, cotton scarf. Warm indoors, never loud.",
      rows: [
        { name: "Cardamom", percent: 8, note: "top" },
        { name: "Bergamot oil", percent: 12, note: "top" },
        { name: "Benzyl acetate", percent: 10, note: "heart" },
        { name: "Hedione", percent: 14, note: "heart" },
        { name: "Sandalwood oil", percent: 22, note: "base" },
        { name: "Iso E Super", percent: 18, note: "base" },
        { name: "Galaxolide", percent: 10, note: "base" },
        { name: "Vanillin", percent: 6, note: "base" },
      ],
      costInr: "₹920–₹1,280 trial",
      mapped: 8,
      unmapped: [],
      footer:
        "All lines Lab-mapped. Longevity call: ≥7h indoors (teaching). Press Build to pour.",
    },
  },
  {
    id: "full-monsoon",
    level: "Full atelier",
    title: "Monsoon solid atelier",
    win: "Solid-balm Plan with woody-green profile and honest unmapped callouts.",
    prompt: `Goal: Skin-close solid perfume for monsoon evenings.
Type: Solid balm (not EDP). Intimate sillage.
Inspiration: wet teak + crushed green leaves after rain in Kochi.
Constraints:
- Prefer Lab-mapped oils only; call out anything unmapped
- Avoid loud gourmand / vanilla cake
- Warmth over sweetness
- Budget: ≤ ₹700
- Longevity on skin: 4+ hours
Output: Plan with materials, %, mapping, ₹. Wait for my Build.`,
    sample: {
      kind: "formula",
      title: "Kochi rain solid",
      vibe: "Wet teak, crushed green, skin-close. No cake vanilla.",
      rows: [
        { name: "Vetiver", percent: 22, note: "base" },
        { name: "Sandalwood oil", percent: 20, note: "base" },
        { name: "Linalool", percent: 14, note: "heart" },
        { name: "Dihydromyrcenol", percent: 12, note: "top" },
        { name: "Iso E Super", percent: 24, note: "base" },
        { name: "Patchouli", percent: 8, note: "base" },
      ],
      costInr: "₹560–₹690 trial",
      mapped: 6,
      unmapped: ["Wet teak absolute (not in stock → remapped to vetiver + sandal)"],
      footer: "Solid format. Intimate sillage. Build when the Plan looks right.",
    },
  },
];
