import type {
  InterviewChip,
  InterviewSlot,
  InterviewSurface,
} from "./types";
import { pickIndex, shuffleInPlace, mulberry32 } from "./hash";

export const ALL_SLOTS: InterviewSlot[] = [
  "occasion",
  "climate_city",
  "skin",
  "intensity",
  "likes",
  "dislikes",
  "format",
  "time_of_day",
];

const OPENINGS = [
  {
    id: "wear-heat",
    surfaces: ["wear", "compose"] as InterviewSurface[],
    text: "Tell me how you wear scent. I’ll make something that sits close in this heat.",
  },
  {
    id: "compose-house",
    surfaces: ["wear", "compose"] as InterviewSurface[],
    text: "I’m the house perfumer. Occasion, climate, skin, then I compose. Not a formula sheet first.",
  },
  {
    id: "heat-first",
    surfaces: ["wear", "compose"] as InterviewSurface[],
    text: "Heat first. Then how close it should sit.",
  },
  {
    id: "refuse",
    surfaces: ["wear", "compose"] as InterviewSurface[],
    text: "Before I compose: where it lives, and what you refuse.",
  },
  {
    id: "close-not-loud",
    surfaces: ["wear", "compose"] as InterviewSurface[],
    text: "Close, not loud. Tell me the air and the hour.",
  },
  {
    id: "returning-city",
    surfaces: ["wear", "compose"] as InterviewSurface[],
    text: "Still close. What’s changed.",
  },
];

const SKU_OPENINGS: Record<string, string> = {
  "fruit-damour":
    "Fruit d’Amour is already on the wood. Where does it go today, and what should sit beside it.",
  "riva-azul":
    "Riva Azul is on the wood. Where does this blue hour go today.",
  "ecos-de-lisboa":
    "Ecos de Lisboa is on the wood. Evening stone, or daylight.",
  generic: "Your compact is on the wood. Where does it go today.",
};

type SlotCopy = {
  prompts: string[];
  chips: InterviewChip[];
};

export const SLOT_BANK: Record<InterviewSlot, SlotCopy> = {
  occasion: {
    prompts: [
      "Where this has to live.",
      "Where are you wearing this today?",
      "Office, a wedding, or just skin.",
    ],
    chips: [
      { id: "office", label: "Office" },
      { id: "office", label: "Work day" },
      { id: "office", label: "AC office" },
      { id: "evening", label: "Evening" },
      { id: "wedding", label: "Wedding" },
      { id: "wedding", label: "Shaadi" },
      { id: "skin", label: "Just skin" },
      { id: "festive", label: "Festive" },
      { id: "travel", label: "Commute" },
    ],
  },
  climate_city: {
    prompts: [
      "Where you are, city or the air.",
      "Mumbai sticky, Delhi dry, or Bengaluru air.",
      "What is the air doing where you’ll wear it.",
    ],
    chips: [
      { id: "mumbai", label: "Mumbai" },
      { id: "delhi", label: "Delhi" },
      { id: "bangalore", label: "Bengaluru" },
      { id: "chennai", label: "Chennai" },
      { id: "pune", label: "Pune" },
      { id: "hot_humid", label: "Humid" },
      { id: "hot_dry", label: "Dry heat" },
    ],
  },
  skin: {
    prompts: [
      "How skin treats fragrance.",
      "Easy on skin, or a little reactive in this heat.",
      "Sweat and scent: how does your skin behave.",
    ],
    chips: [
      { id: "none", label: "Easy" },
      { id: "mild", label: "A little reactive" },
      { id: "high", label: "Very reactive" },
      { id: "dry", label: "Dry" },
      { id: "oily", label: "Oily" },
    ],
  },
  intensity: {
    prompts: [
      "How close it should sit.",
      "Should a colleague know, or only you.",
      "On skin, or a little in the room.",
    ],
    chips: [
      { id: "close", label: "On me only" },
      { id: "close", label: "Close" },
      { id: "moderate", label: "Arm’s length" },
      { id: "presence", label: "A presence" },
    ],
  },
  likes: {
    prompts: [
      "What you already reach for.",
      "Citrus, jasmine, sandal, oud, something warm.",
      "What do you already love on skin.",
    ],
    chips: [
      { id: "citrus", label: "Citrus" },
      { id: "floral", label: "Floral" },
      { id: "woody", label: "Woody" },
      { id: "musk", label: "Musk" },
      { id: "oud", label: "Oud" },
      { id: "gourmand", label: "Gourmand" },
      { id: "fresh", label: "Fresh" },
      { id: "jasmine", label: "Jasmine" },
      { id: "sandalwood", label: "Sandal" },
    ],
  },
  dislikes: {
    prompts: [
      "What you push away.",
      "Too sweet, loud oud, florals that sit heavy in AC.",
      "What should never be in this.",
    ],
    chips: [
      { id: "gourmand", label: "Too sweet" },
      { id: "oud", label: "Loud oud" },
      { id: "floral", label: "Headache florals" },
      { id: "gourmand_heavy", label: "Heavy gourmand" },
      { id: "aquatic", label: "Aquatic" },
    ],
  },
  format: {
    prompts: [
      "How it should be on the body.",
      "A compact you press, or a spray cloud.",
      "Tin on skin, or alcohol in the air.",
    ],
    chips: [
      { id: "solid", label: "Solid compact" },
      { id: "press_tin", label: "Press-tin" },
      { id: "spray", label: "Spray" },
    ],
  },
  time_of_day: {
    prompts: [
      "When it goes on.",
      "Morning commute, afternoon heat, or late.",
      "What hour will it meet the air.",
    ],
    chips: [
      { id: "morning", label: "Morning commute" },
      { id: "afternoon", label: "Afternoon heat" },
      { id: "evening", label: "Evening" },
      { id: "night", label: "Late" },
    ],
  },
};

export function pickOpening(opts: {
  seed: number;
  surface: InterviewSurface;
  skuId?: string | null;
  knownCity?: string | null;
  lastOpeningId?: string | null;
}): { id: string; text: string } {
  if (opts.surface === "wear" && opts.skuId && SKU_OPENINGS[opts.skuId]) {
    return { id: `sku-${opts.skuId}`, text: SKU_OPENINGS[opts.skuId]! };
  }
  if (opts.knownCity) {
    const city =
      opts.knownCity === "bangalore" ? "Bengaluru" : capitalize(opts.knownCity);
    return {
      id: "returning-city",
      text: `Still ${city}. Still close. What’s changed.`,
    };
  }
  const pool = OPENINGS.filter((o) => o.surfaces.includes(opts.surface));
  let idx = pickIndex(opts.seed, pool.length);
  if (pool[idx]?.id === opts.lastOpeningId && pool.length > 1) {
    idx = (idx + 1) % pool.length;
  }
  const picked = pool[idx] ?? pool[0]!;
  return { id: picked.id, text: picked.text };
}

export function pickPrompt(slot: InterviewSlot, seed: number, echo?: string): string {
  const prompts = SLOT_BANK[slot].prompts;
  const base = prompts[pickIndex(seed + slot.length, prompts.length)] ?? prompts[0]!;
  if (!echo) return base;
  return `${echo} ${base}`;
}

export function pickChips(slot: InterviewSlot, seed: number, count = 4): InterviewChip[] {
  const all = SLOT_BANK[slot].chips;
  const rand = mulberry32(seed + hashLabel(slot));
  const byId = new Map<string, InterviewChip[]>();
  for (const c of all) {
    const list = byId.get(c.id) ?? [];
    list.push(c);
    byId.set(c.id, list);
  }
  const ids = shuffleInPlace([...byId.keys()], rand);
  const picked: InterviewChip[] = [];
  for (const id of ids) {
    if (picked.length >= count) break;
    const variants = byId.get(id) ?? [];
    const v = variants[pickIndex(seed + id.length, variants.length)] ?? variants[0];
    if (v) picked.push(v);
  }
  return picked.slice(0, Math.min(4, Math.max(2, picked.length)));
}

function hashLabel(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function echoClause(
  slot: InterviewSlot,
  typed: string | undefined,
  chipLabel: string | undefined,
): string | undefined {
  if (typed) {
    const clip = typed.trim().replace(/\s+/g, " ").slice(0, 48);
    const words = clip.split(" ").slice(0, 8).join(" ");
    if (!words) return undefined;
    return `${words.charAt(0).toUpperCase()}${words.slice(1)},`;
  }
  if (!chipLabel) return undefined;
  switch (slot) {
    case "occasion":
      return chipLabel.toLowerCase().includes("office")
        ? "Office in that humidity,"
        : `${chipLabel},`;
    case "climate_city":
      return `${chipLabel} air,`;
    case "intensity":
      return `${chipLabel.toLowerCase()},`;
    default:
      return `${chipLabel},`;
  }
}
