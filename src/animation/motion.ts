/**
 * Shared Lab chrome / BuildQueue motion tokens.
 * Vessel liquid FX stay in fxIntensity.ts — solid agent owns vessel silhouettes.
 */

import { POUR_WINDOW_MS } from "@/animation/fxIntensity";
import { EQUIPMENT_BY_ID } from "@/domains/chemistry/data/equipment";
import type { LabBridgeFormula } from "@/perfumer/types";

/** Mirror of BuildQueue step kinds — kept here to avoid a circular import. */
export type MotionBuildStepKind =
  | "propose_accord"
  | "place_vessel"
  | "add_chemical"
  | "set_amount"
  | "add_solvent"
  | "stir"
  | "mix"
  | "notes"
  | "mapping_gap"
  | "done";

/** DESIGN.md chrome motion: 150–250ms; dock a touch longer. */
export const MOTION_MS = {
  chrome: 200,
  crossfade: 220,
  dockOut: 140,
  dockIn: 260,
  ctaPress: 160,
  emptyStagger: 55,
  emptyPresence: 5200,
  reduced: 40,
} as const;

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Scale a duration for a11y; reduced path stays snappy, not zero (layout still settles). */
export function motionMs(fullMs: number, reducedMs = MOTION_MS.reduced): number {
  return prefersReducedMotion() ? reducedMs : fullMs;
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const t = window.setTimeout(resolve, Math.max(0, ms));
    const onAbort = () => {
      window.clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export function isSolidBridge(bridge: LabBridgeFormula): boolean {
  return bridge.format === "Solid";
}

/**
 * Solid format auto-morphs to tin when that equipment exists.
 * Explicit non-container ids fall through; liquid formats keep requested glass.
 */
export function resolveBuildEquipmentId(bridge: LabBridgeFormula): string {
  if (isSolidBridge(bridge) && EQUIPMENT_BY_ID.tin) return "tin";
  const requested = bridge.vessel?.equipmentId;
  if (requested && EQUIPMENT_BY_ID[requested]) return requested;
  return "beaker";
}

export function buildUsesTin(bridge: LabBridgeFormula): boolean {
  return resolveBuildEquipmentId(bridge) === "tin";
}

/**
 * Clear step timing so pours finish their FX window before the next pour.
 * Solid path: quieter fills until tin melt/cast spectacle ships; still legible.
 */
export function buildStepDelayMs(
  kind: MotionBuildStepKind,
  opts?: { solid?: boolean; tin?: boolean },
): number {
  if (prefersReducedMotion()) return MOTION_MS.reduced;

  const solid = Boolean(opts?.solid);
  const tin = Boolean(opts?.tin);

  switch (kind) {
    case "propose_accord":
      return solid ? 560 : 480;
    case "place_vessel":
      return tin || solid ? 720 : 640;
    case "add_chemical":
    case "add_solvent":
      // Liquid: wait full pour theater. Solid/tin: shorter matte fill beat.
      return solid || tin ? 980 : POUR_WINDOW_MS + 100;
    case "set_amount":
      // Settle only — amount usually follows the pour of the same line.
      return solid ? 160 : 140;
    case "mapping_gap":
      return 400;
    case "stir":
      return solid ? 1100 : 980;
    case "mix":
      // Cast / Mix payoff
      return solid ? 1600 : 1700;
    case "notes":
      return 520;
    case "done":
      return 0;
    default:
      return 420;
  }
}

/** Extra melt beat after placing a solid vessel (heat attached). */
export function solidMeltDelayMs(): number {
  return motionMs(820, MOTION_MS.reduced);
}
