import { describe, expect, it } from "vitest";
import {
  POUR_TIMELINE,
  POUR_WINDOW_MS,
  computeFxIntensities,
  deskMotionClass,
  getPourPhase,
  pourPoseTiltDeg,
  sourceFillFactor,
  splashIntensity,
} from "./fxIntensity";

describe("fxIntensity pour pose machine", () => {
  it("walks tilt → hold → stream → settle → upright", () => {
    expect(getPourPhase(0)).toBe("tilt");
    expect(getPourPhase(POUR_TIMELINE.tiltEnd)).toBe("hold");
    expect(getPourPhase(POUR_TIMELINE.holdEnd)).toBe("stream");
    expect(getPourPhase(POUR_TIMELINE.streamEnd)).toBe("settle");
    expect(getPourPhase(POUR_TIMELINE.settleEnd)).toBe("upright");
    expect(getPourPhase(POUR_WINDOW_MS)).toBe("idle");
  });

  it("holds a deep tilt before streaming", () => {
    expect(pourPoseTiltDeg("hold", 400)).toBe(-38);
    expect(pourPoseTiltDeg("stream", 800)).toBe(-34);
    expect(Math.abs(pourPoseTiltDeg("upright", POUR_WINDOW_MS - 1))).toBeLessThan(
      3,
    );
  });

  it("drains source fill during stream only", () => {
    expect(sourceFillFactor("hold", 400)).toBe(1);
    const mid = sourceFillFactor(
      "stream",
      (POUR_TIMELINE.holdEnd + POUR_TIMELINE.streamEnd) / 2,
    );
    expect(mid).toBeGreaterThan(0.2);
    expect(mid).toBeLessThan(0.85);
    expect(sourceFillFactor("settle", 1400)).toBeLessThan(0.1);
  });

  it("times splash to stream arrival", () => {
    expect(splashIntensity("hold", 500)).toBe(0);
    expect(splashIntensity("stream", POUR_TIMELINE.holdEnd + 160)).toBeGreaterThan(
      0.5,
    );
  });
});

describe("computeFxIntensities", () => {
  const now = 1_700_000_000_000;

  it("aligns pour / blast / boil from one clock", () => {
    const i = computeFxIntensities({
      fx: { transferAt: now - 800, transferRole: "source", mixAt: now - 100 },
      effects: [
        { kind: "blast", intensity: "high" },
        { kind: "boil", intensity: "medium" },
      ],
      now,
      boiling: true,
      heatAttached: true,
    });
    expect(i.pourPhase).toBe("stream");
    expect(i.pour).toBeGreaterThan(0.4);
    expect(i.blast).toBeGreaterThan(0.4);
    expect(i.boil).toBeGreaterThan(0.4);
    expect(i.sourceFillFactor).toBeLessThan(1);
  });

  it("does not burn on plain boil without combustion markers", () => {
    const i = computeFxIntensities({
      fx: {},
      effects: [{ kind: "boil", intensity: "high" }],
      now,
      boiling: true,
      heatAttached: true,
    });
    expect(i.boil).toBeGreaterThan(0.5);
    expect(i.burn).toBe(0);
  });

  it("burns when smoke / flash combustion is present", () => {
    const i = computeFxIntensities({
      fx: { mixAt: now - 50 },
      effects: [
        { kind: "smoke", intensity: "high" },
        { kind: "flash", intensity: "high" },
      ],
      now,
      heatAttached: true,
    });
    expect(i.burn).toBeGreaterThan(0.5);
  });

  it("raises solidify from cool / crystal and melt from melt effect", () => {
    const solid = computeFxIntensities({
      fx: {},
      effects: [{ kind: "solidify", intensity: "high" }],
      now,
      coolAttached: true,
    });
    const melt = computeFxIntensities({
      fx: { heatFlashAt: now - 40 },
      effects: [{ kind: "melt", intensity: "high" }],
      now,
      heatAttached: true,
    });
    expect(solid.solidify).toBeGreaterThan(0.5);
    expect(melt.melt).toBeGreaterThan(0.5);
  });

  it("chills from cool bath without full freeze", () => {
    const coolOnly = computeFxIntensities({
      fx: {},
      effects: [],
      now,
      coolAttached: true,
    });
    expect(coolOnly.cool).toBeGreaterThan(0.6);
    expect(coolOnly.solidify).toBeLessThan(0.35);
    expect(coolOnly.solidify).toBeGreaterThan(0.1);
  });
});
