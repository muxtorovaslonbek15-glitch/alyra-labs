"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  PRODUCT_GOALS,
  getGoal,
  goalDifficulty,
  type ProductGoal,
} from "@/domains/chemistry/data/goals";
import {
  PERFUME_RECIPES,
  getPerfumeGoal,
  DIFFICULTY_REWARDS,
} from "@/domains/chemistry/perfume";
import {
  SOLID_PERFUME_GOALS,
  allSolidFormulaGoals,
} from "@/domains/chemistry/data/solidPerfume";
import { useGoalStore } from "@/store/goalStore";
import { useProgressStore } from "@/store/progressStore";
import { useAuthStore } from "@/store/authStore";
import { track } from "@/lib/analytics/track";
import { DifficultyBadge } from "@/perfume/DifficultyBadge";
import { getAuthHeaders } from "@/lib/client/authHeaders";
import { useWearStore } from "@/wear/wearStore";
import { usePresence } from "@/animation/usePresence";

const QUIET_FOCUS =
  "outline-none focus-visible:ring-1 focus-visible:ring-lab-line";

function resolveGoal(id: string): ProductGoal | null {
  return getGoal(id) ?? null;
}

type GoalFilter = "all" | "product" | "classic" | "solid";

const FILTERS: { id: GoalFilter; label: string }[] = [
  { id: "solid", label: "Solid tins" },
  { id: "all", label: "All" },
  { id: "product", label: "Products" },
  { id: "classic", label: "Classic lab" },
];

const SOLID_SPOTLIGHT_IDS = [
  "solid-perfume",
  "solid-india-mogra",
  "solid-india-khus",
  "solid-india-oud",
  "solid-india-attar-rose",
  "solid-aroma-sandal-rose",
] as const;

/** Havas first — Hard showcase so Goals never feels citrus-only */
const SPOTLIGHT_IDS = [
  "inspired-havas",
  "inspired-sauvage",
  "inspired-chanel5",
  "inspired-baccarat",
  "inspired-1million",
  "inspired-jadore",
] as const;

export function GoalPicker({
  onOpenAtelier,
}: {
  onOpenAtelier?: () => void;
} = {}) {
  const open = useGoalStore((s) => s.pickerOpen);
  const setPickerOpen = useGoalStore((s) => s.setPickerOpen);
  const isWear = useWearStore((s) => s.audience === "owner");
  const startGoal = useGoalStore((s) => s.startGoal);
  const completedGoalIds = useGoalStore((s) => s.completedGoalIds);
  const activeGoalId = useGoalStore((s) => s.activeGoalId);
  const completedPerfumes = useProgressStore((s) => s.completedPerfumeIds);
  const user = useAuthStore((s) => s.user);
  const [filter, setFilter] = useState<GoalFilter>("solid");
  const [classGoalIds, setClassGoalIds] = useState<string[]>([]);
  const closeRef = useRef<HTMLButtonElement>(null);

  const solidCatalog = useMemo(() => {
    const seen = new Set<string>();
    const out: ProductGoal[] = [];
    for (const g of [...SOLID_PERFUME_GOALS, ...allSolidFormulaGoals()]) {
      if (seen.has(g.id)) continue;
      seen.add(g.id);
      out.push(g);
    }
    return out;
  }, []);

  const catalog = PRODUCT_GOALS;

  const filtered = useMemo(() => {
    if (filter === "solid") return solidCatalog;
    if (filter === "all") return [...SOLID_PERFUME_GOALS, ...catalog];
    return PRODUCT_GOALS.filter((g) => g.category === filter);
  }, [filter, catalog, solidCatalog]);

  const [packGoalFilter, setPackGoalFilter] = useState<string[] | "all">("all");
  const [perfumeAllowed, setPerfumeAllowed] = useState(true);

  const visibleCatalog = useMemo(() => {
    if (packGoalFilter === "all") return filtered;
    const allow = new Set(packGoalFilter);
    return filtered.filter((g) => allow.has(g.id));
  }, [filtered, packGoalFilter]);

  const classGoals = useMemo(
    () =>
      classGoalIds
        .map((id) => resolveGoal(id))
        .filter((g): g is ProductGoal => Boolean(g)),
    [classGoalIds],
  );

  const spotlight = useMemo(
    () =>
      SPOTLIGHT_IDS.map((id) => PERFUME_RECIPES.find((r) => r.id === id)).filter(
        (r): r is (typeof PERFUME_RECIPES)[number] => Boolean(r),
      ),
    [],
  );

  const doneCount = completedGoalIds.filter(
    (id) =>
      catalog.some((g) => g.id === id) ||
      solidCatalog.some((g) => g.id === id),
  ).length;

  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    void (async () => {
      const headers = await getAuthHeaders();
      if (!headers || cancelled) return;
      const [classRes, packRes] = await Promise.all([
        fetch("/api/class-goals", { headers }),
        fetch("/api/content-packs", { headers }),
      ]);
      if (cancelled) return;
      if (classRes.ok) {
        const json = (await classRes.json()) as { goalIds?: string[] };
        setClassGoalIds(json.goalIds ?? []);
      }
      if (packRes.ok) {
        const json = (await packRes.json()) as {
          goalIds?: string[] | "all";
          perfumeAtelier?: boolean;
        };
        setPackGoalFilter(json.goalIds === "all" ? "all" : (json.goalIds ?? "all"));
        setPerfumeAllowed(json.perfumeAtelier !== false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, user]);

  const pickerLive = open && !isWear;
  const { mounted, visible } = usePresence(pickerLive);

  useEffect(() => {
    if (isWear && open) setPickerOpen(false);
  }, [isWear, open, setPickerOpen]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPickerOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setPickerOpen]);

  if (!mounted || typeof document === "undefined") return null;

  function openAtelier(from: string) {
    track("perfume_atelier_open", { from });
    setPickerOpen(false);
    onOpenAtelier?.();
  }

  return createPortal(
    <div
      className={`fixed inset-0 z-[260] flex items-start justify-center overflow-visible p-3 pt-[8vh] ${
        visible ? "" : "pointer-events-none"
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Choose a recipe"
    >
      <button
        type="button"
        className="lab-overlay-scrim absolute inset-0 bg-lab-ink/45 backdrop-blur-[2px]"
        data-open={visible}
        aria-label="Close recipes"
        onClick={() => setPickerOpen(false)}
      />
      <div
        className="lab-overlay-panel relative z-[1] flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-lab-line/60 bg-lab-panel shadow-2xl"
        data-open={visible}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 border-b border-lab-line/50 px-3 py-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-label text-lab-muted">
              Recipes · {doneCount}/{visibleCatalog.length} shown
            </p>
            <h2 className="font-display text-xl tracking-display text-lab-ink">
              Make something real
            </h2>
            <p className="mt-0.5 text-[11px] text-lab-muted">
              Solid tins are the Alyra path. Sprays live in the Atelier.
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className={`rounded-md px-1.5 py-0.5 text-xs text-lab-muted hover:bg-lab-wash hover:text-lab-ink ${QUIET_FOCUS}`}
            onClick={() => setPickerOpen(false)}
          >
            ✕
          </button>
        </div>

        {classGoals.length > 0 ? (
          <div className="border-b border-lab-line/40 bg-lab-amber/10 px-3 py-2.5">
            <p className="text-[9px] font-semibold uppercase tracking-label text-lab-amber">
              Class recipes
            </p>
            <ul className="mt-1.5 space-y-1">
              {classGoals.map((g) => {
                const done =
                  completedGoalIds.includes(g.id) ||
                  completedPerfumes.includes(g.id);
                return (
                  <li key={`class-${g.id}`}>
                    <button
                      type="button"
                      onClick={() => {
                        track("goal_start", {
                          goalId: g.id,
                          from: "class_goals",
                        });
                        startGoal(g.id);
                        setPickerOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg border border-lab-amber/30 bg-white/80 px-2.5 py-1.5 text-left hover:border-lab-ink/40 ${QUIET_FOCUS}`}
                    >
                      <span className="text-xs font-semibold text-lab-ink">
                        {g.icon} {g.title}
                      </span>
                      <span className="text-[10px] text-lab-muted">
                        {done ? "✓" : goalDifficulty(g)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        <div className="border-b border-lab-line/40 bg-lab-wash/40 px-3 py-3">
          <p className="text-[9px] font-semibold uppercase tracking-label text-lab-muted">
            Solid perfume · tin
          </p>
          <p className="font-display text-lg text-lab-ink">
            {solidCatalog.length} wax · oil · load tracks
          </p>
          <p className="mt-0.5 text-[11px] text-lab-muted">
            Melt, fragrance load, Cast into the cup, cool. India heat: firmer wax. ₹ teaching, not medical.
          </p>
          <div className="scroll-thin mt-2 flex gap-1.5 overflow-x-auto pb-0.5">
            {SOLID_SPOTLIGHT_IDS.map((id) => {
              const g = resolveGoal(id);
              if (!g) return null;
              const done = completedGoalIds.includes(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  title={g.tagline}
                  onClick={() => {
                    track("goal_start", { goalId: g.id, from: "solid_spotlight" });
                    startGoal(g.id);
                    setPickerOpen(false);
                  }}
                  className={`flex w-22 shrink-0 flex-col rounded-lg border border-lab-line/50 bg-white/80 px-1.5 py-1.5 text-left hover:border-lab-ink/40 hover:bg-white ${QUIET_FOCUS}`}
                >
                  <span className="text-sm" aria-hidden>
                    {g.icon}
                  </span>
                  <span className="mt-0.5 line-clamp-2 text-[9px] font-semibold leading-tight text-lab-ink">
                    {g.title.replace(/^Make /, "")}
                  </span>
                  {done ? (
                    <span className="mt-0.5 text-[8px] font-semibold text-lab-teal">
                      ✓
                    </span>
                  ) : (
                    <span className="mt-0.5 text-[8px] text-lab-muted">
                      {g.steps.length} steps
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setFilter("solid")}
            className={`mt-2.5 w-full rounded-lg border border-lab-line/70 bg-white px-3 py-2 text-xs font-semibold text-lab-ink hover:border-lab-ink/40 hover:bg-lab-wash ${QUIET_FOCUS}`}
          >
            All solid tins →
          </button>
        </div>

        {perfumeAllowed ? (
        <div className="border-b border-lab-line/40 bg-linear-to-br from-lab-teal/10 via-lab-panel to-lab-amber/10 px-3 py-3">
          <p className="text-[9px] font-semibold uppercase tracking-label text-lab-teal">
            Perfume atelier
          </p>
          <p className="font-display text-lg text-lab-ink">
            {PERFUME_RECIPES.length}+ inspired scents
          </p>
          <p className="mt-0.5 text-[11px] text-lab-muted">
            Easy → Very hard. Tap Havas or browse the full catalog.
          </p>
          <div className="scroll-thin mt-2 flex gap-1.5 overflow-x-auto pb-0.5">
            {spotlight.map((r) => {
              const done = completedPerfumes.includes(r.id);
              const goal = getPerfumeGoal(r.id);
              const steps = goal?.steps.length;
              return (
                <button
                  key={r.id}
                  type="button"
                  title={`${r.displayName} · ${DIFFICULTY_REWARDS[r.difficulty].label}`}
                  onClick={() => {
                    track("perfume_start", {
                      recipeId: r.id,
                      from: "goals_spotlight",
                      difficulty: r.difficulty,
                      stepCount: steps,
                    });
                    startGoal(r.id);
                    setPickerOpen(false);
                  }}
                  className={`group flex w-20 shrink-0 flex-col items-center rounded-lg border border-lab-line/50 bg-white/80 px-1 py-1.5 hover:border-lab-ink/40 hover:bg-white ${QUIET_FOCUS}`}
                >
                  <span
                    className="mb-1 flex h-10 w-7 flex-col items-center"
                    aria-hidden
                  >
                    <span className="h-1.5 w-2 rounded-t-sm bg-lab-ink/80" />
                    <span className="h-1 w-3.5 rounded-sm bg-lab-amber/90" />
                    <span
                      className="relative h-7 w-5 overflow-hidden rounded-b-lg rounded-t-sm border border-lab-glass/40 shadow-sm"
                      style={{
                        background: `linear-gradient(180deg, #f7faf8 0%, ${r.bottleColor} 100%)`,
                      }}
                    />
                  </span>
                  <span className="line-clamp-2 text-center text-[9px] font-semibold leading-tight text-lab-ink">
                    {r.icon} {r.displayName.replace("–style", "")}
                  </span>
                  <DifficultyBadge
                    difficulty={r.difficulty}
                    className="mt-0.5 scale-90"
                  />
                  {done ? (
                    <span className="mt-0.5 text-[8px] font-semibold text-lab-teal">
                      ✓
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => openAtelier("goals_hero")}
            className={`mt-2.5 w-full rounded-lg bg-lab-ink px-3 py-2 text-xs font-semibold text-lab-foam shadow-sm hover:bg-black ${QUIET_FOCUS}`}
          >
            Browse full Atelier →
          </button>
        </div>
        ) : null}

        <div className="flex flex-wrap gap-1 border-b border-lab-line/40 px-3 py-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${QUIET_FOCUS} ${
                filter === f.id
                  ? "bg-lab-ink text-lab-foam"
                  : "bg-lab-wash text-lab-muted hover:text-lab-ink"
              }`}
            >
              {f.label}
            </button>
          ))}
          {perfumeAllowed ? (
          <button
            type="button"
            onClick={() => openAtelier("goals_chip")}
            className={`rounded-full bg-lab-amber/30 px-2.5 py-1 text-[11px] font-semibold text-lab-ink hover:bg-lab-amber/45 ${QUIET_FOCUS}`}
          >
            All perfumes →
          </button>
          ) : null}
        </div>

        <ul className="scroll-thin min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
          {visibleCatalog.map((g) => {
            const done = completedGoalIds.includes(g.id);
            const active = activeGoalId === g.id;
            const diff = goalDifficulty(g);
            return (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => startGoal(g.id)}
                  className={`flex w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-left transition ${QUIET_FOCUS} ${
                    active
                      ? "border-lab-ink bg-lab-ink/5"
                      : "border-lab-line/60 bg-white/70 hover:border-lab-ink/30 hover:bg-white"
                  }`}
                >
                  <span className="text-lg" aria-hidden>
                    {g.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-semibold text-lab-ink">
                        {g.title}
                      </span>
                      <DifficultyBadge
                        difficulty={diff}
                        steps={g.steps.length}
                      />
                      {done ? (
                        <span className="rounded bg-lab-teal/15 px-1 py-px text-[9px] font-semibold text-lab-teal">
                          Done
                        </span>
                      ) : null}
                      {active ? (
                        <span className="rounded bg-lab-amber/20 px-1 py-px text-[9px] font-semibold text-lab-amber">
                          Active
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-px block text-[11px] text-lab-muted">
                      {g.tagline}
                    </span>
                    <span className="mt-1 block text-[10px] leading-snug text-lab-ink/75">
                      {g.productBlurb}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
