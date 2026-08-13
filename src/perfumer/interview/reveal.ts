import type { HouseSkuId } from "@/wear/houseSkus";
import { getHouseSku } from "@/wear/houseSkus";
import { copyLooksLikeCraft } from "@/wear/cannedCopy";
import { looksLikeCostCopy } from "@/perfumer/hideCost";
import type { InterviewAnswers, RevealCardPayload } from "./types";
import { hash32, pickIndex } from "./hash";

const COMPOSE_NAMES: Record<string, string[]> = {
  citrus: ["Shore air", "Morning peel", "Clear heat"],
  floral: ["Jasmine close", "Petal heat", "Soft ceremony"],
  woody: ["Sandal film", "Dry wood", "Stone hour"],
  musk: ["Skin musk", "Close film", "Warm pulse"],
  oud: ["Quiet oud", "Attar warmth", "Night resin"],
  gourmand: ["Warm skin sweet", "Low vanilla", "Soft gourmand"],
  fresh: ["AC air", "Clean commute", "Light press"],
  fruity: ["Berry heat", "Sun fruit", "First blush"],
  default: ["Close film", "House press", "Skin hour"],
};

function clean(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export function revealHasForbidden(payload: RevealCardPayload): boolean {
  const blob = `${payload.name}\n${payload.vibe}\n${payload.feel}\n${payload.notes.brightness.join(" ")}\n${payload.notes.heart.join(" ")}\n${payload.notes.skin.join(" ")}`;
  return (
    looksLikeCostCopy(blob) ||
    copyLooksLikeCraft(blob) ||
    /galaxolide|hhcb|\bcas\b|ifra|₹|inr\b|100g/i.test(blob)
  );
}

export function houseNoteFromChem(name: string): string | null {
  const n = name.toLowerCase();
  if (/galaxolide|hhcb|habanolide|ethylene.?brassylate/.test(n)) return "musk on skin";
  if (/hedione/.test(n)) return "jasmine air";
  if (/iso.?e/.test(n)) return "soft woods";
  if (/ambroxan/.test(n)) return "amber woods";
  if (/bergamot/.test(n)) return "bergamot";
  if (/mandarin|orange/.test(n)) return "mandarin";
  if (/rose/.test(n)) return "rose";
  if (/jasmine/.test(n)) return "jasmine";
  if (/sandal/.test(n)) return "sandal";
  if (/vanillin|vanilla/.test(n)) return "vanilla";
  if (/oud/.test(n)) return "a whisper of oud";
  if (/cashmeran/.test(n)) return "soft woods";
  if (/linalool|linalyl/.test(n)) return "brightness";
  if (/\d|cas|hhcb/.test(n)) return null;
  if (n.length > 22) return null;
  return name;
}

export function composeName(
  answers: InterviewAnswers,
  opts: { skuId?: HouseSkuId | string | null; seed: number },
): string {
  if (opts.skuId && opts.skuId !== "generic") {
    return getHouseSku(opts.skuId as HouseSkuId).name;
  }
  const fam = answers.scentFamiliesLiked?.[0] || "default";
  const pool = COMPOSE_NAMES[fam] ?? COMPOSE_NAMES.default!;
  return pool[pickIndex(opts.seed + fam.length, pool.length)] ?? pool[0]!;
}

export function buildCannedReveal(opts: {
  answers: InterviewAnswers;
  skuId?: HouseSkuId | string | null;
  seed: number;
}): RevealCardPayload {
  const sku = getHouseSku((opts.skuId as HouseSkuId) ?? "generic");
  const wearSku = Boolean(opts.skuId && opts.skuId !== "generic");
  const name = composeName(opts.answers, opts);
  const notes = wearSku
    ? {
        brightness: sku.notes.top,
        heart: sku.notes.heart,
        skin: sku.notes.base,
      }
    : notesFromAnswers(opts.answers);

  const city = opts.answers.indiaCity
    ? opts.answers.indiaCity === "bangalore"
      ? "Bengaluru"
      : capitalize(opts.answers.indiaCity)
    : null;
  const climate = climatePhrase(opts.answers);
  const intensity = opts.answers.intensityPreference ?? "close";
  const occasion = opts.answers.occasion ?? "daily";
  const format = opts.answers.formatPreference ?? (wearSku ? "press_tin" : "solid");
  const solid = format === "solid" || format === "press_tin";

  const vibe = wearSku
    ? skuVibe(sku.name, sku.story, occasion, climate, city)
    : composedVibe(opts.answers, climate, city, name);

  const feel = feelCopy({
    solid,
    intensity,
    climate,
    city,
    occasion,
  });

  const payload: RevealCardPayload = {
    name,
    notes,
    vibe: clean(vibe),
    feel: clean(feel),
  };
  if (revealHasForbidden(payload)) {
    return {
      name: wearSku ? sku.name : "Close film",
      notes: {
        brightness: ["brightness"],
        heart: ["the heart of the blend"],
        skin: ["musk on skin"],
      },
      vibe: "Never sharp, never loud. It sits close in this heat.",
      feel: "Press, warm, a film on pulse points. It doesn’t announce the corridor.",
    };
  }
  return payload;
}

function notesFromAnswers(answers: InterviewAnswers): RevealCardPayload["notes"] {
  const liked = answers.scentFamiliesLiked || [];
  const notes = answers.notesMentioned || [];
  const brightness: string[] = [];
  const heart: string[] = [];
  const skin: string[] = [];
  if (liked.includes("citrus") || notes.includes("bergamot")) brightness.push("mandarin");
  if (liked.includes("fresh")) brightness.push("a cool opening");
  if (liked.includes("floral") || notes.includes("jasmine") || notes.includes("rose")) {
    heart.push(notes.includes("jasmine") ? "jasmine" : notes.includes("rose") ? "rose" : "a quiet floral");
  }
  if (liked.includes("woody") || notes.includes("sandalwood")) heart.push("sandal");
  if (liked.includes("gourmand")) heart.push("a low vanilla");
  if (liked.includes("oud") || notes.includes("oud")) skin.push("a whisper of oud");
  if (liked.includes("musk") || notes.includes("musk") || skin.length === 0) {
    skin.push("musk on skin");
  }
  if (!brightness.length) brightness.push("brightness");
  if (!heart.length) heart.push("the heart of the blend");
  return { brightness, heart, skin };
}

function climatePhrase(answers: InterviewAnswers): string {
  if (answers.climateHint === "hot_dry") return "dry heat";
  if (answers.climateHint === "temperate") return "temperate air";
  return "humidity";
}

function skuVibe(
  name: string,
  story: string,
  occasion: string,
  climate: string,
  city: string | null,
): string {
  const where = city ? `in ${city}` : `in this ${climate}`;
  const occ =
    occasion === "wedding"
      ? "For a wedding it stays close through AC and outdoor heat."
      : occasion === "office"
        ? "For the office it does not announce the corridor."
        : occasion === "evening"
          ? "Evening air is slower; it blooms, then sits."
          : "On skin it is a film, not a cloud.";
  return `${story.split(".").slice(0, 2).join(".").trim()}. ${name} ${where}. ${occ}`;
}

function composedVibe(
  answers: InterviewAnswers,
  climate: string,
  city: string | null,
  name: string,
): string {
  const like = (answers.scentFamiliesLiked || []).slice(0, 2).join(" and ") || "musk";
  const where = city ? city : `this ${climate}`;
  const close =
    answers.intensityPreference === "presence"
      ? "A little in the room, still not elevator-loud."
      : "It sits close. That is the point.";
  return `${name} is ${like} on skin, made for ${where}. Never sharp, never loud. ${close}`;
}

function feelCopy(opts: {
  solid: boolean;
  intensity: string;
  climate: string;
  city: string | null;
  occasion: string;
}): string {
  const heat = opts.city
    ? `In ${opts.city} ${opts.climate}`
    : `In Indian ${opts.climate}`;
  if (opts.solid) {
    const silk =
      opts.occasion === "wedding" || opts.occasion === "office"
        ? " Keep it off silk."
        : "";
    const close =
      opts.intensity === "presence"
        ? "A little more presence after the press, still a balm."
        : "Press, warm, a film on pulse points. It doesn’t announce the corridor.";
    return `${close} ${heat} it blooms on skin, then sits close. That is the point of a balm. The tin is the bottle.${silk}`;
  }
  return `${heat} a spray flashes faster than a balm. Keep it close to skin. Alyra is a balm house; this sketch stays honest about that.`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function composeCopy(answers: InterviewAnswers): string {
  const where = answers.indiaCity
    ? answers.indiaCity === "bangalore"
      ? "Bengaluru"
      : capitalize(answers.indiaCity)
    : answers.climateHint === "hot_dry"
      ? "dry heat"
      : "this heat";
  return `I’m making this for you, close, not loud, built for ${where}.`;
}

export function buildLiveBrief(opts: {
  answers: InterviewAnswers;
  surface: "wear" | "compose";
  skuId?: string | null;
}): string {
  const a = opts.answers;
  const lines = [
    opts.surface === "wear" && opts.skuId && opts.skuId !== "generic"
      ? `Wearing ${getHouseSku(opts.skuId as HouseSkuId).name}. Speak notes, vibe, and how it wears. Do not invent a new juice. Do not mention cost, IFRA, Galaxolide, or percents.`
      : `Compose an Alyra-house perfume. Lead with notes, vibe, and how it feels on skin in Indian heat. Never cost, IFRA, Galaxolide, or percents.`,
  ];
  if (a.occasion) lines.push(`Occasion: ${a.occasion}.`);
  if (a.indiaCity) lines.push(`City: ${a.indiaCity}.`);
  if (a.climateHint) lines.push(`Climate: ${a.climateHint}.`);
  if (a.intensityPreference) lines.push(`Intensity: ${a.intensityPreference}.`);
  if (a.scentFamiliesLiked?.length) lines.push(`Likes: ${a.scentFamiliesLiked.join(", ")}.`);
  if (a.scentFamiliesDisliked?.length) {
    lines.push(`Dislikes: ${a.scentFamiliesDisliked.join(", ")}.`);
  }
  if (a.formatPreference) lines.push(`Format: ${a.formatPreference}.`);
  if (a.timeOfDayDefaults?.length) lines.push(`Hour: ${a.timeOfDayDefaults.join(", ")}.`);
  if (a.skinSensitivity) lines.push(`Skin: ${a.skinSensitivity}.`);
  return lines.join(" ");
}

void hash32;
