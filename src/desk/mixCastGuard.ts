/**
 * Mix / Cast click policy — empty vessels and spam must not stall the desk.
 */

import { CUP_SET_WINDOW_MS } from "@/animation/cupSet/timeline";

export type MixToggleDecision = "empty" | "hold" | "off" | "on";

/** What the Mix/Cast toggle should do this click. */
export function mixToggleDecision(opts: {
  contentsCount: number;
  mixActive: boolean;
  mixResolved: boolean;
}): MixToggleDecision {
  if (opts.mixActive) {
    // Double-click / spam during the resolve window used to cancel Cast
    // before the cup ever appeared.
    if (!opts.mixResolved) return "hold";
    return "off";
  }
  if (opts.contentsCount < 1) return "empty";
  return "on";
}

/** Restamp cup-set only when idle or the last spectacle has finished. */
export function shouldStampCupSet(opts: {
  equipmentId: string;
  cupSetAt?: number;
  now: number;
}): boolean {
  if (opts.equipmentId !== "tin") return false;
  if (!opts.cupSetAt) return true;
  return opts.now - opts.cupSetAt >= CUP_SET_WINDOW_MS;
}
