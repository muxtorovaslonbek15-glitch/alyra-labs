"use client";

import { showToast } from "@/gamification/ToastHost";
import { useAuthStore } from "@/store/authStore";
import { useDeskStore } from "@/store/deskStore";
import { labCopy } from "@/lab/labCopy";
import type { EngineResult } from "@/types";

/** Open the auth gate and show a consistent blocked toast. */
export function notifyLabBlocked(
  toast: { title: string; detail?: string } = labCopy.signUpToMix,
) {
  useAuthStore.getState().openAuthGate();
  showToast(toast);
}

/**
 * Run a lab action only when the guest soft-cap allows it.
 * Signed-in users are never blocked by incomplete profile.
 * Store methods also call assertLabActionAllowed; this adds the missing toast.
 */
export function withLabAccess<T>(
  run: () => T,
  toast: { title: string; detail?: string } = labCopy.signUpToMix,
): T | null {
  if (useAuthStore.getState().isLabBlocked()) {
    notifyLabBlocked(toast);
    return null;
  }
  return run();
}

export function tryMixVessel(vesselId: string): EngineResult | null {
  return withLabAccess(() => useDeskStore.getState().mixVessel(vesselId));
}

export function tryShakeVessel(vesselId: string): EngineResult | null {
  return withLabAccess(() => useDeskStore.getState().shakeVessel(vesselId));
}

export function tryToggleStirActive(vesselId: string): boolean {
  return (
    withLabAccess(() => {
      useDeskStore.getState().toggleStirActive(vesselId);
      return true;
    }) ?? false
  );
}

export function tryToggleShakeActive(vesselId: string): boolean {
  return (
    withLabAccess(() => {
      useDeskStore.getState().toggleShakeActive(vesselId);
      return true;
    }) ?? false
  );
}

export function tryToggleMixActive(vesselId: string): boolean {
  return (
    withLabAccess(() => {
      useDeskStore.getState().toggleMixActive(vesselId);
      return true;
    }) ?? false
  );
}

export function trySeedDemoReaction(): EngineResult | null {
  return withLabAccess(() => useDeskStore.getState().seedDemoReaction());
}
