import { getHouseSku, type HouseSkuId, type OccasionChip } from "./houseSkus";
import {
  climateHeuristic,
  type WearCardKind,
  type WearLens,
} from "./wearLens";

export interface WearCardPayload {
  kind: WearCardKind;
  title: string;
  body: string;
  /** Wearable pyramid — house names, never CAS. */
  notes?: { top: string[]; heart: string[]; base: string[] };
  climate?: string;
}

const OCCASION_LINE: Record<OccasionChip, string> = {
  office:
    "An AC office will hold the opening brighter; stepping into outdoor heat blooms the heart. Press wrists only, not the collar if you sit close.",
  evening:
    "Evening air is slower. Press neck and behind the ear; let body heat do the work. Re-press after dinner if you want it close again.",
  wedding:
    "Humid wedding air opens a balm faster than a hall with AC. Press wrist and behind the ear, skip silk and pale fabric. Re-press after the pheras; the tin lives in a pocket.",
  skin:
    "Just skin: pulse points, a little. Warm it on the fingertip first. It settles in seconds and stays close, not an elevator cloud.",
};

function heatLead(climate: string): string {
  return climate.charAt(0).toUpperCase() + climate.slice(1);
}

export function buildWearCard(opts: {
  skuId: HouseSkuId;
  kind: WearCardKind;
  lens: WearLens;
  occasion?: OccasionChip | null;
  now?: Date;
}): WearCardPayload {
  const sku = getHouseSku(opts.skuId);
  const climate = climateHeuristic(opts.now);
  const occ = opts.occasion ?? null;
  const name = sku.id === "generic" ? "the balm" : sku.name;

  if (opts.kind === "notes") {
    return {
      kind: "notes",
      title: "What you are smelling",
      body:
        sku.id === "generic"
          ? "Brightness on the open, a quieter heart, musk on skin. House names, not a formula sheet."
          : `${sku.name} wears as ${sku.notes.top[0]} first, then ${sku.notes.heart[0]}, then ${sku.notes.base[sku.notes.base.length - 1]} on skin. Never sharp, never loud.`,
      notes: sku.notes,
      climate,
    };
  }

  if (opts.kind === "story") {
    return {
      kind: "story",
      title: sku.name,
      body: sku.story,
      climate,
    };
  }

  if (opts.kind === "layer") {
    return {
      kind: "layer",
      title: "Layering",
      body:
        sku.id === "generic"
          ? "Unscented moisturizer underneath if skin is dry. Do not stack a loud spray on top in humid heat. The balm is meant to sit close. Another Alyra compact is enough; skip fabric in monsoon."
          : `${sku.name} likes unscented moisturizer, not a competing spray. In ${climate}, keep it to pulse points. Silk and pale fabric pick up balm; press skin, not cloth.`,
      climate,
    };
  }

  // WearCard — India heat is the first sentence.
  const lead = `${heatLead(climate)} changes how ${name} sits on skin.`;
  const ritual =
    "Press a fingertip across the pan. Warm it. Pulse points: wrists, neck, behind the ear. Re-press from the tin; a little is enough.";
  const occasion = occ ? OCCASION_LINE[occ] : ritual;
  const silk =
    occ === "wedding" || occ === "office"
      ? ""
      : " Keep it off silk in the humidity.";

  let extra = "";
  if (opts.lens === "care") {
    extra =
      " It will soften in a hot bag and firm again in AC. That is a balm, not a fault. Lid on. Airport-safe. Refill the pan; keep the case.";
  } else if (opts.lens === "weather") {
    extra =
      " Sweat does not wash it off the way alcohol spray vanishes. Re-press after the commute.";
  }

  return {
    kind: "wear",
    title: occ ? OCCASION_LINE_TITLE[occ] : "Press. Warm. Wear.",
    body: `${lead} ${occasion}${silk}${extra}`.replace(/\s+/g, " ").trim(),
    climate,
  };
}

const OCCASION_LINE_TITLE: Record<OccasionChip, string> = {
  office: "Office",
  evening: "Evening",
  wedding: "Wedding",
  skin: "On skin",
};

const CRAFT_RE =
  /galaxolide|hhcb|ifra|\u20b9|cas\b|\d+\.\d+\s*%/i;

/** Default Wear copy must never dump chemist craft. */
export function copyLooksLikeCraft(text: string): boolean {
  return CRAFT_RE.test(text);
}
