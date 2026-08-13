import { PERFUME_BADGE_IDS, PERFUME_RECIPE_BY_ID } from "@/domains/chemistry/perfume";
import { STAR_CATALOG_BY_ID } from "@/domains/chemistry/perfume/starCatalog";
import { PRODUCT_GOALS } from "@/domains/chemistry/data/goals";
import { CHEMICAL_BY_ID } from "@/domains/chemistry/data/chemicals";
import type { ReactionType } from "@/domains/chemistry/types";

const DISCOVERY_BADGE_IDS = [
  "first-precipitate",
  "first-combustion",
  "first-redox",
  "first-neutralization",
  "first-gas",
] as const;

export const VALID_BADGE_IDS = new Set<string>([
  ...DISCOVERY_BADGE_IDS,
  ...PRODUCT_GOALS.map((g) => g.badgeId),
  ...PERFUME_BADGE_IDS,
]);

export const VALID_PERFUME_RECIPE_IDS = new Set(
  Object.keys(PERFUME_RECIPE_BY_ID),
);

export const VALID_SHOP_ITEM_IDS = new Set(Object.keys(STAR_CATALOG_BY_ID));

const VALID_REACTION_TYPES = new Set<ReactionType>([
  "neutralization",
  "precipitation",
  "single-displacement",
  "double-displacement",
  "redox",
  "combustion",
  "gas-forming",
  "product-craft",
  "no-reaction",
  "hazard",
]);

const MAX_DISCOVERIES = 500;
/** Perfume badges alone are 50+; keep headroom */
export const MAX_BADGES = 256;
const MAX_XP = 50_000;
export const MAX_STARS = 10_000;
/** Max XP a single sync may add above the cloud value */
export const MAX_XP_DELTA = 200;
/** Max stars a single perfume-progress sync may add */
export const MAX_STARS_DELTA = 5;
const MAX_DISCOVERY_ID_LEN = 240;

/**
 * discoveryId format: `${reactionType}::${sortedReactantIds}::${label}`
 */
export function isValidDiscoveryId(id: string): boolean {
  if (!id || id.length > MAX_DISCOVERY_ID_LEN) return false;
  const parts = id.split("::");
  if (parts.length < 3) return false;
  const [type, reactants] = parts;
  if (!type || !VALID_REACTION_TYPES.has(type as ReactionType)) return false;
  if (!reactants) return false;
  const ids = reactants.split("+").filter(Boolean);
  if (ids.length === 0 || ids.length > 8) return false;
  return ids.every((rid) => Boolean(CHEMICAL_BY_ID[rid]));
}

const MAX_INVENTIONS = 80;
const MAX_INVENTION_NAME = 80;
const MAX_VERSIONS_PER = 20;
const MAX_CONTENT_IDS = 12;

export type SanitizedInvention = {
  id: string;
  name: string;
  kind: string;
  sourceGoalId?: string;
  perfumeRecipeId?: string;
  coverVisualKind: string;
  bestScore: number;
  createdAt: number;
  updatedAt: number;
  versions: {
    version: number;
    score: number;
    tier: string;
    notes: string[];
    createdAt: number;
    snapshot: {
      equipmentId: string;
      contentIds: string[];
      contents?: { chemicalId: string; amountMl: number }[];
      heatAttached: boolean;
      coolAttached: boolean;
      stirLevel: number;
    };
  }[];
};

export function sanitizeInventionsInput(
  raw: unknown,
): SanitizedInvention[] | { error: string } {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) return { error: "Invalid inventions" };
  if (raw.length > MAX_INVENTIONS) return { error: "Too many inventions" };

  const out: SanitizedInvention[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const inv = item as Record<string, unknown>;
    if (typeof inv.id !== "string" || inv.id.length < 4 || inv.id.length > 80) {
      continue;
    }
    if (typeof inv.name !== "string" || !inv.name.trim()) continue;
    if (!Array.isArray(inv.versions) || inv.versions.length === 0) continue;

    const versions = [];
    for (const v of inv.versions.slice(0, MAX_VERSIONS_PER)) {
      if (!v || typeof v !== "object") continue;
      const ver = v as Record<string, unknown>;
      const snap = ver.snapshot as Record<string, unknown> | undefined;
      if (!snap || typeof snap !== "object") continue;
      if (typeof snap.equipmentId !== "string") continue;
      if (!Array.isArray(snap.contentIds)) continue;
      const contentIds = snap.contentIds
        .filter((id): id is string => typeof id === "string")
        .slice(0, MAX_CONTENT_IDS);
      const contentsRaw = Array.isArray(snap.contents) ? snap.contents : [];
      const contents = contentsRaw
        .filter(
          (c): c is { chemicalId: string; amountMl: number } =>
            Boolean(
              c &&
                typeof c === "object" &&
                typeof (c as { chemicalId?: unknown }).chemicalId ===
                  "string" &&
                typeof (c as { amountMl?: unknown }).amountMl === "number",
            ),
        )
        .slice(0, MAX_CONTENT_IDS)
        .map((c) => ({
          chemicalId: String(c.chemicalId).slice(0, 64),
          amountMl: Math.max(
            0,
            Math.min(500, Math.round(Number(c.amountMl) * 100) / 100),
          ),
        }));
      const score =
        typeof ver.score === "number" && Number.isFinite(ver.score)
          ? Math.max(0, Math.min(100, Math.floor(ver.score)))
          : 0;
      versions.push({
        version:
          typeof ver.version === "number" ? Math.floor(ver.version) : versions.length + 1,
        score,
        tier: typeof ver.tier === "string" ? ver.tier.slice(0, 20) : "make",
        notes: Array.isArray(ver.notes)
          ? ver.notes
              .filter((n): n is string => typeof n === "string")
              .slice(0, 8)
              .map((n) => n.slice(0, 160))
          : [],
        createdAt:
          typeof ver.createdAt === "number" ? ver.createdAt : Date.now(),
        snapshot: {
          equipmentId: snap.equipmentId.slice(0, 40),
          contentIds,
          ...(contents.length ? { contents } : {}),
          heatAttached: Boolean(snap.heatAttached),
          coolAttached: Boolean(snap.coolAttached),
          stirLevel:
            typeof snap.stirLevel === "number"
              ? Math.max(0, Math.min(3, Math.floor(snap.stirLevel)))
              : 0,
        },
      });
    }
    if (!versions.length) continue;

    const bestScore = Math.max(
      ...versions.map((v) => v.score),
      typeof inv.bestScore === "number" ? Math.floor(inv.bestScore) : 0,
    );

    out.push({
      id: inv.id,
      name: String(inv.name).trim().slice(0, MAX_INVENTION_NAME),
      kind: typeof inv.kind === "string" ? inv.kind.slice(0, 32) : "other",
      sourceGoalId:
        typeof inv.sourceGoalId === "string"
          ? inv.sourceGoalId.slice(0, 80)
          : undefined,
      perfumeRecipeId:
        typeof inv.perfumeRecipeId === "string"
          ? inv.perfumeRecipeId.slice(0, 80)
          : undefined,
      coverVisualKind:
        typeof inv.coverVisualKind === "string"
          ? inv.coverVisualKind.slice(0, 32)
          : "bottle",
      bestScore: Math.max(0, Math.min(100, bestScore)),
      createdAt: typeof inv.createdAt === "number" ? inv.createdAt : Date.now(),
      updatedAt: typeof inv.updatedAt === "number" ? inv.updatedAt : Date.now(),
      versions,
    });
  }
  return out.slice(0, MAX_INVENTIONS);
}

/** Merge client inventions with cloud; prefer higher updatedAt / bestScore. */
export function mergeInventions(
  existing: SanitizedInvention[],
  incoming: SanitizedInvention[],
): { inventions: SanitizedInvention[]; improveStarEligible: number } {
  const byId = new Map<string, SanitizedInvention>();
  for (const inv of existing) byId.set(inv.id, inv);

  let improveStarEligible = 0;
  for (const inv of incoming) {
    const prev = byId.get(inv.id);
    if (!prev) {
      byId.set(inv.id, inv);
      continue;
    }
    if (inv.bestScore > prev.bestScore) {
      improveStarEligible += 1;
    }
    if ((inv.updatedAt ?? 0) >= (prev.updatedAt ?? 0)) {
      byId.set(inv.id, {
        ...inv,
        bestScore: Math.max(prev.bestScore, inv.bestScore),
        versions:
          inv.versions.length >= prev.versions.length
            ? inv.versions
            : prev.versions,
      });
    } else if (inv.bestScore > prev.bestScore) {
      byId.set(inv.id, {
        ...prev,
        bestScore: inv.bestScore,
        versions: inv.versions,
        updatedAt: inv.updatedAt,
      });
    }
  }

  const inventions = Array.from(byId.values())
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_INVENTIONS);

  return { inventions, improveStarEligible };
}

export function sanitizeProgressInput(input: {
  xp: number;
  discoveredIds: string[];
  badgeIds: string[];
  completedPerfumeIds?: string[];
  starsDelta?: number;
  inventionsOnly?: boolean;
}):
  | {
      xp: number;
      discoveredIds: string[];
      badgeIds: string[];
      completedPerfumeIds: string[];
      starsDelta: number;
      inventionsOnly: boolean;
    }
  | { error: string } {
  if (input.inventionsOnly) {
    let starsDelta = 0;
    if (input.starsDelta !== undefined) {
      if (
        typeof input.starsDelta !== "number" ||
        !Number.isFinite(input.starsDelta) ||
        input.starsDelta < 0 ||
        input.starsDelta > MAX_STARS_DELTA
      ) {
        return { error: "Invalid starsDelta" };
      }
      starsDelta = Math.floor(input.starsDelta);
    }
    return {
      xp: 0,
      discoveredIds: [],
      badgeIds: [],
      completedPerfumeIds: [],
      starsDelta,
      inventionsOnly: true,
    };
  }
  if (
    typeof input.xp !== "number" ||
    !Number.isFinite(input.xp) ||
    input.xp < 0 ||
    input.xp > MAX_XP
  ) {
    return { error: "Invalid xp" };
  }

  if (!Array.isArray(input.discoveredIds) || !Array.isArray(input.badgeIds)) {
    return { error: "Invalid progress arrays" };
  }

  if (
    input.discoveredIds.length > MAX_DISCOVERIES ||
    input.badgeIds.length > MAX_BADGES
  ) {
    return { error: "Progress payload too large" };
  }

  const discoveredIds = Array.from(
    new Set(
      input.discoveredIds.filter(
        (id): id is string => typeof id === "string" && isValidDiscoveryId(id),
      ),
    ),
  );

  const badgeIds = Array.from(
    new Set(
      input.badgeIds.filter(
        (id): id is string =>
          typeof id === "string" && VALID_BADGE_IDS.has(id),
      ),
    ),
  );

  const completedPerfumeIds = Array.from(
    new Set(
      (input.completedPerfumeIds ?? []).filter(
        (id): id is string =>
          typeof id === "string" && VALID_PERFUME_RECIPE_IDS.has(id),
      ),
    ),
  ).slice(0, 200);

  let starsDelta = 0;
  if (input.starsDelta !== undefined) {
    if (
      typeof input.starsDelta !== "number" ||
      !Number.isFinite(input.starsDelta) ||
      input.starsDelta < 0 ||
      input.starsDelta > MAX_STARS_DELTA
    ) {
      return { error: "Invalid starsDelta" };
    }
    starsDelta = Math.floor(input.starsDelta);
  }

  return {
    xp: Math.floor(input.xp),
    discoveredIds,
    badgeIds,
    completedPerfumeIds,
    starsDelta,
    inventionsOnly: false,
  };
}

export function mergeProgress(
  existing: {
    xp: number;
    discoveredIds: string[];
    badgeIds: string[];
    completedPerfumeIds?: string[];
    stars?: number;
  },
  incoming: {
    xp: number;
    discoveredIds: string[];
    badgeIds: string[];
    completedPerfumeIds: string[];
    starsDelta: number;
    inventionsOnly?: boolean;
  },
  opts?: { improveStarEligible?: number },
): {
  xp: number;
  discoveredIds: string[];
  badgeIds: string[];
  completedPerfumeIds: string[];
  stars: number;
  starsGranted: number;
} {
  if (incoming.inventionsOnly) {
    const eligible = Math.max(0, opts?.improveStarEligible ?? 0);
    const starsGranted = Math.min(
      incoming.starsDelta,
      eligible,
      MAX_STARS_DELTA,
    );
    const stars = Math.min(
      MAX_STARS,
      Math.max(0, (existing.stars ?? 0) + starsGranted),
    );
    return {
      xp: existing.xp,
      discoveredIds: existing.discoveredIds,
      badgeIds: existing.badgeIds,
      completedPerfumeIds: existing.completedPerfumeIds ?? [],
      stars,
      starsGranted,
    };
  }

  const discoveredIds = Array.from(
    new Set([...existing.discoveredIds, ...incoming.discoveredIds]),
  ).slice(0, MAX_DISCOVERIES);

  const badgeIds = Array.from(
    new Set([...existing.badgeIds, ...incoming.badgeIds]),
  ).slice(0, MAX_BADGES);

  const prevPerfumes = new Set(existing.completedPerfumeIds ?? []);
  const newPerfumes = incoming.completedPerfumeIds.filter(
    (id) => !prevPerfumes.has(id),
  );
  const completedPerfumeIds = Array.from(
    new Set([...(existing.completedPerfumeIds ?? []), ...incoming.completedPerfumeIds]),
  ).slice(0, 200);

  const cappedIncomingXp = Math.min(
    incoming.xp,
    existing.xp + MAX_XP_DELTA,
    MAX_XP,
  );
  const xp = Math.max(existing.xp, cappedIncomingXp);

  // First-clear perfume stars: min(client delta, new first clears, MAX_STARS_DELTA)
  const firstClearStars = newPerfumes.reduce((sum, id) => {
    const recipe = PERFUME_RECIPE_BY_ID[id];
    return sum + (recipe?.starReward ?? 0);
  }, 0);
  const improveEligible = Math.max(0, opts?.improveStarEligible ?? 0);
  const starsGranted = Math.min(
    incoming.starsDelta,
    Math.max(firstClearStars, improveEligible),
    MAX_STARS_DELTA,
  );
  const stars = Math.min(
    MAX_STARS,
    Math.max(0, (existing.stars ?? 0) + starsGranted),
  );

  return { xp, discoveredIds, badgeIds, completedPerfumeIds, stars, starsGranted };
}
