"use client";

import { create } from "zustand";
import type { LabBridgeFormula, StructuredPayload } from "@/perfumer/types";
import type { BuildStep } from "@/perfumer/BuildQueue";
import type { DeskSnapshot } from "@/perfumer/deskSnapshot";

export type BuilderTab = "tutor" | "chat";
export type RightSlot = "tutor" | "chat";
/** Cursor-style chat orchestration: Plan = deliberate propose; Agent = normal tools. */
export type ChatAgentMode = "plan" | "agent";
/** Desktop chat placement: right rail or under the desk canvas. */
export type ChatDock = "right" | "bottom";
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
const CHAT_MODE_KEY = "alyra.builder.chatMode.v1";
const CHAT_DOCK_KEY = "alyra.builder.chatDock.v1";
const BOTTOM_CHAT_HEIGHT_KEY = "alyra.builder.bottomChatHeight.v1";

export const PANEL_WIDTH = {
  leftMin: 180,
  leftMax: 360,
  leftDefault: 240,
  rightMin: 280,
  rightMax: 520,
  rightDefault: 360,
} as const;

export const BOTTOM_CHAT = {
  min: 180,
  max: 480,
  default: 280,
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

function loadChatAgentMode(): ChatAgentMode {
  if (typeof window === "undefined") return "agent";
  try {
    const raw = localStorage.getItem(CHAT_MODE_KEY);
    if (raw === "plan" || raw === "agent") return raw;
  } catch {
    /* ignore */
  }
  return "agent";
}

function saveChatAgentMode(mode: ChatAgentMode) {
  try {
    localStorage.setItem(CHAT_MODE_KEY, mode);
  } catch {
    /* ignore */
  }
}

function loadChatDock(): ChatDock {
  if (typeof window === "undefined") return "right";
  try {
    const raw = localStorage.getItem(CHAT_DOCK_KEY);
    if (raw === "right" || raw === "bottom") return raw;
  } catch {
    /* ignore */
  }
  return "right";
}

function saveChatDock(dock: ChatDock) {
  try {
    localStorage.setItem(CHAT_DOCK_KEY, dock);
  } catch {
    /* ignore */
  }
}

function loadBottomChatHeight(): number {
  if (typeof window === "undefined") return BOTTOM_CHAT.default;
  try {
    const n = Number(localStorage.getItem(BOTTOM_CHAT_HEIGHT_KEY));
    if (Number.isFinite(n)) {
      return clamp(n, BOTTOM_CHAT.min, BOTTOM_CHAT.max);
    }
  } catch {
    /* ignore */
  }
  return BOTTOM_CHAT.default;
}

function saveBottomChatHeight(height: number) {
  try {
    localStorage.setItem(BOTTOM_CHAT_HEIGHT_KEY, String(height));
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
  /** Desktop: chat as right rail or under desk */
  chatDock: ChatDock;
  bottomChatHeight: number;
  /** Phone chat sheet */
  chatSheetOpen: boolean;
  /** Cursor-like Plan | Agent chat mode (default Agent) */
  chatAgentMode: ChatAgentMode;
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
  setChatDock: (dock: ChatDock) => void;
  setBottomChatHeight: (height: number) => void;
  setChatSheetOpen: (open: boolean) => void;
  setChatAgentMode: (mode: ChatAgentMode) => void;
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
  tab: "chat",
  rightSlot: "chat",
  leftOpen: true,
  rightOpen: true,
  leftWidth: PANEL_WIDTH.leftDefault,
  rightWidth: PANEL_WIDTH.rightDefault,
  chatDock: "right",
  bottomChatHeight: BOTTOM_CHAT.default,
  chatSheetOpen: false,
  chatAgentMode: "agent",
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
      chatAgentMode: loadChatAgentMode(),
      chatDock: loadChatDock(),
      bottomChatHeight: loadBottomChatHeight(),
    });
  },

  setChatAgentMode: (chatAgentMode) => {
    set({ chatAgentMode });
    saveChatAgentMode(chatAgentMode);
  },

  setChatDock: (chatDock) => {
    set({ chatDock, rightOpen: true });
    saveChatDock(chatDock);
  },

  setBottomChatHeight: (height) => {
    const bottomChatHeight = clamp(height, BOTTOM_CHAT.min, BOTTOM_CHAT.max);
    set({ bottomChatHeight });
    saveBottomChatHeight(bottomChatHeight);
  },

  setTab: (tab) => {
    if (tab === "tutor") {
      set({ tab, rightSlot: "tutor", rightOpen: true, chatSheetOpen: false });
    } else {
      set({ tab, rightSlot: "chat", rightOpen: true, chatSheetOpen: true });
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
      tab: "chat",
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
