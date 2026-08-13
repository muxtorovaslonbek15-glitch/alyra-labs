"use client";

import { useEffect } from "react";
import { getGoal } from "@/domains/chemistry/data/goals";
import { getPerfumeRecipe } from "@/domains/chemistry/perfume";
import { useDeskStore } from "@/store/deskStore";
import { useGoalStore } from "@/store/goalStore";
import { useProgressStore } from "@/store/progressStore";
import { useInventionStore } from "@/store/inventionStore";
import { showToast } from "@/gamification/ToastHost";
import { track } from "@/lib/analytics/track";
import { useWearStore } from "@/wear/wearStore";

/**
 * Watches the desk and advances the active product goal.
 * Mount once inside LabShell.
 */
export function GoalProgressWatcher() {
  const vessels = useDeskStore((s) => s.vessels);
  const activeVesselId = useDeskStore((s) => s.activeVesselId);
  const syncFromDesk = useGoalStore((s) => s.syncFromDesk);
  const showReward = useGoalStore((s) => s.showReward);
  const awardGoalXp = useProgressStore((s) => s.awardGoalXp);
  const awardPerfumeComplete = useProgressStore((s) => s.awardPerfumeComplete);
  const beginNamingFromGoal = useInventionStore((s) => s.beginNamingFromGoal);
  const remixInventionId = useInventionStore((s) => s.remixInventionId);
  const audience = useWearStore((s) => s.audience);

  useEffect(() => {
    /** Wear auto-places an empty tin; do not let that advance composer goals. */
    if (audience === "owner") return;
    const { newSteps, goalJustCompleted, goalId } = syncFromDesk({
      vessels,
      activeVesselId,
    });
    if (!goalId) return;
    const goal = getGoal(goalId);
    if (!goal) return;

    for (const stepId of newSteps) {
      const step = goal.steps.find((s) => s.id === stepId);
      showToast({
        title: "Step complete",
        detail: step?.title ?? "Keep going",
      });
    }

    if (goalJustCompleted) {
      const vessel =
        vessels.find((v) => v.instanceId === activeVesselId) ??
        vessels.find((v) => v.contentIds.length > 0) ??
        vessels[0];

      const perfume = getPerfumeRecipe(goalId);
      if (perfume) {
        const { xpGained, starsGained } = awardPerfumeComplete(goalId);
        showReward(goal.id, xpGained, starsGained);
        track("perfume_complete", {
          recipeId: goalId,
          xpGained,
          starsGained,
        });
        showToast({
          title: starsGained ? `Bottled · +${starsGained}★` : "Bottled",
          detail: goal.title,
        });
      } else {
        const { xpGained } = awardGoalXp(goal.badgeId, goal.title);
        showReward(goal.id, xpGained, 0);
        showToast({
          title: "Goal complete",
          detail: goal.title,
        });
      }

      // New authorship path — skip naming when already remixing a shelf item
      // (InventionRemixWatcher appends the improved version).
      if (vessel && !remixInventionId) {
        beginNamingFromGoal({
          goalId: goal.id,
          suggestedName: goal.title
            .replace(/^Make (a |an )?/i, "")
            .slice(0, 40),
          coverVisualKind: goal.visualKind,
          perfumeRecipeId: perfume?.id,
          vessel,
        });
      }
    }
  }, [
    audience,
    vessels,
    activeVesselId,
    syncFromDesk,
    awardGoalXp,
    awardPerfumeComplete,
    showReward,
    beginNamingFromGoal,
    remixInventionId,
  ]);

  return null;
}
