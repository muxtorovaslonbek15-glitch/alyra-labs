"use client";

import { useCallback, useEffect } from "react";
import { ChatRail } from "@/perfumer/ChatRail";
import { deriveBuildSteps, runBuildQueue } from "@/perfumer/BuildQueue";
import {
  captureDeskSnapshot,
  restoreDeskSnapshot,
} from "@/perfumer/deskSnapshot";
import { deskContentsFromBridge } from "@/perfumer/labBridge";
import { useBuilderStore } from "@/store/builderStore";
import { track } from "@/lib/analytics/track";
import { showToast } from "@/gamification/ToastHost";
import { useMdUp } from "@/desk/useMdUp";

/**
 * Desktop right-rail Chat + Plan + Build orchestration.
 * Phone uses MobileBuilderChrome sheets instead.
 */
export function DesktopBuilderChrome() {
  const mdUp = useMdUp();
  const rightSlot = useBuilderStore((s) => s.rightSlot);
  const rightOpen = useBuilderStore((s) => s.rightOpen);
  const setRightOpen = useBuilderStore((s) => s.setRightOpen);
  const mode = useBuilderStore((s) => s.mode);
  const beginBuilding = useBuilderStore((s) => s.beginBuilding);
  const reportStep = useBuilderStore((s) => s.reportStep);
  const finishBuild = useBuilderStore((s) => s.finishBuild);
  const stopBuild = useBuilderStore((s) => s.stopBuild);
  const undoBuild = useBuilderStore((s) => s.undoBuild);
  const narration = useBuilderStore((s) => s.narration);
  const buildSteps = useBuilderStore((s) => s.buildSteps);
  const buildStepIndex = useBuilderStore((s) => s.buildStepIndex);

  const onBuild = useCallback(() => {
    const bridge = useBuilderStore.getState().plan;
    if (!bridge?.lines?.length) return;
    const steps = deriveBuildSteps(bridge);
    const snap = captureDeskSnapshot();
    const ac = new AbortController();
    beginBuilding(steps, snap, ac);
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
      .catch(() => finishBuild("failed"));
  }, [beginBuilding, finishBuild, reportStep]);

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
    const snap = captureDeskSnapshot();
    useBuilderStore.getState().beginBuilding(
      deriveBuildSteps(bridge),
      snap,
      new AbortController(),
    );
    void runBuildQueue({
      bridge,
      instant: true,
      onStep: (step, index) => reportStep(step, index),
    }).then((result) => {
      finishBuild(result);
      if (result === "done") {
        showToast({ title: "On your desk", detail: bridge.title });
      }
    });
  }, [finishBuild, reportStep]);

  if (!mdUp) return null;
  if (rightSlot !== "chat") return null;

  if (!rightOpen) {
    return (
      <div className="relative hidden h-full w-0 shrink-0 md:block">
        <button
          type="button"
          onClick={() => setRightOpen(true)}
          aria-label="Show chat"
          title="Show chat"
          className="absolute right-0 top-1/2 z-20 flex h-16 w-5 -translate-y-1/2 items-center justify-center rounded-l-md border border-r-0 border-lab-line/70 bg-lab-panel/95 text-lab-muted shadow-sm hover:text-lab-ink"
        >
          ‹
        </button>
      </div>
    );
  }

  return (
    <div className="relative hidden h-full shrink-0 md:flex">
      <button
        type="button"
        onClick={() => setRightOpen(false)}
        aria-label="Hide chat"
        title="Hide chat"
        className="absolute left-2 top-1.5 z-30 flex h-7 w-7 items-center justify-center rounded-md text-lab-muted hover:bg-lab-wash hover:text-lab-ink"
      >
        ›
      </button>
      {mode === "building" ? (
        <div className="pointer-events-none absolute inset-x-3 top-10 z-20 rounded-md border border-lab-line/60 bg-lab-wash/95 px-2 py-1.5 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-lab-muted">
            Building
            {buildSteps.length
              ? ` · ${Math.min(buildStepIndex + 1, buildSteps.length)}/${buildSteps.length}`
              : ""}
          </p>
          <p className="mt-0.5 truncate text-xs text-lab-ink">
            {narration[narration.length - 1]?.text || "Pouring…"}
          </p>
        </div>
      ) : null}
      <ChatRail
        onBuild={onBuild}
        onStop={onStop}
        onUndo={onUndo}
        onInstant={onInstant}
      />
    </div>
  );
}
