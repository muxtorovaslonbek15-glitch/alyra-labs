import type { OccasionChip } from "./houseSkus";

export type WearLens =
  | "wear"
  | "occasion"
  | "weather"
  | "mood"
  | "notes"
  | "story"
  | "layer"
  | "care";

export type WearCardKind = "wear" | "notes" | "story" | "layer";

const LENS_ORDER: WearLens[] = [
  "wear",
  "occasion",
  "weather",
  "notes",
  "story",
  "layer",
  "care",
  "mood",
];

export function cardKindForLens(lens: WearLens): WearCardKind {
  if (lens === "notes") return "notes";
  if (lens === "story" || lens === "mood") return "story";
  if (lens === "layer") return "layer";
  return "wear";
}

export function inferLensFromText(text: string): WearLens | null {
  const t = text.trim().toLowerCase();
  if (!t) return null;

  if (
    /\b(melt|lid|refill|travel|bag|airport|spill|sting)\b/.test(t)
  ) {
    return "care";
  }
  if (
    /\b(layer|stack|moisturi[sz]er|hair|fabric|silk|another compact|pair)\b/.test(
      t,
    )
  ) {
    return "layer";
  }
  if (
    /\b(smell|smelling|notes?|musk|rose|berry|cedar|oud|pyramid|too sweet|too loud)\b/.test(
      t,
    )
  ) {
    return "notes";
  }
  if (
    /\b(story|about this|gift|gifting|what is this|tell me)\b/.test(t)
  ) {
    return "story";
  }
  if (
    /\b(monsoon|humid|humidity|delhi|heat|sweat|ac\b|weather|summer|rain)\b/.test(
      t,
    )
  ) {
    return "weather";
  }
  if (
    /\b(office|wedding|commute|dinner|festival|evening|date|work)\b/.test(t)
  ) {
    return "occasion";
  }
  if (/\b(quiet|magnetic|fresh|warm|mood|feel)\b/.test(t)) {
    return "mood";
  }
  if (
    /\b(how do i|use this|press|pulse|re-?press|wear|skin|wrist|neck)\b/.test(
      t,
    )
  ) {
    return "wear";
  }
  return null;
}

export function lensFromChip(chip: OccasionChip): WearLens {
  if (chip === "skin") return "wear";
  return "occasion";
}

/**
 * Exactly one lens per turn. Do not repeat the same lens twice in a row
 * unless this turn’s text asked for that lens again.
 */
export function pickWearLens(opts: {
  text?: string;
  chip?: OccasionChip | null;
  lastLenses: WearLens[];
  /** First useful reply in a Wear session → WearCard. */
  firstReply?: boolean;
}): WearLens {
  const last = opts.lastLenses[opts.lastLenses.length - 1];
  const fromText = opts.text ? inferLensFromText(opts.text) : null;

  let picked: WearLens;
  if (opts.firstReply) {
    picked = "wear";
  } else if (fromText) {
    picked = fromText;
  } else if (opts.chip) {
    picked = lensFromChip(opts.chip);
  } else {
    picked = "wear";
  }

  const sameQuestion = Boolean(fromText && fromText === last);
  if (last && picked === last && !sameQuestion) {
    picked =
      LENS_ORDER.find((l) => l !== last) ??
      (picked === "wear" ? "story" : "wear");
  }
  return picked;
}

/** Afternoon heat vs late evening — client heuristic, no PII. */
export function climateHeuristic(now = new Date()): string {
  const h = now.getHours();
  const m = now.getMonth();
  const monsoon = m >= 5 && m <= 8;
  if (h >= 11 && h < 17) {
    return monsoon
      ? "monsoon afternoon humidity"
      : "afternoon heat";
  }
  if (h >= 17 && h < 22) {
    return monsoon ? "warm evening after rain" : "late evening";
  }
  if (h >= 22 || h < 6) return "night air, still close";
  return monsoon ? "humid morning" : "cool morning";
}
