import { CITY_CLIMATE } from "@/perfumer/profileSignals";
import type {
  ClimateHint,
  FormatPreference,
  IntensityPreference,
  InterviewAnswers,
  InterviewSlot,
  SkinSensitivity,
  TimeOfDay,
} from "./types";

const OCCASION_RE: Array<[RegExp, string]> = [
  [/wedding|shaadi|mehndi|baraat|phera/i, "wedding"],
  [/office|work day|ac office|desk/i, "office"],
  [/festive|diwali|eid|holi|festival/i, "festive"],
  [/commute|metro|travel|flight/i, "travel"],
  [/just skin|pulse|on skin only/i, "skin"],
  [/evening|dinner|night out|date/i, "evening"],
  [/daily|everyday/i, "daily"],
];

const CITY_RE = Object.keys(CITY_CLIMATE).sort((a, b) => b.length - a.length);

export function looksLikeSkip(text: string): boolean {
  return /\b(just make|surprise me|skip|enough|compose now|make me something|whatever you think)\b/i.test(
    text,
  );
}

export function looksLikeRichBrief(text: string): boolean {
  const t = text.trim();
  if (t.split(/\s+/).length >= 16) return true;
  const extracted = extractAnswersFromText(t);
  return filledSlotCount(extracted) >= 3;
}

export function extractAnswersFromText(
  text: string,
  currentSlot?: InterviewSlot,
): InterviewAnswers {
  const t = String(text || "");
  if (/gsk_|apiKey|ciphertext|BEGIN (RSA )?PRIVATE/i.test(t)) return {};
  const lower = t.toLowerCase();
  const out: InterviewAnswers = {};

  for (const [re, id] of OCCASION_RE) {
    if (re.test(lower)) {
      out.occasion = id;
      break;
    }
  }

  for (const city of CITY_RE) {
    if (new RegExp(`\\b${city}\\b`, "i").test(lower)) {
      out.indiaCity = city === "bengaluru" ? "bangalore" : city;
      out.climateHint = CITY_CLIMATE[city];
      break;
    }
  }
  if (!out.climateHint) {
    if (/humid|monsoon|sticky/i.test(lower)) out.climateHint = "hot_humid";
    else if (/dry heat|delhi dry|desert/i.test(lower)) out.climateHint = "hot_dry";
    else if (/temperate|bengaluru air|hill/i.test(lower)) {
      out.climateHint = "temperate";
    }
  }

  if (/very reactive|highly sensitive|burns? on skin/i.test(lower)) {
    out.skinSensitivity = "high";
  } else if (/a little reactive|mild|sensitive/i.test(lower)) {
    out.skinSensitivity = "mild";
  } else if (/\beasy\b|no sensitiv/i.test(lower)) {
    out.skinSensitivity = "none";
  }
  if (/\bdry skin\b/i.test(lower)) out.skinTypeSession = "dry";
  if (/\boily\b/i.test(lower)) out.skinTypeSession = "oily";

  if (/on me only|close to skin|only me|not loud/i.test(lower)) {
    out.intensityPreference = "close";
  } else if (/arm'?s length|soft trail/i.test(lower)) {
    out.intensityPreference = "moderate";
  } else if (/a presence|in the room|sillage/i.test(lower)) {
    out.intensityPreference = "presence";
  }

  const liked: string[] = [];
  const notes: string[] = [];
  const likeMap: Array<[RegExp, string, string?]> = [
    [/citrus|bergamot|mandarin/i, "citrus", "bergamot"],
    [/jasmine/i, "floral", "jasmine"],
    [/rose/i, "floral", "rose"],
    [/floral/i, "floral"],
    [/sandal/i, "woody", "sandalwood"],
    [/woody|cedar|vetiver/i, "woody"],
    [/musk/i, "musk", "musk"],
    [/oud|agarwood/i, "oud", "oud"],
    [/gourmand|vanilla|sweet/i, "gourmand", "vanilla"],
    [/fresh/i, "fresh"],
  ];
  for (const [re, fam, note] of likeMap) {
    if (re.test(lower)) {
      if (!liked.includes(fam)) liked.push(fam);
      if (note && !notes.includes(note)) notes.push(note);
    }
  }
  if (liked.length) out.scentFamiliesLiked = liked.slice(0, 12);
  if (notes.length) out.notesMentioned = notes.slice(0, 12);

  const disliked: string[] = [];
  if (/too sweet|heavy gourmand/i.test(lower)) disliked.push("gourmand");
  if (/loud oud|heavy oud/i.test(lower)) disliked.push("oud");
  if (/headache floral|heavy floral/i.test(lower)) disliked.push("floral");
  if (/aquatic|marine/i.test(lower) && /hate|don't like|dislike|push|never/i.test(lower)) {
    disliked.push("aquatic");
  }
  if (disliked.length) out.scentFamiliesDisliked = disliked.slice(0, 12);

  if (/\bpress[- ]?tin\b|solid compact|\bbalm\b|\btin\b/i.test(t)) {
    out.formatPreference = /press/i.test(t) ? "press_tin" : "solid";
  } else if (/\bspray\b|edp|eau de parfum/i.test(t)) {
    out.formatPreference = /spray/i.test(t) ? "spray" : "liquid";
  }

  const times: TimeOfDay[] = [];
  if (/morning commute|morning/i.test(lower)) times.push("morning");
  if (/afternoon heat|afternoon/i.test(lower)) times.push("afternoon");
  if (/\bevening\b/i.test(lower) && !out.occasion) times.push("evening");
  else if (/late night|night air|\blate\b/i.test(lower)) times.push("night");
  if (times.length) out.timeOfDayDefaults = times;

  if (/for someone|my mother|gift|gifting/i.test(lower)) out.giftOccasion = true;

  if (currentSlot) applyChipToAnswers(out, currentSlot, t);
  return out;
}

export function applyChipToAnswers(
  answers: InterviewAnswers,
  slot: InterviewSlot,
  chipId: string,
): InterviewAnswers {
  const id = chipId.trim().toLowerCase().replace(/\s+/g, "_");
  switch (slot) {
    case "occasion":
      answers.occasion = id === "commute" ? "travel" : id;
      if (id === "skin") answers.intensityPreference = answers.intensityPreference ?? "close";
      break;
    case "climate_city":
      if (id === "hot_humid" || id === "humid") answers.climateHint = "hot_humid";
      else if (id === "hot_dry" || id === "dry_heat") answers.climateHint = "hot_dry";
      else if (CITY_CLIMATE[id] || id === "bangalore" || id === "bengaluru") {
        const city = id === "bengaluru" ? "bangalore" : id;
        answers.indiaCity = city;
        answers.climateHint = CITY_CLIMATE[city] ?? answers.climateHint;
      }
      break;
    case "skin":
      if (id === "dry" || id === "oily") answers.skinTypeSession = id;
      else answers.skinSensitivity = id as SkinSensitivity;
      break;
    case "intensity":
      answers.intensityPreference = (
        id === "on_me" || id === "close" ? "close" : id === "arms_length" || id === "moderate" ? "moderate" : "presence"
      ) as IntensityPreference;
      break;
    case "likes":
      mergeLike(answers, id);
      break;
    case "dislikes":
      mergeDislike(answers, id);
      break;
    case "format":
      answers.formatPreference = (id === "press-tin" ? "press_tin" : id) as FormatPreference;
      break;
    case "time_of_day":
      answers.timeOfDayDefaults = [id as TimeOfDay];
      break;
    default:
      break;
  }
  return answers;
}

function mergeLike(answers: InterviewAnswers, id: string) {
  const fam =
    id === "jasmine" ? "floral" : id === "sandalwood" || id === "sandal" ? "woody" : id;
  const liked = [...(answers.scentFamiliesLiked || [])];
  if (!liked.includes(fam)) liked.push(fam);
  answers.scentFamiliesLiked = liked.slice(0, 12);
  if (id === "jasmine" || id === "sandalwood" || id === "sandal") {
    const note = id === "sandal" ? "sandalwood" : id;
    const notes = [...(answers.notesMentioned || [])];
    if (!notes.includes(note)) notes.push(note);
    answers.notesMentioned = notes.slice(0, 12);
  }
}

function mergeDislike(answers: InterviewAnswers, id: string) {
  const fam = id === "gourmand_heavy" || id === "too_sweet" ? "gourmand" : id === "loud_oud" ? "oud" : id === "headache_florals" ? "floral" : id;
  const list = [...(answers.scentFamiliesDisliked || [])];
  if (!list.includes(fam)) list.push(fam);
  answers.scentFamiliesDisliked = list.slice(0, 12);
}

export function mergeAnswers(a: InterviewAnswers, b: InterviewAnswers): InterviewAnswers {
  const next: InterviewAnswers = { ...a };
  if (b.occasion) next.occasion = b.occasion;
  if (b.indiaCity) next.indiaCity = b.indiaCity;
  if (b.climateHint) next.climateHint = b.climateHint;
  if (b.skinSensitivity) next.skinSensitivity = b.skinSensitivity;
  if (b.skinTypeSession) next.skinTypeSession = b.skinTypeSession;
  if (b.intensityPreference) next.intensityPreference = b.intensityPreference;
  if (b.formatPreference) next.formatPreference = b.formatPreference;
  if (b.giftOccasion) next.giftOccasion = true;
  next.scentFamiliesLiked = uniq([
    ...(a.scentFamiliesLiked || []),
    ...(b.scentFamiliesLiked || []),
  ]);
  next.scentFamiliesDisliked = uniq([
    ...(a.scentFamiliesDisliked || []),
    ...(b.scentFamiliesDisliked || []),
  ]);
  next.notesMentioned = uniq([
    ...(a.notesMentioned || []),
    ...(b.notesMentioned || []),
  ]);
  next.timeOfDayDefaults = uniq([
    ...(a.timeOfDayDefaults || []),
    ...(b.timeOfDayDefaults || []),
  ]) as TimeOfDay[];
  return next;
}

export function filledSlotCount(answers: InterviewAnswers): number {
  let n = 0;
  if (answers.occasion) n += 1;
  if (answers.indiaCity || (answers.climateHint && answers.climateHint !== "unknown")) {
    n += 1;
  }
  if (answers.skinSensitivity && answers.skinSensitivity !== "unspecified") n += 1;
  else if (answers.skinTypeSession) n += 1;
  if (answers.intensityPreference && answers.intensityPreference !== "unspecified") {
    n += 1;
  }
  if ((answers.scentFamiliesLiked || []).length || (answers.notesMentioned || []).length) {
    n += 1;
  }
  if ((answers.scentFamiliesDisliked || []).length) n += 1;
  if (answers.formatPreference && answers.formatPreference !== "unspecified") n += 1;
  if ((answers.timeOfDayDefaults || []).length) n += 1;
  return n;
}

export function hasMinimumBrief(answers: InterviewAnswers): boolean {
  const occasion = Boolean(answers.occasion);
  const climate = Boolean(
    answers.indiaCity || (answers.climateHint && answers.climateHint !== "unknown"),
  );
  const likeOrDislike = Boolean(
    (answers.scentFamiliesLiked || []).length ||
      (answers.scentFamiliesDisliked || []).length ||
      (answers.notesMentioned || []).length,
  );
  return occasion && climate && likeOrDislike;
}

export function applyMinimumFallbacks(
  answers: InterviewAnswers,
  opts: { wearSku?: boolean; climateFallback: ClimateHint },
): InterviewAnswers {
  const next = { ...answers };
  if (!next.occasion) next.occasion = "daily";
  if (!next.indiaCity && (!next.climateHint || next.climateHint === "unknown")) {
    next.climateHint = opts.climateFallback;
  }
  if (
    !(next.scentFamiliesLiked || []).length &&
    !(next.scentFamiliesDisliked || []).length &&
    !(next.notesMentioned || []).length
  ) {
    next.scentFamiliesLiked = ["musk"];
    next.notesMentioned = ["musk"];
  }
  if (!next.formatPreference || next.formatPreference === "unspecified") {
    next.formatPreference = opts.wearSku ? "press_tin" : "solid";
  }
  if (!next.intensityPreference || next.intensityPreference === "unspecified") {
    next.intensityPreference = "close";
  }
  return next;
}

function uniq(arr: string[]): string[] {
  const out: string[] = [];
  for (const x of arr) {
    if (x && !out.includes(x)) out.push(x);
  }
  return out.slice(0, 12);
}

export function slotFilled(slot: InterviewSlot, answers: InterviewAnswers): boolean {
  switch (slot) {
    case "occasion":
      return Boolean(answers.occasion);
    case "climate_city":
      return Boolean(
        answers.indiaCity || (answers.climateHint && answers.climateHint !== "unknown"),
      );
    case "skin":
      return Boolean(
        (answers.skinSensitivity && answers.skinSensitivity !== "unspecified") ||
          answers.skinTypeSession,
      );
    case "intensity":
      return Boolean(
        answers.intensityPreference && answers.intensityPreference !== "unspecified",
      );
    case "likes":
      return Boolean(
        (answers.scentFamiliesLiked || []).length || (answers.notesMentioned || []).length,
      );
    case "dislikes":
      return Boolean((answers.scentFamiliesDisliked || []).length);
    case "format":
      return Boolean(
        answers.formatPreference && answers.formatPreference !== "unspecified",
      );
    case "time_of_day":
      return Boolean((answers.timeOfDayDefaults || []).length);
    default:
      return false;
  }
}
