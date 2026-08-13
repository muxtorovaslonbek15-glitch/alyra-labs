"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { EngineResult } from "@/types";
import { PRODUCT_GOALS } from "@/domains/chemistry/data/goals";
import { SOLID_PERFUME_GOALS } from "@/domains/chemistry/data/solidPerfume";
import { PERFUME_RECIPES, getPerfumeRecipe } from "@/domains/chemistry/perfume";
import { useAuthStore } from "@/store/authStore";
import { syncProgressToFirestore } from "@/lib/firebase/profile";

export interface JournalEntry {
  discoveryId: string;
  label: string;
  explanationKey?: string;
  ok: boolean;
  at: number;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  earnedAt?: number;
}

const DISCOVERY_BADGES: Omit<Badge, "earnedAt">[] = [
  {
    id: "first-precipitate",
    title: "First Precipitate",
    description: "Form a solid from two solutions",
  },
  {
    id: "first-combustion",
    title: "First Combustion",
    description: "Ignite a fuel with oxygen",
  },
  {
    id: "first-redox",
    title: "First Redox",
    description: "Transfer electrons between species",
  },
  {
    id: "first-neutralization",
    title: "First Neutralization",
    description: "Neutralize an acid with a base",
  },
  {
    id: "first-gas",
    title: "Gas Producer",
    description: "Release a gas in a reaction",
  },
];

const GOAL_BADGES: Omit<Badge, "earnedAt">[] = [
  ...PRODUCT_GOALS.map((g) => ({
    id: g.badgeId,
    title: g.title,
    description: g.tagline,
  })),
  ...SOLID_PERFUME_GOALS.map((g) => ({
    id: g.badgeId,
    title: g.title,
    description: g.tagline,
  })),
];

const PERFUME_BADGES: Omit<Badge, "earnedAt">[] = PERFUME_RECIPES.map((p) => ({
  id: p.badgeId,
  title: p.displayName,
  description: p.brandLabel,
}));

export const BADGE_DEFS: Omit<Badge, "earnedAt">[] = [
  ...DISCOVERY_BADGES,
  ...GOAL_BADGES,
  ...PERFUME_BADGES,
];

function mergeBadges(saved?: Badge[]): Badge[] {
  const earnedAt = new Map(
    (saved ?? []).filter((b) => b.earnedAt).map((b) => [b.id, b.earnedAt!]),
  );
  return BADGE_DEFS.map((b) => ({
    ...b,
    ...(earnedAt.has(b.id) ? { earnedAt: earnedAt.get(b.id) } : {}),
  }));
}

export const QUESTS = [
  {
    id: "quest-gas",
    prompt: "Try to produce a gas",
    check: (r: EngineResult) => r.effects.some((e) => e.kind === "gas"),
  },
  {
    id: "quest-ppt",
    prompt: "Form a precipitate",
    check: (r: EngineResult) =>
      r.effects.some((e) => e.kind === "precipitate"),
  },
  {
    id: "quest-burn",
    prompt: "Run a combustion reaction",
    check: (r: EngineResult) => r.explanationKey === "combustion",
  },
  {
    id: "quest-neutral",
    prompt: "Neutralize an acid with a base",
    check: (r: EngineResult) => r.explanationKey === "neutralization",
  },
];

interface ProgressState {
  xp: number;
  stars: number;
  lastDailyStarAt: number;
  unlockedShopItemIds: string[];
  completedPerfumeIds: string[];
  discoveredIds: string[];
  journal: JournalEntry[];
  badges: Badge[];
  questIndex: number;
  completedQuests: string[];
  explanationCache: Record<string, string>;
  recordDiscovery: (result: EngineResult) => {
    isNew: boolean;
    xpGained: number;
    newBadges: Badge[];
    questCompleted?: { xpGained: number; prompt: string };
  };
  setExplanationCache: (discoveryId: string, text: string) => void;
  advanceQuestIfNeeded: (result: EngineResult) => {
    completed: boolean;
    xpGained: number;
    prompt?: string;
  };
  awardGoalXp: (badgeId: string, goalTitle?: string) => { xpGained: number };
  awardPerfumeComplete: (recipeId: string) => {
    xpGained: number;
    starsGained: number;
    firstClear: boolean;
  };
  setStarsFromServer: (data: {
    stars: number;
    lastDailyStarAt?: number;
    unlockedShopItemIds?: string[];
  }) => void;
  xpLevel: () => { level: number; intoLevel: number; toNext: number };
  hydrateFromCloud: (data: {
    xp: number;
    discoveredIds: string[];
    badgeIds: string[];
    stars?: number;
    lastDailyStarAt?: number;
    unlockedShopItemIds?: string[];
    completedPerfumeIds?: string[];
  }) => void;
}

function badgeForResult(result: EngineResult): string | null {
  if (result.explanationKey === "precipitation") return "first-precipitate";
  if (result.explanationKey === "combustion") return "first-combustion";
  if (result.explanationKey === "redox") return "first-redox";
  if (result.explanationKey === "neutralization") return "first-neutralization";
  if (result.effects.some((e) => e.kind === "gas")) return "first-gas";
  return null;
}

function pushProgressToCloud(starsDelta = 0) {
  const uid = useAuthStore.getState().user?.uid;
  if (!uid) return;
  const s = useProgressStore.getState();
  const badgeIds = s.badges.filter((b) => b.earnedAt).map((b) => b.id);
  void syncProgressToFirestore(uid, {
    xp: s.xp,
    discoveredIds: s.discoveredIds,
    badgeIds,
    completedPerfumeIds: s.completedPerfumeIds,
    starsDelta,
  }).catch(() => {
    /* best-effort sync */
  });
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      xp: 0,
      stars: 0,
      lastDailyStarAt: 0,
      unlockedShopItemIds: [],
      completedPerfumeIds: [],
      discoveredIds: [],
      journal: [],
      badges: mergeBadges(),
      questIndex: 0,
      completedQuests: [],
      explanationCache: {},

      hydrateFromCloud: ({
        xp,
        discoveredIds,
        badgeIds,
        stars,
        lastDailyStarAt,
        unlockedShopItemIds,
        completedPerfumeIds,
      }) => {
        set((s) => ({
          xp: Math.max(s.xp, xp),
          stars: Math.max(s.stars, stars ?? 0),
          lastDailyStarAt: Math.max(s.lastDailyStarAt, lastDailyStarAt ?? 0),
          unlockedShopItemIds: Array.from(
            new Set([
              ...s.unlockedShopItemIds,
              ...(unlockedShopItemIds ?? []),
            ]),
          ),
          completedPerfumeIds: Array.from(
            new Set([
              ...s.completedPerfumeIds,
              ...(completedPerfumeIds ?? []),
            ]),
          ),
          discoveredIds: Array.from(
            new Set([...s.discoveredIds, ...discoveredIds]),
          ),
          badges: mergeBadges(
            s.badges.map((b) =>
              badgeIds.includes(b.id) && !b.earnedAt
                ? { ...b, earnedAt: Date.now() }
                : b,
            ),
          ),
        }));
      },

      setStarsFromServer: ({ stars, lastDailyStarAt, unlockedShopItemIds }) => {
        set((s) => ({
          stars,
          ...(lastDailyStarAt !== undefined
            ? { lastDailyStarAt }
            : {}),
          ...(unlockedShopItemIds
            ? {
                unlockedShopItemIds: Array.from(
                  new Set([
                    ...s.unlockedShopItemIds,
                    ...unlockedShopItemIds,
                  ]),
                ),
              }
            : {}),
        }));
      },

      recordDiscovery: (result) => {
        if (!result.discoveryId || result.explanationKey === "no-reaction") {
          return { isNew: false, xpGained: 0, newBadges: [] };
        }
        const known = get().discoveredIds.includes(result.discoveryId);
        if (known) {
          return { isNew: false, xpGained: 0, newBadges: [] };
        }

        const xpGained = result.ok ? 25 : 10;
        const badgeId = badgeForResult(result);
        const newBadges: Badge[] = [];

        set((s) => {
          const badges = s.badges.map((b) => {
            if (badgeId && b.id === badgeId && !b.earnedAt) {
              const earned = { ...b, earnedAt: Date.now() };
              newBadges.push(earned);
              return earned;
            }
            return b;
          });
          return {
            xp: s.xp + xpGained,
            discoveredIds: [...s.discoveredIds, result.discoveryId],
            journal: [
              {
                discoveryId: result.discoveryId,
                label: result.label ?? result.explanationKey ?? "Reaction",
                explanationKey: result.explanationKey,
                ok: result.ok,
                at: Date.now(),
              },
              ...s.journal,
            ].slice(0, 100),
            badges,
          };
        });

        const quest = get().advanceQuestIfNeeded(result);
        pushProgressToCloud();
        return {
          isNew: true,
          xpGained,
          newBadges,
          questCompleted:
            quest.completed && quest.prompt
              ? { xpGained: quest.xpGained, prompt: quest.prompt }
              : undefined,
        };
      },

      setExplanationCache: (discoveryId, text) => {
        set((s) => ({
          explanationCache: { ...s.explanationCache, [discoveryId]: text },
        }));
      },

      xpLevel: () => {
        const xp = get().xp;
        const level = Math.floor(xp / 100) + 1;
        const intoLevel = xp % 100;
        return { level, intoLevel, toNext: 100 - intoLevel };
      },

      advanceQuestIfNeeded: (result) => {
        const quest = QUESTS[get().questIndex % QUESTS.length];
        if (!quest) return { completed: false, xpGained: 0 };
        if (get().completedQuests.includes(quest.id)) {
          set((s) => ({ questIndex: s.questIndex + 1 }));
          return { completed: false, xpGained: 0 };
        }
        if (quest.check(result)) {
          set((s) => ({
            completedQuests: [...s.completedQuests, quest.id],
            questIndex: s.questIndex + 1,
            xp: s.xp + 15,
          }));
          pushProgressToCloud();
          return { completed: true, xpGained: 15, prompt: quest.prompt };
        }
        return { completed: false, xpGained: 0 };
      },

      awardGoalXp: (badgeId) => {
        const already = get().badges.find((b) => b.id === badgeId)?.earnedAt;
        const xpGained = already ? 10 : 40;
        set((s) => {
          const badges = mergeBadges(
            s.badges.map((b) => {
              if (b.id === badgeId && !b.earnedAt) {
                return { ...b, earnedAt: Date.now() };
              }
              return b;
            }),
          );
          if (!badges.some((b) => b.id === badgeId)) {
            const goal =
              PRODUCT_GOALS.find((g) => g.badgeId === badgeId) ??
              SOLID_PERFUME_GOALS.find((g) => g.badgeId === badgeId);
            const perfume = PERFUME_RECIPES.find((p) => p.badgeId === badgeId);
            badges.push({
              id: badgeId,
              title: goal?.title ?? perfume?.displayName ?? badgeId,
              description:
                goal?.tagline ?? perfume?.brandLabel ?? "Goal complete",
              earnedAt: Date.now(),
            });
          }
          return { xp: s.xp + xpGained, badges };
        });
        pushProgressToCloud();
        return { xpGained };
      },

      awardPerfumeComplete: (recipeId) => {
        const recipe = getPerfumeRecipe(recipeId);
        if (!recipe) {
          return { xpGained: 0, starsGained: 0, firstClear: false };
        }
        const firstClear = !get().completedPerfumeIds.includes(recipeId);
        const xpGained = firstClear ? recipe.xpReward : 10;
        const starsGained = firstClear ? recipe.starReward : 0;

        set((s) => {
          const badges = mergeBadges(
            s.badges.map((b) => {
              if (b.id === recipe.badgeId && !b.earnedAt) {
                return { ...b, earnedAt: Date.now() };
              }
              return b;
            }),
          );
          return {
            xp: s.xp + xpGained,
            stars: s.stars + starsGained,
            completedPerfumeIds: firstClear
              ? [...s.completedPerfumeIds, recipeId]
              : s.completedPerfumeIds,
            badges,
            journal: [
              {
                discoveryId: `perfume::${recipeId}`,
                label: `Bottled ${recipe.displayName}`,
                explanationKey: `product-perfume:${recipeId}`,
                ok: true,
                at: Date.now(),
              },
              ...s.journal,
            ].slice(0, 100),
          };
        });
        pushProgressToCloud(starsGained);
        return { xpGained, starsGained, firstClear };
      },
    }),
    {
      name: "chemlab-progress",
      version: 3,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<ProgressState>;
        return {
          ...current,
          ...p,
          badges: mergeBadges(p.badges),
          stars: typeof p.stars === "number" ? p.stars : 0,
          lastDailyStarAt:
            typeof p.lastDailyStarAt === "number" ? p.lastDailyStarAt : 0,
          unlockedShopItemIds: Array.isArray(p.unlockedShopItemIds)
            ? p.unlockedShopItemIds
            : [],
          completedPerfumeIds: Array.isArray(p.completedPerfumeIds)
            ? p.completedPerfumeIds
            : [],
        };
      },
      partialize: (s) => ({
        xp: s.xp,
        stars: s.stars,
        lastDailyStarAt: s.lastDailyStarAt,
        unlockedShopItemIds: s.unlockedShopItemIds,
        completedPerfumeIds: s.completedPerfumeIds,
        discoveredIds: s.discoveredIds,
        journal: s.journal,
        badges: s.badges,
        questIndex: s.questIndex,
        completedQuests: s.completedQuests,
        explanationCache: s.explanationCache,
      }),
    },
  ),
);
