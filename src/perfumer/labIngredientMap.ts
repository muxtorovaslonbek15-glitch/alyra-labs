/**
 * Client mirror of alyra-perfumer/lib/labMap.js
 * Map Perfumer ingredient ids → Lab Chemical.id. Never invent Lab chemicals.
 */

export type MapStatus = "exact" | "alias" | "proxy" | "unmapped";

export const LAB_CHEMICAL_IDS = new Set([
  "c2h5oh",
  "limonene",
  "ethyl-acetate",
  "beeswax",
  "bergamot-oil",
  "grapefruit-oil",
  "orange-oil",
  "lemon-oil",
  "mint-oil",
  "lavender-oil",
  "aldehydes",
  "pink-pepper",
  "apple-note",
  "pineapple-note",
  "pear-note",
  "cardamom-oil",
  "jasmine-oil",
  "rose-oil",
  "lily-oil",
  "geranium-oil",
  "iris-note",
  "violet-note",
  "cinnamon-oil",
  "nutmeg-oil",
  "orange-blossom",
  "ylang-ylang",
  "peony-note",
  "tea-note",
  "ginger-oil",
  "sandalwood-oil",
  "cedarwood-oil",
  "vetiver-oil",
  "patchouli-oil",
  "vanilla-extract",
  "tonka-bean",
  "amber-resin",
  "musk-synthetic",
  "oakmoss",
  "benzoin",
  "incense-note",
  "leather-note",
  "cocoa-note",
  "coffee-note",
  "tobacco-note",
  "oud-oil",
  "cashmere-wood",
  "iso-e-super",
  "ambergris-synth",
  "marine-note",
  "coconut-note",
  "honey-note",
  "saffron-note",
  "cct",
  "jojoba-oil",
]);

/** perfumer id → lab id + status */
export const ALIAS_MAP: Record<
  string,
  { labChemicalId: string; mapStatus: Exclude<MapStatus, "unmapped"> }
> = {
  ethanol: { labChemicalId: "c2h5oh", mapStatus: "alias" },
  alcohol: { labChemicalId: "c2h5oh", mapStatus: "alias" },
  "ethyl-alcohol": { labChemicalId: "c2h5oh", mapStatus: "alias" },
  beeswax: { labChemicalId: "beeswax", mapStatus: "exact" },
  limonene: { labChemicalId: "limonene", mapStatus: "exact" },
  "d-limonene": { labChemicalId: "limonene", mapStatus: "alias" },
  "iso-e-super": { labChemicalId: "iso-e-super", mapStatus: "exact" },
  "bergamot-oil": { labChemicalId: "bergamot-oil", mapStatus: "exact" },
  bergamot: { labChemicalId: "bergamot-oil", mapStatus: "alias" },
  "orange-sweet-oil": { labChemicalId: "orange-oil", mapStatus: "alias" },
  "orange-oil": { labChemicalId: "orange-oil", mapStatus: "exact" },
  "lemon-oil": { labChemicalId: "lemon-oil", mapStatus: "exact" },
  "grapefruit-oil": { labChemicalId: "grapefruit-oil", mapStatus: "exact" },
  "lavender-oil": { labChemicalId: "lavender-oil", mapStatus: "exact" },
  "lavender-40-42": { labChemicalId: "lavender-oil", mapStatus: "alias" },
  "lavender-absolute": { labChemicalId: "lavender-oil", mapStatus: "alias" },
  "mint-oil": { labChemicalId: "mint-oil", mapStatus: "exact" },
  "peppermint-oil": { labChemicalId: "mint-oil", mapStatus: "alias" },
  "pink-pepper": { labChemicalId: "pink-pepper", mapStatus: "exact" },
  "pink-pepper-oil": { labChemicalId: "pink-pepper", mapStatus: "alias" },
  "cardamom-oil": { labChemicalId: "cardamom-oil", mapStatus: "exact" },
  dihydromyrcenol: { labChemicalId: "limonene", mapStatus: "proxy" },
  "jasmine-absolute": { labChemicalId: "jasmine-oil", mapStatus: "alias" },
  "jasmine-oil": { labChemicalId: "jasmine-oil", mapStatus: "exact" },
  hedione: { labChemicalId: "jasmine-oil", mapStatus: "proxy" },
  "methyl-dihydrojasmonate": { labChemicalId: "jasmine-oil", mapStatus: "proxy" },
  "rose-absolute": { labChemicalId: "rose-oil", mapStatus: "alias" },
  "rose-oil": { labChemicalId: "rose-oil", mapStatus: "exact" },
  "rose-base": { labChemicalId: "rose-oil", mapStatus: "alias" },
  citronellol: { labChemicalId: "rose-oil", mapStatus: "proxy" },
  "citronellol-pure": { labChemicalId: "rose-oil", mapStatus: "proxy" },
  geraniol: { labChemicalId: "rose-oil", mapStatus: "proxy" },
  "phenethyl-alcohol": { labChemicalId: "rose-oil", mapStatus: "proxy" },
  "dimethyl-phenethyl-acetate": { labChemicalId: "rose-oil", mapStatus: "proxy" },
  "phenethyl-acetate": { labChemicalId: "rose-oil", mapStatus: "proxy" },
  benzaldehyde: { labChemicalId: "honey-note", mapStatus: "proxy" },
  "benzoin-absolute": { labChemicalId: "benzoin", mapStatus: "alias" },
  "amyris-oil": { labChemicalId: "sandalwood-oil", mapStatus: "proxy" },
  "ambrette-seed-absolute": { labChemicalId: "musk-synthetic", mapStatus: "proxy" },
  "dihydro-beta-ionone": { labChemicalId: "iris-note", mapStatus: "proxy" },
  "beta-ionone": { labChemicalId: "iris-note", mapStatus: "proxy" },
  "ylang-ylang-oil": { labChemicalId: "ylang-ylang", mapStatus: "alias" },
  "ylang-ylang": { labChemicalId: "ylang-ylang", mapStatus: "exact" },
  "orange-flower-absolute": { labChemicalId: "orange-blossom", mapStatus: "alias" },
  "neroli-oil": { labChemicalId: "orange-blossom", mapStatus: "proxy" },
  "lily-oil": { labChemicalId: "lily-oil", mapStatus: "exact" },
  "hydroxycitronellal": { labChemicalId: "lily-oil", mapStatus: "proxy" },
  "methyl-ionone-gamma": { labChemicalId: "iris-note", mapStatus: "proxy" },
  "iris-note": { labChemicalId: "iris-note", mapStatus: "exact" },
  "violet-leaf-absolute": { labChemicalId: "violet-note", mapStatus: "alias" },
  heliotropin: { labChemicalId: "iris-note", mapStatus: "proxy" },
  linalool: { labChemicalId: "lavender-oil", mapStatus: "proxy" },
  "linalyl-acetate": { labChemicalId: "lavender-oil", mapStatus: "proxy" },
  aldehydes: { labChemicalId: "aldehydes", mapStatus: "exact" },
  "aldehyde-c10": { labChemicalId: "aldehydes", mapStatus: "proxy" },
  "aldehyde-c11": { labChemicalId: "aldehydes", mapStatus: "proxy" },
  "aldehyde-c12-mna": { labChemicalId: "aldehydes", mapStatus: "proxy" },
  "cinnamon-bark-oil": { labChemicalId: "cinnamon-oil", mapStatus: "alias" },
  "cinnamon-oil": { labChemicalId: "cinnamon-oil", mapStatus: "exact" },
  "geranium-oil": { labChemicalId: "geranium-oil", mapStatus: "exact" },
  "ginger-oil": { labChemicalId: "ginger-oil", mapStatus: "exact" },
  "nutmeg-oil": { labChemicalId: "nutmeg-oil", mapStatus: "exact" },
  "cedarwood-atlas": { labChemicalId: "cedarwood-oil", mapStatus: "alias" },
  "cedarwood-oil": { labChemicalId: "cedarwood-oil", mapStatus: "exact" },
  "sandalwood-oil": { labChemicalId: "sandalwood-oil", mapStatus: "exact" },
  sandalore: { labChemicalId: "sandalwood-oil", mapStatus: "proxy" },
  "sandalwood-base": { labChemicalId: "sandalwood-oil", mapStatus: "alias" },
  "patchouli-oil": { labChemicalId: "patchouli-oil", mapStatus: "exact" },
  "vetiver-oil": { labChemicalId: "vetiver-oil", mapStatus: "exact" },
  "oud-oil": { labChemicalId: "oud-oil", mapStatus: "exact" },
  cashmeran: { labChemicalId: "cashmere-wood", mapStatus: "alias" },
  ambroxan: { labChemicalId: "ambergris-synth", mapStatus: "alias" },
  cetalox: { labChemicalId: "ambergris-synth", mapStatus: "alias" },
  "labdanum-absolute": { labChemicalId: "amber-resin", mapStatus: "proxy" },
  galaxolide: { labChemicalId: "musk-synthetic", mapStatus: "proxy" },
  habanolide: { labChemicalId: "musk-synthetic", mapStatus: "proxy" },
  "musk-ketone": { labChemicalId: "musk-synthetic", mapStatus: "proxy" },
  "musk-base": { labChemicalId: "musk-synthetic", mapStatus: "alias" },
  vanillin: { labChemicalId: "vanilla-extract", mapStatus: "alias" },
  "ethyl-vanillin": { labChemicalId: "vanilla-extract", mapStatus: "alias" },
  "vanilla-extract": { labChemicalId: "vanilla-extract", mapStatus: "exact" },
  "tonka-bean-absolute": { labChemicalId: "tonka-bean", mapStatus: "alias" },
  "tonka-absolute": { labChemicalId: "tonka-bean", mapStatus: "alias" },
  "tonka-bean": { labChemicalId: "tonka-bean", mapStatus: "exact" },
  coumarin: { labChemicalId: "tonka-bean", mapStatus: "proxy" },
  "benzoin-siam": { labChemicalId: "benzoin", mapStatus: "alias" },
  benzoin: { labChemicalId: "benzoin", mapStatus: "exact" },
  "ethyl-maltol": { labChemicalId: "honey-note", mapStatus: "proxy" },
  "gamma-decalactone": { labChemicalId: "coconut-note", mapStatus: "proxy" },
  "delta-decalactone": { labChemicalId: "coconut-note", mapStatus: "proxy" },
  "aldehyde-c18-coconut": { labChemicalId: "coconut-note", mapStatus: "alias" },
  "coconut-lactonic-base": { labChemicalId: "coconut-note", mapStatus: "alias" },
  "cocoa-absolute": { labChemicalId: "cocoa-note", mapStatus: "alias" },
  "tobacco-absolute": { labChemicalId: "tobacco-note", mapStatus: "alias" },
  "leather-base": { labChemicalId: "leather-note", mapStatus: "alias" },
  "incense-base": { labChemicalId: "incense-note", mapStatus: "alias" },
  "oakmoss-absolute": { labChemicalId: "oakmoss", mapStatus: "alias" },
  oakmoss: { labChemicalId: "oakmoss", mapStatus: "exact" },
  calone: { labChemicalId: "marine-note", mapStatus: "proxy" },
  norlimbanol: { labChemicalId: "cedarwood-oil", mapStatus: "proxy" },
  saffron: { labChemicalId: "saffron-note", mapStatus: "alias" },
  // Carriers — high-traffic Open in Lab gaps
  cct: { labChemicalId: "cct", mapStatus: "exact" },
  "caprylic-capric-triglyceride": { labChemicalId: "cct", mapStatus: "alias" },
  "caprylic-capric-triglycerides": { labChemicalId: "cct", mapStatus: "alias" },
  mct: { labChemicalId: "cct", mapStatus: "alias" },
  "mct-oil": { labChemicalId: "cct", mapStatus: "alias" },
  "fractionated-coconut": { labChemicalId: "cct", mapStatus: "alias" },
  "fractionated-coconut-oil": { labChemicalId: "cct", mapStatus: "alias" },
  "jojoba-oil": { labChemicalId: "jojoba-oil", mapStatus: "exact" },
  jojoba: { labChemicalId: "jojoba-oil", mapStatus: "alias" },
};

export function normalizeIngredientId(id: string): string {
  return String(id || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/_/g, "-");
}

export function mapIngredientToLab(perfumerIngredientId: string): {
  labChemicalId: string | null;
  mapStatus: MapStatus;
} {
  const id = normalizeIngredientId(perfumerIngredientId);
  if (!id) return { labChemicalId: null, mapStatus: "unmapped" };
  const alias = ALIAS_MAP[id];
  if (alias) {
    if (LAB_CHEMICAL_IDS.has(alias.labChemicalId)) return { ...alias };
    return { labChemicalId: null, mapStatus: "unmapped" };
  }
  if (LAB_CHEMICAL_IDS.has(id)) {
    return { labChemicalId: id, mapStatus: "exact" };
  }
  return { labChemicalId: null, mapStatus: "unmapped" };
}

const MAP_RANK: Record<MapStatus, number> = {
  exact: 0,
  alias: 1,
  proxy: 2,
  unmapped: 3,
};

/** Best Perfumer id for a Lab chemical (honest reverse; never invents Lab ids). */
const LAB_TO_PERFUMER: Record<
  string,
  { perfumerIngredientId: string; mapStatus: Exclude<MapStatus, "unmapped"> }
> = (() => {
  const out: Record<
    string,
    { perfumerIngredientId: string; mapStatus: Exclude<MapStatus, "unmapped"> }
  > = {};
  for (const [perfId, mapped] of Object.entries(ALIAS_MAP)) {
    if (!LAB_CHEMICAL_IDS.has(mapped.labChemicalId)) continue;
    const prev = out[mapped.labChemicalId];
    const identityBoost = perfId === mapped.labChemicalId ? -0.5 : 0;
    const prevRank = prev
      ? MAP_RANK[prev.mapStatus] +
        (prev.perfumerIngredientId === mapped.labChemicalId ? -0.5 : 0)
      : 99;
    const nextRank = MAP_RANK[mapped.mapStatus] + identityBoost;
    if (!prev || nextRank < prevRank) {
      out[mapped.labChemicalId] = {
        perfumerIngredientId: perfId,
        mapStatus: mapped.mapStatus,
      };
    }
  }
  for (const labId of LAB_CHEMICAL_IDS) {
    if (!out[labId]) {
      out[labId] = { perfumerIngredientId: labId, mapStatus: "exact" };
    }
  }
  // Prefer ethanol over raw inventory id for the carrier.
  out.c2h5oh = { perfumerIngredientId: "ethanol", mapStatus: "alias" };
  return out;
})();

/**
 * Map Lab Chemical.id → Perfumer ingredient id for Send to chat.
 * Only returns ids for known Lab inventory; never invents chemicals.
 */
export function mapLabToPerfumer(labChemicalId: string): {
  perfumerIngredientId: string;
  mapStatus: MapStatus;
} {
  const id = normalizeIngredientId(labChemicalId);
  if (!id) return { perfumerIngredientId: "", mapStatus: "unmapped" };
  if (!LAB_CHEMICAL_IDS.has(id)) {
    return { perfumerIngredientId: id, mapStatus: "unmapped" };
  }
  const mapped = LAB_TO_PERFUMER[id];
  if (mapped) return { ...mapped };
  return { perfumerIngredientId: id, mapStatus: "exact" };
}

export const DEFAULT_TEACHING_BATCH_ML = 20;

export function amountMlFromPercent(
  percent: number,
  teachingBatchMl = DEFAULT_TEACHING_BATCH_ML,
): number {
  const p = Number(percent) || 0;
  const batch = Number(teachingBatchMl) || DEFAULT_TEACHING_BATCH_ML;
  return Math.max(0.5, Math.round((p / 100) * batch * 10) / 10);
}
