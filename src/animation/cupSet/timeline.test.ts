import { describe, expect, it } from "vitest";
import {
  CUP_SET_WINDOW_MS,
  cupSetFrame,
  type CupSetPhase,
} from "./timeline";

describe("cupSetFrame", () => {
  it("is idle without a start or fill", () => {
    expect(cupSetFrame({ elapsedMs: 100, hasFill: true }).phase).toBe("idle");
    expect(
      cupSetFrame({ elapsedMs: 100, hasFill: false, started: true }).phase,
    ).toBe("idle");
  });

  it("walks mix_hold → pour → settle → cool → set → ready", () => {
    const phases: CupSetPhase[] = [];
    for (const t of [0, 280, 900, 1600, 2100, 2700, 3200]) {
      phases.push(
        cupSetFrame({ elapsedMs: t, hasFill: true, started: true }).phase,
      );
    }
    expect(phases).toEqual([
      "mix_hold",
      "pour",
      "pour",
      "settle",
      "cool",
      "set",
      "ready",
    ]);
  });

  it("hard-cuts to ready when reduced motion", () => {
    const f = cupSetFrame({
      elapsedMs: 0,
      hasFill: true,
      started: true,
      reducedMotion: true,
    });
    expect(f.phase).toBe("ready");
    expect(f.fill01).toBe(1);
    expect(f.set01).toBe(1);
    expect(f.pour01).toBe(0);
    expect(f.tinOpacity).toBeLessThan(0.4);
    expect(f.cupEnter).toBe(1);
  });

  it("raises fill during pour and set after settle", () => {
    const pour = cupSetFrame({ elapsedMs: 800, hasFill: true, started: true });
    const set = cupSetFrame({ elapsedMs: 2800, hasFill: true, started: true });
    expect(pour.fill01).toBeGreaterThan(0.2);
    expect(pour.fill01).toBeLessThan(1);
    expect(pour.pour01).toBeGreaterThan(0.4);
    expect(set.fill01).toBe(1);
    expect(set.set01).toBeGreaterThan(0.5);
    expect(set.contraction).toBeLessThan(1);
    expect(set.gloss).toBeLessThan(0.25);
    expect(set.tinOpacity).toBeLessThan(0.45);
  });

  it("exposes a window covering the storyboard", () => {
    expect(CUP_SET_WINDOW_MS).toBeGreaterThanOrEqual(3100);
  });
});
