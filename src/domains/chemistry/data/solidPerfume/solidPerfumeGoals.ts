import type { ProductGoal } from "@/domains/chemistry/data/goals";
import {
  placeEquipmentStep,
  pourStep,
  heatStep,
  stirStep,
  coolStep,
  mixUntilStep,
  vesselHas,
} from "@/domains/chemistry/data/goalSteps";
import { defaultPourMl } from "@/desk/vesselContents";
import { SOLID_PERFUME_DISCLAIMER } from "./types";

function mins(...ids: string[]): Record<string, number> {
  return Object.fromEntries(ids.map((id) => [id, defaultPourMl(id)]));
}

const fmt = (id: string) => {
  const n = defaultPourMl(id);
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
};

const solidPred = (r: { ok: boolean; explanationKey?: string }) =>
  Boolean(r.ok && r.explanationKey?.startsWith("product-solid-perfume"));

/**
 * Hand-authored flagship tracks (quality bar of soap / ink).
 * Catalog formulas add more via solidPerfumeGoalFactory.
 */
export const SOLID_PERFUME_GOALS: ProductGoal[] = [
  {
    id: "solid-perfume",
    title: "Make a solid perfume tin",
    tagline: "Wax · oil · fragrance · cast",
    icon: "🕯️",
    category: "product",
    visualKind: "balm",
    rewardCaption: "Pressed. Warm. Wear.",
    productBlurb:
      "Alyra is a solid perfume brand: beeswax + jojoba (or CCT) + a scent load, melted, poured, cooled in a tin. Alcohol stays out. India heat wants a firmer wax. " +
      SOLID_PERFUME_DISCLAIMER,
    highlightItemIds: ["tin", "beeswax", "jojoba-oil", "rose-oil", "bunsen"],
    successBlurb:
      "You melted a wax chassis, loaded a floral, Cast into the cup, and set a balm — the Alyra ritual in teaching form.",
    badgeId: "made-solid-perfume",
    difficulty: "medium",
    steps: [
      placeEquipmentStep("solid-perfume-tin", {
        equipmentId: "tin",
        title: "Place a tin",
        instruction:
          "Put a solid-perfume tin on the ebony desk. This track is balm, not EDP.",
        nudge: "Skip the beaker — solids live in a pan.",
        clue: "Equipment → Tin.",
        almost: "Place a Tin from Inventory.",
      }),
      pourStep("solid-perfume-wax", {
        title: "Add beeswax (materials)",
        instruction: `Pour ${fmt("beeswax")} ml beeswax — the network that is solid in a ₹-summer bag and melts on a pulse point.`,
        chemicalIds: ["beeswax"],
        minAmounts: mins("beeswax"),
        nudge: "Wax first, then oil.",
        clue: "Search Beeswax.",
        almost: `Pour ${fmt("beeswax")} ml Beeswax into the tin.`,
      }),
      pourStep("solid-perfume-carrier", {
        title: "Add jojoba (materials)",
        instruction: `Pour ${fmt("jojoba-oil")} ml jojoba oil — stable, quiet, the usual DIY carrier (CCT is the lighter India-heat swap).`,
        chemicalIds: ["beeswax", "jojoba-oil"],
        minAmounts: mins("beeswax", "jojoba-oil"),
        nudge: "No ethanol. This is not cologne.",
        clue: "Fragrance / carriers → Jojoba Oil.",
        almost: `Pour ${fmt("jojoba-oil")} ml Jojoba Oil into the tin.`,
      }),
      heatStep("solid-perfume-melt", {
        chemicalIds: ["beeswax", "jojoba-oil"],
        minAmounts: mins("beeswax", "jojoba-oil"),
        title: "Melt the wax",
        instruction: "Turn Melt / Heat on until the wax goes clear in the oil. Real life: bain-marie, not a roaring flame.",
        nudge: "Unmelted wax will not take a fragrance load.",
        clue: "Tap Melt on the tin.",
        almost: "Heat attached; beeswax + jojoba in the tin.",
      }),
      stirStep("solid-perfume-stir-melt", {
        chemicalIds: ["beeswax", "jojoba-oil"],
        minLevel: 1,
        title: "Stir the chassis",
        instruction: "Stir the melt so wax and oil are one phase.",
      }),
      pourStep("solid-perfume-load", {
        title: "Fragrance load (rose)",
        instruction: `Add ${fmt("rose-oil")} ml rose oil as a teaching floral load. In a real tin, cool slightly first so the oil does not flash off.`,
        chemicalIds: ["beeswax", "jojoba-oil", "rose-oil"],
        minAmounts: mins("beeswax", "jojoba-oil", "rose-oil"),
        nudge: "Heart/base notes hold in wax; lemon will vanish.",
        clue: "Search Rose Oil.",
        almost: `Pour ${fmt("rose-oil")} ml Rose Oil into the hot chassis.`,
      }),
      stirStep("solid-perfume-stir-load", {
        chemicalIds: ["beeswax", "jojoba-oil", "rose-oil"],
        minLevel: 1,
        title: "Stir the load",
        instruction: "Stir so the rose disperses — then you can Cast.",
      }),
      mixUntilStep("solid-perfume-cast", {
        title: "Pour / Cast",
        instruction:
          "Cast the tin. The metallic cup slides in; a viscous ribbon fills it; you watch the balm set. That is the pour step.",
        pred: solidPred,
        nudge: "Cast, not Mix-in-a-flask.",
        clue: "Select the tin → Cast.",
        almost: "Cast until the solid-perfume product appears.",
      }),
      coolStep("solid-perfume-set", {
        chemicalIds: ["beeswax", "jojoba-oil", "rose-oil"],
        minAmounts: mins("beeswax", "jojoba-oil", "rose-oil"),
        title: "Cool / set",
        instruction:
          "Set / Cool the tin so the gloss goes matte. Lid language in real life: cover while cooling so water does not condense in the puck.",
        nudge: "Melt made it liquid; set makes it a tin.",
        clue: "Tap Set (Cool).",
        almost: "Cool attached; formula still in the tin.",
      }),
      {
        id: "solid-perfume-cup",
        title: "Tin / cup still on the desk",
        instruction:
          "Leave the tin in place — Cast already showed the cup overlay. Do not Clear board.",
        hints: [
          { tier: "nudge", text: "The cup is the spectacle; the tin is the object." },
          { tier: "clue", text: "A tin should still be on the wood." },
          { tier: "almost", text: "Re-place a Tin if missing." },
        ],
        check: (s) =>
          s.vessels.some((v) => v.equipmentId === "tin") &&
          vesselHas(s, ["beeswax", "jojoba-oil", "rose-oil"], {
            minAmounts: mins("beeswax", "jojoba-oil", "rose-oil"),
          }),
      },
    ],
  },
];

export const SOLID_PERFUME_GOAL_BY_ID: Record<string, ProductGoal> =
  Object.fromEntries(SOLID_PERFUME_GOALS.map((g) => [g.id, g]));
