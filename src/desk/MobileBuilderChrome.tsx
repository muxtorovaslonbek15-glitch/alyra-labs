"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { DeskToolButtons } from "@/desk/DeskToolButtons";
import { MobileBottomDock } from "@/desk/MobileBottomDock";
import { useMdUp } from "@/desk/useMdUp";
import { PlanPanel } from "@/perfumer/PlanPanel";
import { deriveBuildSteps, runBuildQueue } from "@/perfumer/BuildQueue";
import {
  captureDeskSnapshot,
  restoreDeskSnapshot,
} from "@/perfumer/deskSnapshot";
import { deskContentsFromBridge } from "@/perfumer/labBridge";
import { planBuildCta, useBuilderStore } from "@/store/builderStore";
import { useDeskStore } from "@/store/deskStore";
import { track } from "@/lib/analytics/track";
import { showToast } from "@/gamification/ToastHost";
import { celebrateChatAchievement } from "@/perfumer/chatAchievements";
import { buildUsesTin } from "@/animation/motion";

const PerfumerChat = dynamic(
  () => import("@/perfumer/PerfumerChat").then((m) => m.PerfumerChat),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center px-4 py-8 text-sm text-lab-muted">
        Opening chat…
      </div>
    ),
  },
);

/**
 * Phone-only Chat / Plan / Build chrome.
 * Desk stays full-bleed; closable L/R rails are N/A below `md` (DESIGN.md).
 */
export function MobileBuilderChrome({
  tutorOpen,
  onTutorOpenChange,
}: {
  tutorOpen: boolean;
  onTutorOpenChange: (open: boolean) => void;
}) {
  const mdUp = useMdUp();
  const chatSheetOpen = useBuilderStore((s) => s.chatSheetOpen);
  const setChatSheetOpen = useBuilderStore((s) => s.setChatSheetOpen);
  const mode = useBuilderStore((s) => s.mode);
  const plan = useBuilderStore((s) => s.plan);
  const structured = useBuilderStore((s) => s.structured);
  const buildSteps = useBuilderStore((s) => s.buildSteps);
  const buildStepIndex = useBuilderStore((s) => s.buildStepIndex);
  const narration = useBuilderStore((s) => s.narration);
  const beginBuilding = useBuilderStore((s) => s.beginBuilding);
  const reportStep = useBuilderStore((s) => s.reportStep);
  const finishBuild = useBuilderStore((s) => s.finishBuild);
  const stopBuild = useBuilderStore((s) => s.stopBuild);
  const undoBuild = useBuilderStore((s) => s.undoBuild);
  const lockPlan = useBuilderStore((s) => s.lockPlan);

  // Chat sheet and tutor sheet are mutually exclusive on phone.
  useEffect(() => {
    if (mdUp) return;
    if (chatSheetOpen && tutorOpen) onTutorOpenChange(false);
  }, [chatSheetOpen, tutorOpen, mdUp, onTutorOpenChange]);

  useEffect(() => {
    if (mdUp) return;
    if (tutorOpen && chatSheetOpen) setChatSheetOpen(false);
  }, [tutorOpen, chatSheetOpen, mdUp, setChatSheetOpen]);

  const closeChat = useCallback(() => {
    setChatSheetOpen(false);
  }, [setChatSheetOpen]);

  const toggleChat = useCallback(() => {
    setChatSheetOpen(!useBuilderStore.getState().chatSheetOpen);
  }, [setChatSheetOpen]);

  const [chatMounted, setChatMounted] = useState(false);
  useEffect(() => {
    if (chatSheetOpen) setChatMounted(true);
  }, [chatSheetOpen]);

  const onLock = useCallback(() => {
    const current = useBuilderStore.getState().plan;
    const locked = lockPlan();
    if (!locked || !current) return;
    track("builder_plan_ready", {
      mapped: current.mappingReport?.mappedCount ?? 0,
      unmapped: current.mappingReport?.unmappedCount ?? 0,
      title: current.title,
    });
    celebrateChatAchievement("plan_ready", {
      detail: current.title || undefined,
    });
  }, [lockPlan]);

  const onBuild = useCallback(() => {
    const state = useBuilderStore.getState();
    if (
      state.mode !== "plan_ready" &&
      state.mode !== "stopped" &&
      state.mode !== "built"
    ) {
      return;
    }
    const bridge = state.plan;
    if (!bridge?.lines?.length) return;
    const steps = deriveBuildSteps(bridge);
    const snap = captureDeskSnapshot();
    const ac = new AbortController();
    beginBuilding(steps, snap, ac);
    // Collapse sheet so pours are visible (IDE plan §8).
    setChatSheetOpen(false);
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
          if (buildUsesTin(bridge)) {
            celebrateChatAchievement("solid_tin", { force: true });
          } else {
            celebrateChatAchievement("build_complete", { force: true });
          }
        }
      })
      .catch(() => {
        finishBuild("failed");
      });
  }, [beginBuilding, finishBuild, reportStep, setChatSheetOpen]);

  const onStop = useCallback(() => {
    stopBuild();
    track("builder_stop", { reason: "user" });
  }, [stopBuild]);

  const onUndo = useCallback(() => {
    const snap = undoBuild();
    if (snap) restoreDeskSnapshot(snap);
  }, [undoBuild]);

  const onInstant = useCallback(() => {
    const state = useBuilderStore.getState();
    if (
      state.mode !== "plan_ready" &&
      state.mode !== "stopped" &&
      state.mode !== "built"
    ) {
      return;
    }
    const bridge = state.plan;
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
    setChatSheetOpen(false);
    showToast({ title: "On your desk", detail: bridge.title });
  }, [setChatSheetOpen]);

  // Desktop: this chrome is inert (IDE owns rails).
  if (mdUp) return null;

  const building = mode === "building";
  const latestNarration = narration[narration.length - 1]?.text;

  return (
    <>
      {/* Slim Build progress — desk stays visible */}
      {building ? (
        <div className="pointer-events-none absolute inset-x-0 top-2 z-50 flex justify-center px-3 md:hidden">
          <div className="pointer-events-auto flex max-w-sm items-center gap-2 rounded-xl border border-lab-line/70 bg-lab-panel/95 px-3 py-2 shadow-lg backdrop-blur-md">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-label text-lab-muted">
                Building
                {buildSteps.length
                  ? ` · ${Math.min(buildStepIndex + 1, buildSteps.length)}/${buildSteps.length}`
                  : ""}
              </p>
              <p className="mt-0.5 truncate text-xs text-lab-ink">
                {latestNarration || "Pouring on the desk…"}
              </p>
            </div>
            <button
              type="button"
              onClick={onStop}
              className="min-h-11 shrink-0 rounded-lg border border-lab-hazard/40 bg-lab-hazard/10 px-3 text-xs font-semibold text-lab-hazard"
            >
              Stop
            </button>
          </div>
        </div>
      ) : null}

      {!building && mode === "planning" && plan && !chatSheetOpen ? (
        <div className="pointer-events-none absolute inset-x-0 top-2 z-50 flex justify-center px-3 md:hidden">
          <div className="pointer-events-auto flex max-w-sm items-center gap-2 rounded-xl border border-lab-line/70 bg-lab-panel/95 px-2 py-2 shadow-lg backdrop-blur-md">
            <p className="min-w-0 flex-1 truncate px-2 text-sm font-medium text-lab-ink">
              {plan.title}
            </p>
            <button
              type="button"
              onClick={onLock}
              className="min-h-11 rounded-lg bg-lab-ink px-3.5 text-xs font-semibold text-lab-foam transition hover:bg-black"
            >
              Lock
            </button>
          </div>
        </div>
      ) : null}

      {!building &&
      planBuildCta(mode) === "build" &&
      plan &&
      !chatSheetOpen ? (
        <div className="pointer-events-none absolute inset-x-0 top-2 z-50 flex justify-center px-3 md:hidden">
          <div className="pointer-events-auto flex max-w-sm items-center gap-2 rounded-xl border border-lab-line/70 bg-lab-panel/95 px-2 py-2 shadow-lg backdrop-blur-md">
            <p className="min-w-0 flex-1 truncate px-2 text-sm font-medium text-lab-ink">
              {plan.title}
            </p>
            <button
              type="button"
              onClick={onBuild}
              disabled={(plan.mappingReport?.mappedCount ?? 0) === 0}
              className="lab-build-cta lab-build-cta-ready min-h-11 rounded-lg bg-lab-ink px-3.5 text-xs font-semibold text-lab-foam transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
            >
              Build
            </button>
          </div>
        </div>
      ) : null}

      <MobileBottomDock
        open={chatSheetOpen}
        onClose={closeChat}
        title="Chat"
        labelledBy="mobile-chat-sheet-title"
        nav={
          <>
            <button
              type="button"
              onClick={toggleChat}
              aria-pressed={chatSheetOpen}
              className={`min-h-11 shrink-0 rounded-lg px-2.5 text-[10px] font-semibold whitespace-nowrap transition ${
                chatSheetOpen
                  ? "bg-lab-foam text-lab-ink"
                  : "bg-white/10 text-lab-foam hover:bg-white/20"
              }`}
            >
              Chat
            </button>
            <span className="mx-1 h-5 w-px shrink-0 bg-white/15" aria-hidden />
            <DeskToolButtons layout="phone" />
          </>
        }
      >
        {chatMounted ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <PerfumerChat variant="shell" />
            <div className="scroll-thin max-h-[36%] shrink-0 overflow-y-auto border-t border-lab-line/60">
              <PlanPanel
                bridge={plan}
                structured={structured}
                mode={mode}
                buildStepIndex={buildStepIndex}
                buildTotal={buildSteps.length}
                onBuild={onBuild}
                onStop={onStop}
                onUndo={onUndo}
                onInstant={onInstant}
                compact
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center px-4 text-sm text-lab-muted">
            Opening chat…
          </div>
        )}
      </MobileBottomDock>
    </>
  );
}
