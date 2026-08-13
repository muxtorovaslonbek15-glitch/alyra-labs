/**
 * Light prefs from chat text / formatChoice. Closed-set only.
 * Never extracts phone, DOB, email, address, or key-shaped strings.
 */

export type FormatPreference = "solid" | "liquid" | "oil" | "unspecified";

export type ClimateHint = "hot_humid" | "hot_dry" | "temperate" | "unknown";

export type ChatPrefSignals = {
  formatPreference?: FormatPreference;
  scentFamiliesLiked?: string[];
  notesMentioned?: string[];
  occasionDefaults?: string[];
  climateHint?: ClimateHint;
  indiaCity?: string;
  locale?: string;
  budgetBand?: "value" | "mid" | "prestige" | "unspecified";
};

const FAMILIES = [
  "citrus",
  "floral",
  "woody",
  "gourmand",
  "oriental",
  "aromatic",
  "fresh",
  "musk",
  "spicy",
  "green",
  "aquatic",
  "fruity",
  "oud",
  "amber",
  "fougere",
] as const;

const OCCASIONS = [
  "daily",
  "office",
  "wedding",
  "festive",
  "gifting",
  "travel",
  "evening",
  "date",
] as const;

export const CITY_CLIMATE: Record<string, ClimateHint> = {
  mumbai: "hot_humid",
  chennai: "hot_humid",
  kolkata: "hot_humid",
  kochi: "hot_humid",
  goa: "hot_humid",
  hyderabad: "hot_humid",
  delhi: "hot_dry",
  jaipur: "hot_dry",
  ahmedabad: "hot_dry",
  lucknow: "hot_dry",
  bangalore: "temperate",
  bengaluru: "temperate",
  pune: "temperate",
  shimla: "temperate",
};

const NOTE_TO_FAMILY: Array<[RegExp, (typeof FAMILIES)[number]]> = [
  [/bergamot|lemon|orange|grapefruit|citrus|neroli/i, "citrus"],
  [/rose|jasmine|tuberose|ylang|floral|peony/i, "floral"],
  [/sandalwood|cedar|vetiver|guaiac|woody|iso.?e/i, "woody"],
  [/vanilla|vanillin|caramel|maltol|gourmand|tonka/i, "gourmand"],
  [/oud|agarwood/i, "oud"],
  [/musk|ambrett/i, "musk"],
  [/amber|labdanum|benzoin/i, "amber"],
  [/lavender|rosemary|aromatic|herbal/i, "aromatic"],
  [/pepper|cinnamon|clove|spicy|cardamom/i, "spicy"],
  [/green|galbanum|fig leaf/i, "green"],
  [/aquatic|marine|ozonic/i, "aquatic"],
  [/peach|apple|berry|fruity|mango/i, "fruity"],
  [/fresh|cologne|hedione/i, "fresh"],
];

const NOTE_IDS: Array<[RegExp, string]> = [
  [/vanillin|vanilla/i, "vanilla"],
  [/rose/i, "rose"],
  [/jasmine|hedione/i, "jasmine"],
  [/sandal|sandalwood/i, "sandalwood"],
  [/oud|agarwood/i, "oud"],
  [/musk/i, "musk"],
  [/bergamot/i, "bergamot"],
  [/vetiver/i, "vetiver"],
  [/ambroxan|ambergris/i, "ambroxan"],
  [/iso.?e/i, "iso-e-super"],
  [/lavender/i, "lavender"],
];

export function formatPreferenceFromChoice(
  format: string | null | undefined,
): FormatPreference | undefined {
  if (format === "Solid" || format === "solid") return "solid";
  if (format === "Oil" || format === "oil") return "oil";
  if (format === "EDP" || format === "liquid") return "liquid";
  return undefined;
}

function looksLikeSecret(text: string): boolean {
  return /gsk_|apiKey|ciphertext|BEGIN (RSA )?PRIVATE/i.test(text);
}

export function extractChatPrefSignals(
  text: string,
  opts: { format?: string | null } = {},
): ChatPrefSignals {
  const t = String(text || "");
  if (looksLikeSecret(t)) return {};
  const lower = t.toLowerCase();
  const signals: ChatPrefSignals = {};

  const fromChoice = formatPreferenceFromChoice(opts.format);
  if (fromChoice) signals.formatPreference = fromChoice;
  else if (/\bsolid\b|balm|\btin\b/i.test(t)) signals.formatPreference = "solid";
  else if (/perfume oil|roll-?on|\battar\b|\boil\b/i.test(t) && !/\bsolid\b/i.test(t)) {
    signals.formatPreference = "oil";
  } else if (/\bedp\b|eau de parfum|spray/i.test(t)) {
    signals.formatPreference = "liquid";
  }

  const families: string[] = [];
  for (const [re, fam] of NOTE_TO_FAMILY) {
    if (re.test(lower) && !families.includes(fam)) families.push(fam);
  }
  if (families.length) signals.scentFamiliesLiked = families.slice(0, 12);

  const notes: string[] = [];
  for (const [re, id] of NOTE_IDS) {
    if (re.test(lower) && !notes.includes(id)) notes.push(id);
  }
  if (notes.length) signals.notesMentioned = notes.slice(0, 12);

  const occasions: string[] = [];
  if (/wedding|shaadi|mehndi|baraat/i.test(lower)) occasions.push("wedding");
  if (/office|work|commute|daytime/i.test(lower)) occasions.push("office");
  if (/gift|gifting/i.test(lower)) occasions.push("gifting");
  if (/festival|festive|diwali|eid|holi/i.test(lower)) occasions.push("festive");
  if (/travel|flight|trip/i.test(lower)) occasions.push("travel");
  if (/daily|everyday/i.test(lower)) occasions.push("daily");
  if (/party|night|evening/i.test(lower)) occasions.push("evening");
  if (/date night|date\b/i.test(lower)) occasions.push("date");
  const occ = occasions.filter((o) =>
    (OCCASIONS as readonly string[]).includes(o),
  );
  if (occ.length) signals.occasionDefaults = occ.slice(0, 12);

  for (const [city, climate] of Object.entries(CITY_CLIMATE)) {
    if (new RegExp(`\\b${city}\\b`, "i").test(lower)) {
      signals.indiaCity = city === "bengaluru" ? "bangalore" : city;
      signals.climateHint = climate;
      signals.locale = "en-IN";
      break;
    }
  }
  if (!signals.climateHint) {
    if (/humid|monsoon|sticky heat/i.test(lower)) signals.climateHint = "hot_humid";
    else if (/dry heat|desert heat|hot dry/i.test(lower)) {
      signals.climateHint = "hot_dry";
    } else if (/\btemperate\b|hill station|cool climate/i.test(lower)) {
      signals.climateHint = "temperate";
    }
  }

  if (/budget|cheap|affordable|low cost|under\s*₹/i.test(lower)) {
    signals.budgetBand = "value";
  } else if (/luxury|niche|prestige|expensive/i.test(lower)) {
    signals.budgetBand = "prestige";
  } else if (/mid.?tier|moderate budget/i.test(lower)) {
    signals.budgetBand = "mid";
  }

  void FAMILIES;
  return signals;
}

export function mergeSignalTexts(
  texts: string[],
  format?: string | null,
): ChatPrefSignals {
  const merged: ChatPrefSignals = {};
  const families = new Set<string>();
  const notes = new Set<string>();
  const occasions = new Set<string>();
  for (const text of texts) {
    const s = extractChatPrefSignals(text, { format });
    if (s.formatPreference) merged.formatPreference = s.formatPreference;
    if (s.climateHint) merged.climateHint = s.climateHint;
    if (s.indiaCity) merged.indiaCity = s.indiaCity;
    if (s.locale) merged.locale = s.locale;
    if (s.budgetBand) merged.budgetBand = s.budgetBand;
    for (const f of s.scentFamiliesLiked || []) families.add(f);
    for (const n of s.notesMentioned || []) notes.add(n);
    for (const o of s.occasionDefaults || []) occasions.add(o);
  }
  const fromFormat = formatPreferenceFromChoice(format);
  if (fromFormat) merged.formatPreference = fromFormat;
  if (families.size) merged.scentFamiliesLiked = [...families].slice(0, 12);
  if (notes.size) merged.notesMentioned = [...notes].slice(0, 12);
  if (occasions.size) merged.occasionDefaults = [...occasions].slice(0, 12);
  return merged;
}
