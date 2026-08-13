import {
  SOLID_BRIEF_RE,
  LIQUID_BRIEF_RE,
  markSolidSession,
} from "./solidDetect";
import type { PerfumeFormatChoice } from "./types";

export type { PerfumeFormatChoice };

export function inferFormatFromText(text: string): PerfumeFormatChoice | null {
  const t = text.trim();
  if (!t) return null;
  const solid = SOLID_BRIEF_RE.test(t);
  const liquid = LIQUID_BRIEF_RE.test(t);
  const oil =
    /\b(attar|ittar|perfume\s+oil|oil\s+perfume|roll[- ]?on)\b/i.test(t) &&
    !solid;
  if (solid && liquid) return null;
  if (solid) return "Solid";
  if (oil) return "Oil";
  if (liquid) return "EDP";
  return null;
}

/** Ask once per brief, after the first user turn, until they answer. */
export function shouldAskFormatFork(opts: {
  formatChoice?: PerfumeFormatChoice | null;
  userTexts: string[];
}): boolean {
  if (opts.formatChoice) return false;
  if (opts.userTexts.some((t) => inferFormatFromText(t))) return false;
  return opts.userTexts.length >= 1;
}

export function briefTypeFromChoice(
  choice: PerfumeFormatChoice | null | undefined,
): "EDP" | "Oil" | "Solid" | "" {
  return choice ?? "";
}
