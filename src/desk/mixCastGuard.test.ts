import { describe, expect, it } from "vitest";
import { CUP_SET_WINDOW_MS } from "@/animation/cupSet/timeline";
import { mixToggleDecision, shouldStampCupSet } from "./mixCastGuard";

describe("mixToggleDecision", () => {
  it("refuses empty Mix/Cast", () => {
    expect(
      mixToggleDecision({
        contentsCount: 0,
        mixActive: false,
        mixResolved: false,
      }),
    ).toBe("empty");
  });

  it("holds through the unresolved window (spam / double-click)", () => {
    expect(
      mixToggleDecision({
        contentsCount: 2,
        mixActive: true,
        mixResolved: false,
      }),
    ).toBe("hold");
  });

  it("toggles off after chemistry resolved", () => {
    expect(
      mixToggleDecision({
        contentsCount: 2,
        mixActive: true,
        mixResolved: true,
      }),
    ).toBe("off");
  });

  it("engages when there is fill", () => {
    expect(
      mixToggleDecision({
        contentsCount: 1,
        mixActive: false,
        mixResolved: false,
      }),
    ).toBe("on");
  });
});

describe("shouldStampCupSet", () => {
  it("stamps tin when idle", () => {
    expect(
      shouldStampCupSet({ equipmentId: "tin", now: 1_000 }),
    ).toBe(true);
  });

  it("does not restamp a playing cup-set", () => {
    expect(
      shouldStampCupSet({
        equipmentId: "tin",
        cupSetAt: 1_000,
        now: 1_000 + 400,
      }),
    ).toBe(false);
  });

  it("allows recast after the window", () => {
    expect(
      shouldStampCupSet({
        equipmentId: "tin",
        cupSetAt: 1_000,
        now: 1_000 + CUP_SET_WINDOW_MS,
      }),
    ).toBe(true);
  });

  it("never stamps glass", () => {
    expect(
      shouldStampCupSet({ equipmentId: "beaker", now: 1_000 }),
    ).toBe(false);
  });
});
