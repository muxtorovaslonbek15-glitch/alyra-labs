import { describe, expect, it } from "vitest";
import { CUP_SET_TIMELINE } from "@/animation/cupSet";
import {
  CAST_CUE_MS,
  COOL_FLASH_MS,
  MIX_WINDOW_MS,
  POUR_LIFT_PX,
  POUR_TIMELINE,
  POUR_WINDOW_MS,
  boilFromTemperature,
  computeFxIntensities,
  deskMotionClass,
  freezeFromLiveSim,
  getPourPhase,
  pourHomeFactor,
  pourPoseLiftPx,
  pourPoseTiltDeg,
  sourceFillFactor,
  splashIntensity,
  targetFillFactor,
  transferDisplayFillPct,
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

  it("does not teleport source fill at stream start", () => {
    expect(
      sourceFillFactor("stream", POUR_TIMELINE.holdEnd + 40),
    ).toBeGreaterThan(0.9);
  });

  it("keeps target fill at the pre-transfer level until the ribbon arrives", () => {
    expect(targetFillFactor("hold", 400)).toBe(0);
    expect(
      targetFillFactor("stream", POUR_TIMELINE.holdEnd + 40),
    ).toBeLessThan(0.15);
    const mid = targetFillFactor(
      "stream",
      (POUR_TIMELINE.holdEnd + POUR_TIMELINE.streamEnd) / 2,
    );
    expect(mid).toBeGreaterThan(0.2);
    expect(mid).toBeLessThan(0.9);
    expect(targetFillFactor("settle", 1400)).toBe(1);
  });

  it("lifts the source through hold/stream then eases down", () => {
    expect(pourPoseLiftPx("tilt", 0)).toBeLessThan(8);
    expect(pourPoseLiftPx("hold", 400)).toBe(POUR_LIFT_PX);
    expect(pourPoseLiftPx("stream", 900)).toBe(POUR_LIFT_PX);
    expect(pourPoseLiftPx("upright", POUR_WINDOW_MS - 1)).toBeLessThan(8);
  });

  it("holds pourHome at 0 until settle, then slides into the row", () => {
    expect(pourHomeFactor("stream", 900)).toBe(0);
    expect(pourHomeFactor("settle", POUR_TIMELINE.streamEnd + 20)).toBeLessThan(
      0.2,
    );
    expect(pourHomeFactor("upright", POUR_WINDOW_MS - 1)).toBeGreaterThan(0.9);
  });

  it("eases target display fill from stamped start (no rim teleport)", () => {
    const start = transferDisplayFillPct({
      role: "target",
      phase: "hold",
      elapsed: 400,
      storeFillPct: 70,
      targetFillPct: 0,
    });
    const end = transferDisplayFillPct({
      role: "target",
      phase: "settle",
      elapsed: 1400,
      storeFillPct: 70,
      targetFillPct: 0,
    });
    expect(start).toBe(0);
    expect(end).toBe(70);
  });

  it("times splash to stream arrival", () => {
    expect(splashIntensity("hold", 500)).toBe(0);
    expect(splashIntensity("stream", POUR_TIMELINE.holdEnd + 160)).toBeGreaterThan(
      0.5,
    );
  });

  it("keeps a settle splash and damps viscous spray", () => {
    expect(POUR_TIMELINE.settleEnd - POUR_TIMELINE.streamEnd).toBeGreaterThanOrEqual(
      350,
    );
    expect(
      splashIntensity("settle", POUR_TIMELINE.streamEnd + 40),
    ).toBeGreaterThan(0.1);
    expect(
      splashIntensity("stream", POUR_TIMELINE.holdEnd + 200, 0.8),
    ).toBeLessThan(
      splashIntensity("stream", POUR_TIMELINE.holdEnd + 200, 0.1),
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
    expect(i.splash).toBeGreaterThan(0);
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
      simFrost: 0.88,
      simViscosity: 0.72,
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

  it("locks Cast cue to cup-set mix_hold and skips liquid bloom", () => {
    expect(CAST_CUE_MS).toBe(CUP_SET_TIMELINE.mixHoldEnd);
    const liquid = computeFxIntensities({
      fx: { mixAt: now - 120 },
      effects: [],
      now,
    });
    const cast = computeFxIntensities({
      fx: {
        mixAt: now - 80,
        cupSetAt: now - 80,
        castRevealAt: now - 80,
      },
      effects: [],
      now,
    });
    expect(liquid.mixBloom).toBeGreaterThan(0.6);
    expect(liquid.castCue).toBe(0);
    expect(cast.mixBloom).toBe(0);
    expect(cast.castCue).toBeGreaterThan(0.4);
    expect(cast.blast).toBe(0);
  });

  it("does not strobe mix bloom while continuous mix is engaged", () => {
    const i = computeFxIntensities({
      fx: { mixAt: now - 20 },
      effects: [],
      now,
      mixActive: true,
    });
    expect(i.mixBloom).toBe(0);
    expect(i.castCue).toBe(0);
    expect(i.mix).toBeGreaterThan(0.5);
  });

  it("settles liquid mix bloom after the Mix window", () => {
    const mid = computeFxIntensities({
      fx: { mixAt: now - 400 },
      effects: [],
      now,
    });
    const done = computeFxIntensities({
      fx: { mixAt: now - MIX_WINDOW_MS - 10 },
      effects: [],
      now,
    });
    expect(mid.mixBloom).toBeGreaterThan(0.5);
    expect(done.mixBloom).toBe(0);
  });

  it("chills from cool bath without full freeze", () => {
    const coolOnly = computeFxIntensities({
      fx: {},
      effects: [],
      now,
      coolAttached: true,
    });
    expect(coolOnly.cool).toBeGreaterThan(0.6);
    expect(coolOnly.solidify).toBeLessThan(0.12);
  });

  it("does not pop freeze on cool flash or engine solidify hint", () => {
    const flash = computeFxIntensities({
      fx: { coolFlashAt: now - 80 },
      effects: [{ kind: "solidify", intensity: "medium" }],
      now,
      coolAttached: true,
    });
    expect(flash.cool).toBeGreaterThan(0.55);
    expect(flash.solidify).toBeLessThan(0.2);
    expect(COOL_FLASH_MS).toBe(550);
  });

  it("freezes gradually from live frost / viscosity", () => {
    const cond = freezeFromLiveSim(0.18, 0.22);
    const slush = freezeFromLiveSim(0.48, 0.52);
    const ice = freezeFromLiveSim(0.92, 0.82);
    expect(cond).toBeLessThan(0.08);
    expect(slush).toBeGreaterThan(cond);
    expect(slush).toBeLessThan(0.55);
    expect(ice).toBeGreaterThan(0.75);
    const late = computeFxIntensities({
      fx: {},
      effects: [],
      now,
      coolAttached: true,
      simFrost: 0.9,
      simViscosity: 0.8,
    });
    expect(late.solidify).toBeGreaterThan(0.7);
  });

  it("scales boil from live temperature — warming is convection, not a rolling boil", () => {
    expect(boilFromTemperature(0.5)).toBe(0);
    expect(boilFromTemperature(0.65)).toBeGreaterThan(0);
    expect(boilFromTemperature(0.65)).toBeLessThan(0.3);
    const warm = computeFxIntensities({
      fx: {},
      effects: [],
      now,
      heatAttached: true,
      simTemperature: 0.64,
    });
    const simmer = computeFxIntensities({
      fx: {},
      effects: [],
      now,
      heatAttached: true,
      simTemperature: 0.78,
    });
    const vapor = computeFxIntensities({
      fx: {},
      effects: [],
      now,
      heatAttached: true,
      boiling: true,
      simTemperature: 0.96,
    });
    expect(warm.heat).toBeGreaterThan(0.3);
    expect(warm.boil).toBeLessThan(simmer.boil);
    expect(simmer.boil).toBeGreaterThan(0.2);
    expect(vapor.boil).toBeGreaterThan(simmer.boil);
    expect(warm.burn).toBe(0);
    expect(vapor.burn).toBe(0);
  });

  it("does not melt heated water; meltFraction / melt effect pool solids", () => {
    const water = computeFxIntensities({
      fx: {},
      effects: [],
      now,
      heatAttached: true,
      simTemperature: 0.8,
    });
    const wax = computeFxIntensities({
      fx: {},
      effects: [{ kind: "melt", intensity: "high" }],
      now,
      heatAttached: true,
      simTemperature: 0.8,
      meltFraction: 0.7,
    });
    expect(water.melt).toBe(0);
    expect(wax.melt).toBeGreaterThan(0.65);
    expect(wax.heat).toBeGreaterThan(water.heat * 0.5);
  });
});
