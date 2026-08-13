import { describe, expect, it } from "vitest";
import { MOTION_MS, PHONE_DOCK_EASE } from "@/animation/motion";
import {
  PHONE_CHAT_H,
  PHONE_DOCK_MS,
  phoneDockShift,
  phoneDockTransition,
} from "@/desk/phoneDock";

describe("phone dock shift", () => {
  it("uses the same length for closed translate and chat height", () => {
    expect(phoneDockShift(false)).toBe(PHONE_CHAT_H);
    expect(phoneDockShift(true)).toBe("0px");
  });

  it("keeps a dvh-capped height so desk + Cast stay on screen", () => {
    expect(PHONE_CHAT_H).toContain("dvh");
    expect(PHONE_CHAT_H.startsWith("min(")).toBe(true);
  });

  it("stays in the 200–260ms chrome band with shared ease-out", () => {
    expect(PHONE_DOCK_MS).toBe(240);
    expect(PHONE_DOCK_MS).toBeGreaterThanOrEqual(200);
    expect(PHONE_DOCK_MS).toBeLessThanOrEqual(260);
    expect(PHONE_DOCK_EASE).toBe("cubic-bezier(0.22, 1, 0.36, 1)");
    expect(phoneDockTransition(false)).toContain(`${PHONE_DOCK_MS}ms`);
    expect(phoneDockTransition(false)).toContain("transform");
    expect(phoneDockTransition(false)).toContain("opacity");
    expect(phoneDockTransition(true)).toContain(`${MOTION_MS.reduced}ms`);
  });
});
