/**
 * Calm productive hits for Perfumer chat — toast + once-per-session gates.
 * Not a badge spam layer; mirrors Cursor status, not game HUD.
 */

import { showToast } from "@/gamification/ToastHost";
import { track } from "@/lib/analytics/track";

export type ChatAchievement =
  | "plan_ready"
  | "build_complete"
  | "solid_tin"
  | "refine_done"
  | "first_formula"
  | "open_in_lab";

const TITLES: Record<ChatAchievement, string> = {
  plan_ready: "Plan locked",
  build_complete: "Build complete",
  solid_tin: "Solid tin cast",
  refine_done: "Refine done",
  first_formula: "First formula",
  open_in_lab: "On the desk",
};

const DETAILS: Partial<Record<ChatAchievement, string>> = {
  plan_ready: "Press Build to pour on the desk.",
  build_complete: "Refine in Chat or open Information for notes.",
  solid_tin: "Wax chassis on the tin. Heat or cool from the vessel.",
  refine_done: "Delta applied. Check the formula card.",
  first_formula: "You composed a signature. Lock the Plan, then Build.",
  open_in_lab: "Materials mapped onto the desk.",
};

const SESSION_ONCE: ChatAchievement[] = [
  "first_formula",
  "plan_ready",
  "solid_tin",
];

const fired = new Set<string>();

function sessionKey(kind: ChatAchievement) {
  return `alyra.chat.ach.${kind}`;
}

function alreadyFired(kind: ChatAchievement): boolean {
  if (fired.has(kind)) return true;
  if (typeof window === "undefined") return false;
  if (!SESSION_ONCE.includes(kind)) return false;
  try {
    return sessionStorage.getItem(sessionKey(kind)) === "1";
  } catch {
    return false;
  }
}

function markFired(kind: ChatAchievement) {
  fired.add(kind);
  if (!SESSION_ONCE.includes(kind)) return;
  try {
    sessionStorage.setItem(sessionKey(kind), "1");
  } catch {
    /* private mode */
  }
}

/** Lifetime first-formula (local). */
function isLifetimeFirstFormula(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem("alyra.chat.ach.first_formula") !== "1";
  } catch {
    return false;
  }
}

function markLifetimeFirstFormula() {
  try {
    localStorage.setItem("alyra.chat.ach.first_formula", "1");
  } catch {
    /* ignore */
  }
}

/**
 * Celebrate a productive hit. Returns true if a toast was shown.
 * `force` bypasses session dedupe (use sparingly).
 */
export function celebrateChatAchievement(
  kind: ChatAchievement,
  opts?: { detail?: string; force?: boolean; silent?: boolean },
): boolean {
  if (!opts?.force && alreadyFired(kind)) return false;

  if (kind === "first_formula") {
    if (!isLifetimeFirstFormula() && !opts?.force) return false;
    markLifetimeFirstFormula();
  }

  markFired(kind);
  track("builder_chat_achievement", { kind });

  if (opts?.silent) return true;

  showToast({
    title: TITLES[kind],
    detail: opts?.detail ?? DETAILS[kind],
  });
  return true;
}

export function resetChatAchievementsForTests() {
  fired.clear();
}
