/**
 * Phone bottom dock: nav is the handle; chat sits below and shares one transform.
 * Height token is the same CSS length used for closed-state translateY — no jump.
 */

import { MOTION_MS, PHONE_DOCK_EASE } from "@/animation/motion";

/** Shared by `.lab-phone-chat` height and closed `translateY`. */
export const PHONE_CHAT_H = "min(48dvh, 26rem)";

export const PHONE_DOCK_MS = MOTION_MS.phoneDock;
export { PHONE_DOCK_EASE };

export function phoneDockShift(open: boolean): string {
  return open ? "0px" : PHONE_CHAT_H;
}

export function phoneDockTransition(reduced: boolean): string {
  const ms = reduced ? MOTION_MS.reduced : PHONE_DOCK_MS;
  return `transform ${ms}ms ${PHONE_DOCK_EASE}, opacity ${ms}ms ${PHONE_DOCK_EASE}`;
}
