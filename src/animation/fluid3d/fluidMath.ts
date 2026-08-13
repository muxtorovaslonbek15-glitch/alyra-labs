import type { FluidImpulseKind, FluidState } from "./types";

export function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Wax vs ice: ice is water + Cool. Wax is tin / high material visc / melt.
 * Freeze-thickened water must NOT count as wax.
 */
export function waxAmount(input: {
  viscosity: number;
  isSolidVessel?: boolean;
  waxFrac?: number;
  meltFraction?: number;
}): number {
  const visc = clamp01(input.viscosity);
  const viscWax = visc > 0.55 ? (visc - 0.55) / 0.45 : 0;
  const melt = input.meltFraction ?? 0;
  const meltWax = melt > 0.05 ? 0.55 + melt * 0.35 : 0;
  return clamp01(
    Math.max(
      input.isSolidVessel ? 0.85 : 0,
      input.waxFrac ?? 0,
      viscWax,
      meltWax,
    ),
  );
}

/** Watery stir reads as a hit; viscous stir is a slow shove. */
export function stirImpulseStrength(viscosity: number): number {
  return clamp01(0.38 + (1 - clamp01(viscosity)) * 0.5);
}

export function stirImpulseDurationMs(viscosity: number): number {
  return Math.round(620 * (1 + clamp01(viscosity) * 1.15));
}

export function impulseByKind(
  state: Pick<FluidState, "impulses">,
  now: number,
  kind: FluidImpulseKind,
): number {
  let e = 0;
  for (const imp of state.impulses) {
    if (imp.kind !== kind) continue;
    const age = now - imp.at;
    if (age < 0 || age > imp.durationMs) continue;
    const t = 1 - age / imp.durationMs;
    e = Math.max(e, imp.strength * t);
  }
  return e;
}

export function impulseEnergy(
  state: Pick<FluidState, "impulses">,
  now: number,
): number {
  let e = 0;
  for (const imp of state.impulses) {
    const age = now - imp.at;
    if (age < 0 || age > imp.durationMs) continue;
    const t = 1 - age / imp.durationMs;
    e = Math.max(e, imp.strength * t * t);
  }
  return e;
}

export function convectionScale(
  temperature: number,
  freeze: number,
  viscosity: number,
  stillWater = false,
): number {
  if (stillWater) return 0;
  const ice = clamp01(freeze);
  if (ice >= 0.98) return 0;
  const viscDamp = 1 - clamp01(viscosity) * 0.72;
  return clamp01(temperature) * (1 - ice * 0.92) * viscDamp;
}

/** 1 = full wave, lower = surface flattening under cool (wax already quiet). */
export function settleDamp(cool: number, wax: number): number {
  const chill = clamp01(cool);
  const waxKeep = clamp01(wax);
  return clamp01(1 - chill * 0.55 * (1 - waxKeep * 0.65));
}

export function fluidWaveAmp(input: {
  viscosity: number;
  freeze: number;
  wax: number;
  temperature: number;
  boil: boolean;
  agitation: number;
  overflow: number;
  melt: number;
  impulse: number;
  shakeImp: number;
  cool?: number;
  stillWater?: boolean;
}): number {
  if (input.stillWater) return 0;
  const freeze = clamp01(input.freeze);
  const visc = clamp01(input.viscosity);
  const wax = clamp01(input.wax);
  const waveBase =
    0.01 +
    input.impulse * 0.13 +
    input.temperature * 0.038 +
    (input.boil ? 0.06 : 0) +
    input.melt * 0.02 +
    input.agitation * 0.045 +
    input.shakeImp * 0.08 +
    input.overflow * 0.03;
  return (
    waveBase *
    (1 - visc * 0.55) *
    (1 - freeze * 0.95) *
    (1 - wax * 0.4) *
    settleDamp(input.cool ?? 0, wax)
  );
}

export function shouldEmitParticles(input: {
  wax: number;
  solidify: number;
  boil: boolean;
  bubble: boolean;
  foam: number;
  overflow: number;
  agitation: number;
  fill: number;
  stillWater?: boolean;
}): boolean {
  if (input.stillWater) return false;
  if (input.fill / 100 < 0.04) return false;
  if (input.wax * input.solidify > 0.45) return false;
  return (
    input.boil ||
    input.bubble ||
    input.foam > 0.15 ||
    input.overflow > 0.2 ||
    input.agitation > 0.35
  );
}

/** Effective shader viscosity: material + freeze, minus melt. */
export function shaderViscosity(
  viscosity: number,
  freeze: number,
  melt: number,
): number {
  return clamp01(viscosity + freeze * 0.35 - melt * 0.2);
}
