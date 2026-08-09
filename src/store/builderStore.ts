"use client";

import { create } from "zustand";
import type { LabBridgeFormula, StructuredPayload } from "@/perfumer/types";
import type { BuildStep } from "@/perfumer/BuildQueue";
import type { DeskSnapshot } from "@/perfumer/deskSnapshot";

export type BuilderTab = "lab" | "tutor" | "chat";
export type RightSlot = "tutor" | "chat";
export type BuilderMode =
  | "idle"
  | "planning"
  | "plan_ready"
  | "building"
  | "built"
  | "stopped";

export interface NarrationLine {
  id: string;
  text: string;
  stepKind?: string;
  at: string;
}

export interface PanelPrefs {
  leftOpen: boolean;
  rightOpen: boolean;
  leftWidth: number;
  rightWidth: number;
}

const PANEL_PREFS_KEY = "alyra.builder.panels.v1";

export const PANEL_WIDTH = {
  leftMin: 180,
  leftMax: 360,
  leftDefault: 240,
  rightMin: 280,
  rightMax: 520,
  rightDefault: 360,
} as const;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function loadPanelPrefs(): PanelPrefs {
  if (typeof window === "undefined") {
    return {
      leftOpen: true,
      rightOpen: true,
      leftWidth: PANEL_WIDTH.leftDefault,
      rightWidth: PANEL_WIDTH.rightDefault,
    };
  }
  try {
    const raw = localStorage.getItem(PANEL_PREFS_KEY);
    if (!raw) {
      return {
        leftOpen: true,
        rightOpen: true,
        leftWidth: PANEL_WIDTH.leftDefault,
        rightWidth: PANEL_WIDTH.rightDefault,
      };
    }
    const parsed = JSON.parse(raw) as Partial<PanelPrefs>;
    return {
      leftOpen: parsed.leftOpen !== false,
      rightOpen: parsed.rightOpen !== false,
      leftWidth: clamp(
        Number(parsed.leftWidth) || PANEL_WIDTH.leftDefault,
        PANEL_WIDTH.leftMin,
        PANEL_WIDTH.leftMax,
      ),
      rightWidth: clamp(
        Number(parsed.rightWidth) || PANEL_WIDTH.rightDefault,
        PANEL_WIDTH.rightMin,
        PANEL_WIDTH.rightMax,
      ),
    };
  } catch {
    return {
      leftOpen: true,
      rightOpen: true,
      leftWidth: PANEL_WIDTH.leftDefault,
      rightWidth: PANEL_WIDTH.rightDefault,
    };
  }
}

function savePanelPrefs(prefs: PanelPrefs) {
  try {
    localStorage.setItem(PANEL_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

interface BuilderState {
  tab: BuilderTab;
  rightSlot: RightSlot;
  leftOpen: boolean;
  rightOpen: boolean;
  leftWidth: number;
  rightWidth: number;
  /** Phone chat sheet */
  chatSheetOpen: boolean;
  mode: BuilderMode;
  plan: LabBridgeFormula | null;
  structured: StructuredPayload | null;
  buildSteps: BuildStep[];
  buildStepIndex: number;
  narration: NarrationLine[];
  deskSnapshot: DeskSnapshot | null;
  abortController: AbortController | null;

  setTab: (tab: BuilderTab) => void;
  setRightSlot: (slot: RightSlot) => void;
  setLeftOpen: (open: boolean) => void;
  setRightOpen: (open: boolean) => void;
  setLeftWidth: (width: number) => void;
  setRightWidth: (width: number) => void;
  setChatSheetOpen: (open: boolean) => void;
  hydratePanelPrefs: () => void;
  setPlanFromStructured: (
    structured: StructuredPayload | null,
    bridge: LabBridgeFormula | null,
  ) => void;
  setPlan: (bridge: LabBridgeFormula | null) => void;
  beginBuilding: (steps: BuildStep[], snapshot: DeskSnapshot, ac: AbortController) => void;
  reportStep: (step: BuildStep, index: number) => void;
  finishBuild: (result: "done" | "stopped" | "failed") => void;
  stopBuild: () => void;
  undoBuild: () => DeskSnapshot | null;
  clearNarration: () => void;
  resetMode: () => void;
}

let narrSeq = 0;

export const useBuilderStore = create<BuilderState>((set, get) => ({
  tab: "lab",
  rightSlot: "tutor",
  leftOpen: true,
  rightOpen: true,
  leftWidth: PANEL_WIDTH.leftDefault,
  rightWidth: PANEL_WIDTH.rightDefault,
  chatSheetOpen: false,
  mode: "idle",
  plan: null,
  structured: null,
  buildSteps: [],
  buildStepIndex: -1,
  narration: [],
  deskSnapshot: null,
  abortController: null,

  hydratePanelPrefs: () => {
    const prefs = loadPanelPrefs();
    set({
      leftOpen: prefs.leftOpen,
      rightOpen: prefs.rightOpen,
      leftWidth: prefs.leftWidth,
      rightWidth: prefs.rightWidth,
    });
  },

  setTab: (tab) => {
    if (tab === "tutor") {
      set({ tab, rightSlot: "tutor", rightOpen: true });
    } else if (tab === "chat") {
      set({ tab, rightSlot: "chat", rightOpen: true, chatSheetOpen: true });
    } else {
      set({ tab });
    }
  },

  setRightSlot: (rightSlot) => set({ rightSlot }),

  setLeftOpen: (leftOpen) => {
    set({ leftOpen });
    const s = get();
    savePanelPrefs({
      leftOpen,
      rightOpen: s.rightOpen,
      leftWidth: s.leftWidth,
      rightWidth: s.rightWidth,
    });
  },

  setRightOpen: (rightOpen) => {
    set({ rightOpen });
    const s = get();
    savePanelPrefs({
      leftOpen: s.leftOpen,
      rightOpen,
      leftWidth: s.leftWidth,
      rightWidth: s.rightWidth,
    });
  },

  setLeftWidth: (width) => {
    const leftWidth = clamp(width, PANEL_WIDTH.leftMin, PANEL_WIDTH.leftMax);
    set({ leftWidth });
    const s = get();
    savePanelPrefs({
      leftOpen: s.leftOpen,
      rightOpen: s.rightOpen,
      leftWidth,
      rightWidth: s.rightWidth,
    });
  },

  setRightWidth: (width) => {
    const rightWidth = clamp(width, PANEL_WIDTH.rightMin, PANEL_WIDTH.rightMax);
    set({ rightWidth });
    const s = get();
    savePanelPrefs({
      leftOpen: s.leftOpen,
      rightOpen: s.rightOpen,
      leftWidth: s.leftWidth,
      rightWidth,
    });
  },

  setChatSheetOpen: (chatSheetOpen) => set({ chatSheetOpen }),

  setPlanFromStructured: (structured, bridge) => {
    if (!bridge?.lines?.length) {
      set({ structured, plan: null, mode: "planning" });
      return;
    }
    set({
      structured,
      plan: bridge,
      mode: "plan_ready",
      rightSlot: "chat",
      rightOpen: true,
    });
  },

  setPlan: (bridge) => {
    if (!bridge?.lines?.length) {
      set({ plan: null, mode: get().mode === "building" ? get().mode : "idle" });
      return;
    }
    set({
      plan: bridge,
      mode: "plan_ready",
      rightSlot: "chat",
      rightOpen: true,
    });
  },

  beginBuilding: (steps, snapshot, ac) => {
    set({
      mode: "building",
      buildSteps: steps,
      buildStepIndex: -1,
      deskSnapshot: snapshot,
      abortController: ac,
      narration: [],
      rightSlot: "chat",
      rightOpen: true,
      tab: "lab",
      // Phone: collapse Chat sheet so desk pours stay visible (DESIGN.md / IDE §8).
      chatSheetOpen: false,
    });
  },

  reportStep: (step, index) => {
    narrSeq += 1;
    set((s) => ({
      buildStepIndex: index,
      narration: [
        ...s.narration,
        {
          id: `n-${narrSeq}`,
          text: step.narration,
          stepKind: step.kind,
          at: new Date().toISOString(),
        },
      ],
    }));
  },

  finishBuild: (result) => {
    const ac = get().abortController;
    if (ac && !ac.signal.aborted && result !== "stopped") {
      /* leave */
    }
    set({
      mode: result === "done" ? "built" : result === "stopped" ? "stopped" : "plan_ready",
      abortController: null,
    });
  },

  stopBuild: () => {
    get().abortController?.abort();
    set({ mode: "stopped", abortController: null });
  },

  undoBuild: () => {
    const snap = get().deskSnapshot;
    set({
      mode: "plan_ready",
      buildStepIndex: -1,
      deskSnapshot: null,
      narration: [],
    });
    return snap;
  },

  clearNarration: () => set({ narration: [] }),

  resetMode: () =>
    set({
      mode: "idle",
      buildSteps: [],
      buildStepIndex: -1,
      deskSnapshot: null,
      abortController: null,
      narration: [],
    }),
}));
