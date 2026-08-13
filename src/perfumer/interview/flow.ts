import type {
  ClimateHint,
  InterviewAnswers,
  InterviewProfileSlice,
  InterviewSlot,
  InterviewSurface,
  InterviewTurn,
  StartInterviewOpts,
} from "./types";
import { ALL_SLOTS, echoClause, pickChips, pickOpening, pickPrompt } from "./bank";
import {
  applyChipToAnswers,
  applyMinimumFallbacks,
  extractAnswersFromText,
  filledSlotCount,
  hasMinimumBrief,
  looksLikeRichBrief,
  looksLikeSkip,
  mergeAnswers,
  slotFilled,
} from "./extract";
import { interviewSeed, istHour, mulberry32, shuffleInPlace } from "./hash";

export const MAX_QUESTIONS = 10;
export const SOFT_TARGET = 6;

export function filledSlotsFromProfile(
  profile: InterviewProfileSlice | null | undefined,
): Set<InterviewSlot> {
  const filled = new Set<InterviewSlot>();
  if (!profile?.consentPersonalization) return filled;
  if ((profile.occasionDefaults || []).length) filled.add("occasion");
  if (
    profile.indiaCity ||
    (profile.climateHint && profile.climateHint !== "unknown")
  ) {
    filled.add("climate_city");
  }
  if (profile.skinSensitivity && profile.skinSensitivity !== "unspecified") {
    filled.add("skin");
  }
  if (
    profile.intensityPreference &&
    profile.intensityPreference !== "unspecified"
  ) {
    filled.add("intensity");
  }
  if (
    (profile.scentFamiliesLiked || []).length ||
    (profile.notesMentioned || []).length
  ) {
    filled.add("likes");
  }
  if ((profile.scentFamiliesDisliked || []).length) filled.add("dislikes");
  if (profile.formatPreference && profile.formatPreference !== "unspecified") {
    filled.add("format");
  }
  if ((profile.timeOfDayDefaults || []).length) filled.add("time_of_day");
  return filled;
}

export function answersFromProfile(
  profile: InterviewProfileSlice | null | undefined,
): InterviewAnswers {
  if (!profile?.consentPersonalization) return {};
  return {
    occasion: profile.occasionDefaults?.[0],
    indiaCity: profile.indiaCity,
    climateHint: (profile.climateHint as ClimateHint) || undefined,
    skinSensitivity:
      profile.skinSensitivity && profile.skinSensitivity !== "unspecified"
        ? (profile.skinSensitivity as InterviewAnswers["skinSensitivity"])
        : undefined,
    intensityPreference:
      profile.intensityPreference &&
      profile.intensityPreference !== "unspecified"
        ? (profile.intensityPreference as InterviewAnswers["intensityPreference"])
        : undefined,
    scentFamiliesLiked: profile.scentFamiliesLiked,
    scentFamiliesDisliked: profile.scentFamiliesDisliked,
    notesMentioned: profile.notesMentioned,
    formatPreference:
      profile.formatPreference && profile.formatPreference !== "unspecified"
        ? (profile.formatPreference as InterviewAnswers["formatPreference"])
        : undefined,
    timeOfDayDefaults: profile.timeOfDayDefaults as InterviewAnswers["timeOfDayDefaults"],
  };
}

export function skipFormat(surface: InterviewSurface, skuId?: string | null): boolean {
  return surface === "wear" && Boolean(skuId && skuId !== "");
}

export function buildSlotOrder(opts: {
  seed: number;
  surface: InterviewSurface;
  skuId?: string | null;
  profileFilled: Set<InterviewSlot>;
  sessionFilled: Set<InterviewSlot>;
  now?: Date;
}): InterviewSlot[] {
  const skip = new Set<InterviewSlot>([
    ...opts.profileFilled,
    ...opts.sessionFilled,
  ]);
  if (skipFormat(opts.surface, opts.skuId)) skip.add("format");

  const remaining = ALL_SLOTS.filter((s) => !skip.has(s));
  const rand = mulberry32(opts.seed);
  shuffleInPlace(remaining, rand);

  const hour = istHour(opts.now);
  const boost: InterviewSlot[] = [];
  if (hour >= 11 && hour < 17) {
    if (remaining.includes("climate_city")) boost.push("climate_city");
    else if (remaining.includes("intensity")) boost.push("intensity");
  } else if (hour >= 7 && hour < 11) {
    if (remaining.includes("time_of_day")) boost.push("time_of_day");
  } else if (hour >= 17) {
    if (remaining.includes("occasion")) boost.push("occasion");
  }

  const missingFirst = remaining.filter((s) => !opts.profileFilled.has(s));
  const ordered: InterviewSlot[] = [];
  for (const s of boost) {
    if (missingFirst.includes(s) && !ordered.includes(s)) ordered.push(s);
  }
  for (const s of missingFirst) {
    if (!ordered.includes(s)) ordered.push(s);
  }
  return ordered;
}

export function shouldCompose(opts: {
  answers: InterviewAnswers;
  questionCount: number;
  skipRequested: boolean;
  /** Slots answered this session, not inherited from profile. */
  sessionAnswered: number;
  remaining: number;
}): boolean {
  if (opts.skipRequested) return true;
  if (opts.questionCount >= MAX_QUESTIONS) return true;
  if (opts.remaining <= 0 && opts.questionCount >= 1) return true;
  if (opts.sessionAnswered >= SOFT_TARGET) return true;
  if (opts.questionCount >= 8 && hasMinimumBrief(opts.answers)) return true;
  return false;
}

export function climateFallback(now = new Date()): ClimateHint {
  const hour = istHour(now);
  const month = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      month: "numeric",
    }).format(now),
  );
  const monsoon = month >= 6 && month <= 9;
  if (monsoon) return "hot_humid";
  if (hour >= 11 && hour < 17) return "hot_humid";
  return "hot_humid";
}

export function nextTurn(opts: {
  seed: number;
  slot: InterviewSlot;
  lastEcho?: string;
  questionIndex: number;
}): InterviewTurn {
  const prompt = pickPrompt(opts.slot, opts.seed + opts.questionIndex * 17, opts.lastEcho);
  const chips = pickChips(opts.slot, opts.seed + opts.questionIndex * 31, 4);
  return {
    act: "interview",
    slot: opts.slot,
    prompt,
    chips,
    echo: opts.lastEcho,
  };
}

export function openingFor(opts: StartInterviewOpts & { seed: number; lastOpeningId?: string | null }) {
  return pickOpening({
    seed: opts.seed,
    surface: opts.surface,
    skuId: opts.skuId,
    knownCity:
      opts.profile?.consentPersonalization ? opts.profile.indiaCity : null,
    lastOpeningId: opts.lastOpeningId,
  });
}

export function seedFor(opts: StartInterviewOpts, sessionId: string): number {
  return interviewSeed(opts.uid, sessionId, opts.now);
}

export {
  applyChipToAnswers,
  applyMinimumFallbacks,
  extractAnswersFromText,
  filledSlotCount,
  hasMinimumBrief,
  looksLikeRichBrief,
  looksLikeSkip,
  mergeAnswers,
  slotFilled,
};

export { ALL_SLOTS } from "./bank";

export function sessionFilledSet(answers: InterviewAnswers): Set<InterviewSlot> {
  const set = new Set<InterviewSlot>();
  for (const slot of ALL_SLOTS) {
    if (slotFilled(slot, answers)) set.add(slot);
  }
  return set;
}

export function chipEcho(
  slot: InterviewSlot,
  typed?: string,
  label?: string,
): string | undefined {
  return echoClause(slot, typed, label);
}
