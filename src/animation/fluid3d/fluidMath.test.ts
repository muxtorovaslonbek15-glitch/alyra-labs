import { describe, expect, it } from "vitest";
import {
  convectionScale,
  fluidWaveAmp,
  impulseByKind,
  impulseEnergy,
  settleDamp,
  shouldEmitParticles,
  stirImpulseStrength,
  waxAmount,
} from "./fluidMath";
import type { FluidImpulse } from "./types";

function stir(at: number, strength = 0.7, durationMs = 600): FluidImpulse {
  return { kind: "stir", strength, at, durationMs };
}

describe("waxAmount", () => {
  it("stays ice-path (no wax) for watery liquid even when chilled", () => {
    expect(
      waxAmount({ viscosity: 0.18, meltFraction: 0 }),
    ).toBe(0);
    expect(
      waxAmount({ viscosity: 0.4, meltFraction: 0 }),
    ).toBeLessThan(0.01);
  });

  it("rises from material viscosity above 0.55", () => {
    const thin = waxAmount({ viscosity: 0.5 });
    const thick = waxAmount({ viscosity: 0.85 });
    expect(thin).toBe(0);
    expect(thick).toBeGreaterThan(0.5);
    expect(thick).toBeLessThanOrEqual(1);
  });

  it("treats tin / waxFrac / melt as wax, not ice", () => {
    expect(waxAmount({ viscosity: 0.16, isSolidVessel: true })).toBeGreaterThan(
      0.8,
    );
    expect(waxAmount({ viscosity: 0.2, waxFrac: 0.7 })).toBeGreaterThan(0.6);
    expect(waxAmount({ viscosity: 0.3, meltFraction: 0.8 })).toBeGreaterThan(
      0.7,
    );
  });
});

describe("fluidWaveAmp", () => {
  const rest = {
    viscosity: 0.18,
    freeze: 0,
    wax: 0,
    temperature: 0,
    boil: false,
    agitation: 0,
    overflow: 0,
    melt: 0,
    impulse: 0,
    shakeImp: 0,
    cool: 0,
  };

  it("is quieter for viscous / wax than watery", () => {
    const water = fluidWaveAmp({ ...rest, impulse: 0.8 });
    const syrup = fluidWaveAmp({
      ...rest,
      viscosity: 0.85,
      wax: 0.7,
      impulse: 0.8,
    });
    expect(water).toBeGreaterThan(syrup * 1.6);
  });

  it("settles under cool and freeze", () => {
    const idle = fluidWaveAmp({ ...rest, impulse: 0.4 });
    const chilled = fluidWaveAmp({ ...rest, impulse: 0.4, cool: 0.9 });
    const frozen = fluidWaveAmp({ ...rest, impulse: 0.4, freeze: 0.9 });
    expect(chilled).toBeLessThan(idle);
    expect(frozen).toBeLessThan(chilled * 0.4);
  });

  it("hard-cuts to still water", () => {
    expect(fluidWaveAmp({ ...rest, impulse: 1, stillWater: true })).toBe(0);
  });
});

describe("impulses", () => {
  it("decays stir energy over the impulse window", () => {
    const at = 1_000;
    const impulses = [stir(at, 0.8, 800)];
    const peak = impulseByKind({ impulses } as { impulses: FluidImpulse[] }, at + 10, "stir");
    const mid = impulseByKind({ impulses } as { impulses: FluidImpulse[] }, at + 400, "stir");
    const gone = impulseByKind({ impulses } as { impulses: FluidImpulse[] }, at + 900, "stir");
    expect(peak).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(0.2);
    expect(gone).toBe(0);
  });

  it("peaks pour energy then falls", () => {
    const at = 5_000;
    const impulses: FluidImpulse[] = [
      { kind: "pour", strength: 0.9, at, durationMs: 900 },
    ];
    const early = impulseEnergy({ impulses }, at + 50);
    const late = impulseEnergy({ impulses }, at + 700);
    expect(early).toBeGreaterThan(late);
    expect(early).toBeGreaterThan(0.5);
  });

  it("makes watery stir hits stronger than viscous", () => {
    expect(stirImpulseStrength(0.1)).toBeGreaterThan(stirImpulseStrength(0.85));
  });
});

describe("convection + settle", () => {
  it("lifts more when hot and watery", () => {
    const hotWater = convectionScale(0.9, 0, 0.15);
    const hotSyrup = convectionScale(0.9, 0, 0.9);
    const cold = convectionScale(0.1, 0, 0.15);
    expect(hotWater).toBeGreaterThan(hotSyrup);
    expect(hotWater).toBeGreaterThan(cold * 3);
  });

  it("kills convection when frozen or still", () => {
    expect(convectionScale(1, 1, 0.1)).toBe(0);
    expect(convectionScale(1, 0, 0.1, true)).toBe(0);
  });

  it("settles harder as cool rises, except wax already damps", () => {
    expect(settleDamp(0, 0)).toBe(1);
    expect(settleDamp(0.8, 0)).toBeLessThan(0.6);
    expect(settleDamp(0.8, 0.9)).toBeGreaterThan(settleDamp(0.8, 0));
  });
});

describe("shouldEmitParticles", () => {
  const boiling = {
    wax: 0,
    solidify: 0,
    boil: true,
    bubble: false,
    foam: 0,
    overflow: 0,
    agitation: 0,
    fill: 40,
  };

  it("nucleates on boil for watery fill", () => {
    expect(shouldEmitParticles(boiling)).toBe(true);
  });

  it("hides particles on set wax and still water", () => {
    expect(
      shouldEmitParticles({ ...boiling, wax: 0.8, solidify: 0.7 }),
    ).toBe(false);
    expect(shouldEmitParticles({ ...boiling, stillWater: true })).toBe(false);
    expect(shouldEmitParticles({ ...boiling, fill: 0 })).toBe(false);
  });
});
