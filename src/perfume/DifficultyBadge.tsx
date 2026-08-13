"use client";

import {
  DIFFICULTY_REWARDS,
  type GoalDifficulty,
} from "@/domains/chemistry/perfume";

const STYLES: Record<GoalDifficulty, string> = {
  easy: "bg-lab-teal/15 text-lab-teal",
  medium: "bg-lab-amber/20 text-lab-ink",
  hard: "bg-lab-hazard/15 text-lab-hazard",
  "very-hard": "bg-lab-ink text-lab-foam",
};

export function DifficultyBadge({
  difficulty,
  steps,
  className = "",
}: {
  difficulty: GoalDifficulty;
  steps?: number;
  className?: string;
}) {
  const label = DIFFICULTY_REWARDS[difficulty].label;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-px text-[9px] font-semibold uppercase tracking-label ${STYLES[difficulty]} ${className}`}
    >
      {label}
      {typeof steps === "number" ? (
        <span className="font-normal opacity-80">· {steps} steps</span>
      ) : null}
    </span>
  );
}
