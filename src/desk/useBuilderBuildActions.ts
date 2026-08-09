"use client";

import { useCallback } from "react";
import { deriveBuildSteps, runBuildQueue } from "@/perfumer/BuildQueue";
import {
  captureDeskSnapshot,
  restoreDeskSnapshot,
} from "@/perfumer/deskSnapshot";
import { deskContentsFromBridge } from "@/perfumer/labBridge";
import { useBuilderStore } from "@/store/builderStore";
import { useDeskStore } from "@/store/deskStore";
import { track } from "@/lib/analytics/track";
import { showToast } from "@/gamification/ToastHost";

/** Shared Plan → Build / Stop / Undo / Instant for desktop ChatRail + phone chrome. */
export function useBuilderBuildActions(opts?: {
  onBuildStart?: () => void;
}) {
  const beginBuilding = useBuilderStore((s) => s.beginBuilding);
  const reportStep = useBuilderStore((s) => s.reportStep);
  const finishBuild = useBuilderStore((s) => s.finishBuild);
  const stopBuild = useBuilderStore((s) => s.stopBuild);
  const undoBuild = useBuilderStore((s) => s.undoBuild);

  const onBuild = useCallback(() => {
    const bridge = useBuilderStore.getState().plan;
    if (!bridge?.lines?.length) return;
    const steps = deriveBuildSteps(bridge);
    const snap = captureDeskSnapshot();
    const ac = new AbortController();
    beginBuilding(steps, snap, ac);
    opts?.onBuildStart?.();
    track("builder_build_start", { steps: steps.length });
    void runBuildQueue({
      bridge,
      signal: ac.signal,
      onStep: (step, index) => reportStep(step, index),
    })
      .then((result) => {
        finishBuild(result);
        track(
          result === "done" ? "builder_build_complete" : "builder_stop",
          { result },
        );
        if (result === "done") {
          showToast({
            title: "Build complete",
            detail: "Refine in Chat or open Tutor for notes.",
          });
        }
      })
      .catch(() => {
        finishBuild("failed");
      });
  }, [beginBuilding, finishBuild, reportStep, opts]);

  const onStop = useCallback(() => {
    stopBuild();
    track("builder_stop", { reason: "user" });
  }, [stopBuild]);

  const onUndo = useCallback(() => {
    const snap = undoBuild();
    if (snap) restoreDeskSnapshot(snap);
  }, [undoBuild]);

  const onInstant = useCallback(() => {
    const bridge = useBuilderStore.getState().plan;
    if (!bridge) return;
    const contents = deskContentsFromBridge(bridge);
    if (!contents.length) {
      showToast({
        title: "Nothing mapped",
        detail: "These materials are not in Lab inventory yet.",
      });
      return;
    }
    useDeskStore.getState().loadFormula({
      equipmentId: bridge.vessel?.equipmentId || "beaker",
      contents,
      contentIds: contents.map((c) => c.chemicalId),
      autoMix: true,
      heatAttached: Boolean(bridge.vessel?.heatAttached),
    });
    opts?.onBuildStart?.();
    showToast({ title: "On your desk", detail: bridge.title });
  }, [opts]);

  return { onBuild, onStop, onUndo, onInstant };
}
