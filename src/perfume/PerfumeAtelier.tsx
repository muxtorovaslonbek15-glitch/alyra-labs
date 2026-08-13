"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PERFUME_RECIPES,
  FRAGRANCE_NOTE_BY_ID,
  DIFFICULTY_REWARDS,
  getPerfumeGoal,
  type PerfumeRecipe,
  type ScentFamily,
  type GoalDifficulty,
} from "@/domains/chemistry/perfume";
import { useGoalStore } from "@/store/goalStore";
import { useProgressStore } from "@/store/progressStore";
import { track } from "@/lib/analytics/track";
import { DifficultyBadge } from "@/perfume/DifficultyBadge";

const FAMILIES: { id: "all" | ScentFamily; label: string }[] = [
  { id: "all", label: "All" },
  { id: "citrus", label: "Citrus" },
  { id: "floral", label: "Floral" },
  { id: "oriental", label: "Oriental" },
  { id: "woody", label: "Woody" },
  { id: "aromatic", label: "Aromatic" },
  { id: "gourmand", label: "Gourmand" },
  { id: "fresh", label: "Fresh" },
  { id: "chypre", label: "Chypre" },
  { id: "aquatic", label: "Aquatic" },
  { id: "leather", label: "Leather" },
  { id: "fougere", label: "Fougère" },
];

const DIFFICULTY_FILTERS: { id: "all" | GoalDifficulty; label: string }[] = [
  { id: "all", label: "All levels" },
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
  { id: "very-hard", label: "Very hard" },
];

const DEFAULT_FEATURED_ID = "inspired-havas";

function Pyramid({ recipe }: { recipe: PerfumeRecipe }) {
  const rows: { label: string; ids: string[] }[] = [
    { label: "Top", ids: recipe.notes.top },
    { label: "Heart", ids: recipe.notes.heart },
    { label: "Base", ids: recipe.notes.base },
  ];
  return (
    <div className="mt-2 space-y-1.5">
      {rows.map((row) => (
        <div key={row.label}>
          <p className="text-[9px] font-semibold uppercase tracking-label text-lab-muted">
            {row.label}
          </p>
          <p className="text-[11px] text-lab-ink/85">
            {row.ids.map((id) => FRAGRANCE_NOTE_BY_ID[id]?.name ?? id).join(" · ") ||
              "—"}
          </p>
        </div>
      ))}
    </div>
  );
}

export function PerfumeAtelier({
  open,
  onClose,
  onOpenFreeform,
}: {
  open: boolean;
  onClose: () => void;
  onOpenFreeform: () => void;
}) {
  const startGoal = useGoalStore((s) => s.startGoal);
  const completed = useProgressStore((s) => s.completedPerfumeIds);
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<"all" | ScentFamily>("all");
  const [difficulty, setDifficulty] = useState<"all" | GoalDifficulty>("all");
  const [selected, setSelected] = useState<PerfumeRecipe | null>(
    () =>
      PERFUME_RECIPES.find((r) => r.id === DEFAULT_FEATURED_ID) ??
      PERFUME_RECIPES[0] ??
      null,
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PERFUME_RECIPES.filter((r) => {
      if (family !== "all" && r.family !== family) return false;
      if (difficulty !== "all" && r.difficulty !== difficulty) return false;
      if (!q) return true;
      return (
        r.displayName.toLowerCase().includes(q) ||
        r.brandLabel.toLowerCase().includes(q) ||
        r.family.includes(q) ||
        r.difficulty.includes(q)
      );
    });
  }, [query, family, difficulty]);

  // Prefer Havas (Hard showcase) when opening with no selection
  useEffect(() => {
    if (!open) return;
    if (selected && filtered.some((r) => r.id === selected.id)) return;
    const featured =
      filtered.find((r) => r.id === DEFAULT_FEATURED_ID) ?? filtered[0] ?? null;
    setSelected(featured);
  }, [open, filtered, selected]);

  if (!open) return null;

  function makeThis(recipe: PerfumeRecipe) {
    const goal = getPerfumeGoal(recipe.id);
    track("perfume_start", {
      recipeId: recipe.id,
      from: "atelier",
      difficulty: recipe.difficulty,
      stepCount: goal?.steps.length,
    });
    startGoal(recipe.id);
    onClose();
  }

  const selectedGoal = selected ? getPerfumeGoal(selected.id) : null;
  const stepCount = selectedGoal?.steps.length ?? 0;
  const diffLabel = selected
    ? DIFFICULTY_REWARDS[selected.difficulty].label
    : "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-lab-ink/45 p-3 pt-[6vh] backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Perfume atelier"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] min-h-[min(560px,88vh)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-lab-line bg-lab-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-lab-line/50 px-4 py-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-label text-lab-teal">
              Perfume atelier
            </p>
            <h2 className="font-display text-xl text-lab-ink">
              {PERFUME_RECIPES.length}+ inspired scents
            </h2>
            <p className="mt-0.5 text-[11px] text-lab-muted">
              Easy → Very hard guided recipes. Educational recreations — not
              official formulas.
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-sm text-lab-muted hover:bg-lab-wash"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="shrink-0 space-y-3.5 border-b border-lab-line/40 px-4 py-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Havas, Dior, woody…"
              aria-label="Search perfumes"
              className="min-w-40 flex-1 rounded-lg border border-lab-line bg-white px-3 py-2 text-xs text-lab-ink outline-none focus:border-lab-teal"
            />
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenFreeform();
              }}
              className="rounded-lg border border-lab-teal/40 bg-lab-teal/10 px-3 py-2 text-[11px] font-semibold text-lab-teal hover:bg-lab-teal/20"
            >
              Freeform blend
            </button>
          </div>

          <div
            className="space-y-1"
            role="group"
            aria-label="Difficulty"
          >
            <p className="text-[10px] font-semibold uppercase tracking-label text-lab-muted">
              Level
            </p>
            <div className="flex flex-wrap gap-2">
              {DIFFICULTY_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setDifficulty(f.id)}
                  className={`min-h-9 shrink-0 rounded-lg px-3.5 py-2 text-[11px] font-semibold transition ${
                    difficulty === f.id
                      ? "bg-lab-teal text-white shadow-sm"
                      : "bg-lab-wash text-lab-muted hover:bg-lab-line/40 hover:text-lab-ink"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div
            className="space-y-1"
            role="group"
            aria-label="Fragrance family"
          >
            <p className="text-[10px] font-semibold uppercase tracking-label text-lab-muted">
              Family
            </p>
            <div className="flex flex-wrap gap-2">
              {FAMILIES.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFamily(f.id)}
                  className={`min-h-9 shrink-0 rounded-lg px-3.5 py-2 text-[11px] font-semibold transition ${
                    family === f.id
                      ? "bg-lab-ink text-lab-foam shadow-sm"
                      : "bg-lab-wash text-lab-muted hover:bg-lab-line/40 hover:text-lab-ink"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden sm:grid-cols-[minmax(0,1fr)_260px]">
          <ul className="scroll-thin min-h-0 space-y-1 overflow-y-auto p-3">
            {filtered.map((r) => {
              const done = completed.includes(r.id);
              const steps = getPerfumeGoal(r.id)?.steps.length;
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(r)}
                    className={`flex w-full items-start gap-2 rounded-xl border px-2.5 py-2.5 text-left transition ${
                      selected?.id === r.id
                        ? "border-lab-teal bg-lab-teal/10"
                        : "border-transparent hover:bg-lab-wash/80"
                    }`}
                  >
                    <span
                      className="mt-0.5 flex h-8 w-5 shrink-0 flex-col items-center"
                      aria-hidden
                    >
                      <span className="h-1 w-1.5 rounded-t-sm bg-lab-ink/70" />
                      <span className="h-0.5 w-2.5 rounded-sm bg-lab-amber/80" />
                      <span
                        className="h-6 w-3.5 rounded-b-md rounded-t-sm border border-lab-glass/40"
                        style={{
                          background: `linear-gradient(180deg, #f7faf8 0%, ${r.bottleColor} 100%)`,
                        }}
                      />
                    </span>
                    <span className="text-lg">{r.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-lab-ink">
                        {r.displayName}
                        {done ? (
                          <span className="ml-1.5 text-[10px] font-normal text-lab-teal">
                            ✓ made
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-1">
                        <DifficultyBadge
                          difficulty={r.difficulty}
                          steps={steps}
                        />
                        <span className="text-[10px] text-lab-muted">
                          {r.brandLabel}
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 text-[10px] text-lab-amber">
                      +{r.xpReward} XP
                    </span>
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 ? (
              <li className="px-2 py-6 text-center text-sm text-lab-muted">
                No scents match — try another family or difficulty.
              </li>
            ) : null}
          </ul>

          <aside className="scroll-thin min-h-0 overflow-y-auto border-t border-lab-line/50 bg-lab-wash/30 p-4 sm:border-l sm:border-t-0">
            {selected ? (
              <>
                <div
                  className="mx-auto mb-3 flex h-20 w-14 flex-col items-center sm:h-24 sm:w-16"
                  aria-hidden
                >
                  <div className="h-2 w-2.5 rounded-t-sm bg-lab-ink/80 sm:h-2.5 sm:w-3" />
                  <div className="h-1 w-4 rounded-sm bg-lab-amber/90 sm:h-1.5 sm:w-5" />
                  <div
                    className="relative h-14 w-9 overflow-hidden rounded-b-xl rounded-t-md border border-lab-glass/50 shadow sm:h-16 sm:w-10"
                    style={{
                      background: `linear-gradient(180deg, #f7faf8 0%, ${selected.bottleColor} 100%)`,
                    }}
                  />
                </div>
                <h3 className="font-display text-lg text-lab-ink">
                  {selected.icon} {selected.displayName}
                </h3>
                <p className="text-[11px] text-lab-muted">{selected.brandLabel}</p>
                <div className="mt-1.5">
                  <DifficultyBadge
                    difficulty={selected.difficulty}
                    steps={stepCount}
                  />
                </div>
                <p className="mt-2 text-[12px] leading-snug text-lab-ink/85">
                  {selected.blurb}
                </p>
                <Pyramid recipe={selected} />
                <button
                  type="button"
                  onClick={() => makeThis(selected)}
                  className="mt-4 w-full rounded-lg bg-lab-teal px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-lab-teal/90"
                >
                  Make this on the desk →
                </button>
                <p className="mt-1.5 text-center text-[10px] text-lab-muted">
                  {diffLabel} · {stepCount} steps · +{selected.starReward}★
                </p>
              </>
            ) : (
              <p className="py-8 text-center text-sm text-lab-muted">
                Select a scent from the list to see its pyramid and start
                crafting.
              </p>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
