import type { ProductGoal, GoalStep } from "@/domains/chemistry/data/goals";
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
import { getChemical } from "@/domains/chemistry/data/chemicals";
import type { SolidPerfumeFormula } from "./types";
import { playableSolidPerfumeFormulas } from "./catalog";

function mins(ids: string[]): Record<string, number> {
  return Object.fromEntries(ids.map((id) => [id, defaultPourMl(id)]));
}

function nameOf(id: string) {
  return getChemical(id)?.name ?? id;
}

function foIds(formula: SolidPerfumeFormula): string[] {
  return formula.labChemicalIds.filter(
    (id) => id !== "beeswax" && id !== formula.chassis.carrierId && id !== "plant-oil",
  );
}

function mixPred(formulaId: string) {
  return (r: { ok: boolean; explanationKey?: string }) =>
    Boolean(
      r.ok &&
        (r.explanationKey === "product-solid-perfume" ||
          r.explanationKey === `product-solid-perfume:${formulaId}`),
    );
}

/** Guided tin track: materials → melt → fragrance load → pour/cast → cool/set. */
export function solidFormulaToGoal(formula: SolidPerfumeFormula): ProductGoal {
  const wax = "beeswax";
  const carrier = formula.labChemicalIds.includes(formula.chassis.carrierId)
    ? formula.chassis.carrierId
    : formula.labChemicalIds.find((id) => id === "jojoba-oil" || id === "cct" || id === "plant-oil") ??
      "jojoba-oil";
  const fos = foIds(formula);
  const firstFo = fos[0] ?? "rose-oil";
  const chassisIds = [wax, carrier];
  const loadedIds = [...chassisIds, ...fos.slice(0, 3)];

  const steps: GoalStep[] = [
    placeEquipmentStep(`${formula.id}-tin`, {
      equipmentId: "tin",
      title: "Place a tin",
      instruction:
        "Put a solid-perfume tin on the desk — this is a balm, not a beaker spray.",
      nudge: "Alyra lives in a tin, not a flask.",
      clue: "Equipment → Tin (solid perfume pan).",
      almost: "Place a Tin from Inventory onto the desk.",
    }),
    pourStep(`${formula.id}-wax`, {
      title: "Add beeswax",
      instruction: `Pour ${defaultPourMl(wax)} ml beeswax into the tin — the chassis that sets at room temp and melts on skin.`,
      chemicalIds: [wax],
      minAmounts: mins([wax]),
      nudge: "Wax is the backbone of a solid.",
      clue: "Search Inventory for Beeswax.",
      almost: `Pour beeswax into the tin.`,
    }),
    pourStep(`${formula.id}-carrier`, {
      title: "Add the carrier oil",
      instruction: `Add ${defaultPourMl(carrier)} ml ${nameOf(carrier)} so the puck presses instead of crumbling.`,
      chemicalIds: chassisIds,
      minAmounts: mins(chassisIds),
      nudge: "Jojoba, CCT, or plant oil — alcohol stays out.",
      clue: `Search for ${nameOf(carrier)}.`,
      almost: `Pour ${nameOf(carrier)} into the same tin.`,
    }),
    heatStep(`${formula.id}-melt`, {
      chemicalIds: chassisIds,
      minAmounts: mins(chassisIds),
      title: "Melt the wax",
      instruction: "Attach Heat / Melt — beeswax must go clear in the oil before fragrance.",
      nudge: "Cold wax will not take a fragrance load.",
      clue: "Tap Melt on the tin (Heat on a beaker).",
      almost: "Tin Heat on, wax + carrier inside.",
    }),
    stirStep(`${formula.id}-stir-chassis`, {
      chemicalIds: chassisIds,
      minLevel: 1,
      title: "Stir the melt",
      instruction: "Stir once so wax and oil marry before you add scent.",
    }),
    pourStep(`${formula.id}-fo`, {
      title: `Fragrance load: ${nameOf(firstFo)}`,
      instruction: `Add ${defaultPourMl(firstFo)} ml ${nameOf(firstFo)}${
        fos.length > 1 ? ` (then ${fos.slice(1, 3).map(nameOf).join(", ")})` : ""
      }. Off-heat in real life so the oils do not flash — here, keep Melt on for the craft gate.`,
      chemicalIds: loadedIds,
      minAmounts: mins(loadedIds),
      nudge: "Heart/base notes hold in wax better than loud citrus.",
      clue: `Search ${nameOf(firstFo)}.`,
      almost: `Tin holds wax, ${nameOf(carrier)}, and ${fos.slice(0, 3).map(nameOf).join(" + ")}.`,
    }),
    stirStep(`${formula.id}-stir-load`, {
      chemicalIds: loadedIds,
      minLevel: 1,
      title: "Stir the load",
      instruction: "Stir so the fragrance oil disperses through the melt.",
    }),
    mixUntilStep(`${formula.id}-cast`, {
      title: "Pour / Cast into the cup",
      instruction:
        "Cast — the tin tilts, the metallic cup takes the ribbon, and you watch it set. Not Mix-in-a-beaker.",
      pred: mixPred(formula.id),
      nudge: "Cast is the pour. Watch the cup, not a spray bottle.",
      clue: "Select the tin, tap Cast.",
      almost: "Cast until the solid-perfume result appears; the cup-set sequence should start.",
    }),
    coolStep(`${formula.id}-set`, {
      chemicalIds: loadedIds,
      minAmounts: mins(loadedIds),
      title: "Cool / set the puck",
      instruction:
        "Attach Set / Cool so the molten gloss goes matte — the tin (and cup) should read as finished balm.",
      nudge: "Heat made the melt; cool locks the puck.",
      clue: "Tap Set (Cool) on the tin.",
      almost: "Cool on, full formula still in the tin.",
    }),
    {
      id: `${formula.id}-tin-still`,
      title: "Tin / cup still on the desk",
      instruction:
        "Keep the tin on the wood — Cast overlays the metallic cup; do not Clear board yet.",
      hints: [
        { tier: "nudge", text: "The cup is the reveal; the tin is still the vessel." },
        { tier: "clue", text: "You should still see a tin card on the desk." },
        { tier: "almost", text: "Re-place a Tin if you cleared the board." },
      ],
      check: (s) =>
        s.vessels.some((v) => v.equipmentId === "tin") &&
        vesselHas(s, loadedIds, { minAmounts: mins(loadedIds) }),
    },
  ];

  return {
    id: formula.id,
    title: `Make ${formula.title}`,
    tagline: `${formula.tagline} · ${steps.length} steps`,
    icon: "🕯️",
    category: "product",
    visualKind: "balm",
    rewardCaption: "Pressed. Warm. Wear.",
    productBlurb: `${formula.climateNote} ${formula.disclaimer}`,
    highlightItemIds: ["tin", ...formula.labChemicalIds],
    successBlurb: `You cast ${formula.title} — alcohol-free balm in a tin. Teaching reconstruction only.`,
    badgeId: `made-${formula.id}`,
    difficulty: "medium",
    steps,
  };
}

const cache = new Map<string, ProductGoal>();

export function getSolidFormulaGoal(id: string): ProductGoal | undefined {
  const formula = playableSolidPerfumeFormulas().find((f) => f.id === id);
  if (!formula) return undefined;
  let goal = cache.get(id);
  if (!goal) {
    goal = solidFormulaToGoal(formula);
    cache.set(id, goal);
  }
  return goal;
}

export function allSolidFormulaGoals(): ProductGoal[] {
  return playableSolidPerfumeFormulas().map((f) => getSolidFormulaGoal(f.id)!);
}

export function clearSolidFormulaGoalCache() {
  cache.clear();
}
