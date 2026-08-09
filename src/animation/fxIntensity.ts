import type { EngineEffect, EngineEffectKind, VesselFx } from "@/types";

/** Pour pose machine phases (source card). */
export type PourPhase =
  | "idle"
  | "tilt"
  | "hold"
  | "stream"
  | "settle"
  | "upright";

/** Shared 0–1 intensities so CSS / SVG / WebGL share one beat. */
export interface FxIntensities {
  pour: number;
  mix: number;
  blast: number;
  boil: number;
  solidify: number;
  melt: number;
  burn: number;
  heat: number;
  cool: number;
  pourPhase: PourPhase;
  /** Elapsed ms into active pour/transfer window (0 if idle). */
  pourElapsed: number;
  /** Source display fill factor 1→0 during transfer drain. */
  sourceFillFactor: number;
  /** Target splash/bloom gate (peaks when stream arrives). */
  splash: number;
}

/** Total pour / transfer FX window (ms). */
export const POUR_WINDOW_MS = 1800;

/**
 * Pose timeline — longer hold before stream so the tilt reads.
 * tilt → hold → stream → settle → upright
 */
export const POUR_TIMELINE = {
  tiltEnd: 280,
  holdEnd: 620,
  streamEnd: 1280,
  settleEnd: 1550,
  uprightEnd: POUR_WINDOW_MS,
} as const;

const MIX_WINDOW_MS = 2200;
const BLAST_WINDOW_MS = 900;
const HEAT_FLASH_MS = 1000;
const COOL_FLASH_MS = 1000;

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

/** Smoothstep envelope with optional attack / sustain / release fractions of duration. */
export function fxEnvelope(
  at: number | undefined,
  durationMs: number,
  now: number,
  attack = 0.12,
  release = 0.35,
): number {
  if (!at || !now || durationMs <= 0) return 0;
  const age = now - at;
  if (age < 0 || age >= durationMs) return 0;
  const t = age / durationMs;
  if (t < attack) return clamp01(t / attack);
  if (t > 1 - release) return clamp01((1 - t) / release);
  return 1;
}

/** Sharp peak for blast / flash hits. */
export function fxPeak(
  at: number | undefined,
  durationMs: number,
  now: number,
): number {
  if (!at || !now || durationMs <= 0) return 0;
  const age = now - at;
  if (age < 0 || age >= durationMs) return 0;
  const t = age / durationMs;
  // Fast attack, longer after-beat falloff
  return clamp01(Math.pow(1 - t, 1.6));
}

function effectStrength(
  effects: EngineEffect[] | undefined,
  kind: EngineEffectKind,
): number {
  const e = effects?.find((x) => x.kind === kind);
  if (!e) return 0;
  switch (e.intensity) {
    case "high":
    case "exo":
      return 1;
    case "medium":
      return 0.65;
    case "low":
    case "endo":
      return 0.35;
    default:
      return 0.55;
  }
}

function hasKind(
  effects: EngineEffect[] | undefined,
  kind: EngineEffectKind,
): boolean {
  return Boolean(effects?.some((e) => e.kind === kind));
}

export function getPourPhase(elapsed: number): PourPhase {
  if (elapsed < 0 || !Number.isFinite(elapsed)) return "idle";
  if (elapsed < POUR_TIMELINE.tiltEnd) return "tilt";
  if (elapsed < POUR_TIMELINE.holdEnd) return "hold";
  if (elapsed < POUR_TIMELINE.streamEnd) return "stream";
  if (elapsed < POUR_TIMELINE.settleEnd) return "settle";
  if (elapsed < POUR_TIMELINE.uprightEnd) return "upright";
  return "idle";
}

/** Card tilt degrees for the pour pose machine (card owns pose; glass tip stays small). */
export function pourPoseTiltDeg(phase: PourPhase, elapsed: number): number {
  const { tiltEnd, holdEnd, streamEnd, settleEnd, uprightEnd } = POUR_TIMELINE;
  switch (phase) {
    case "tilt": {
      const t = clamp01(elapsed / tiltEnd);
      return -38 * (t * t * (3 - 2 * t));
    }
    case "hold":
      return -38;
    case "stream":
      return -34;
    case "settle": {
      const t = clamp01((elapsed - streamEnd) / (settleEnd - streamEnd));
      return -34 + 22 * t;
    }
    case "upright": {
      const t = clamp01((elapsed - settleEnd) / (uprightEnd - settleEnd));
      return -12 * (1 - t);
    }
    default:
      return 0;
  }
}

/** Source fill factor: full until stream, drains during stream, empty after. */
export function sourceFillFactor(phase: PourPhase, elapsed: number): number {
  if (phase === "idle") return 1;
  if (phase === "tilt" || phase === "hold") return 1;
  if (phase === "stream") {
    const t = clamp01(
      (elapsed - POUR_TIMELINE.holdEnd) /
        (POUR_TIMELINE.streamEnd - POUR_TIMELINE.holdEnd),
    );
    return 1 - t * 0.92;
  }
  return 0.06;
}

/** Splash intensity on target — peaks shortly after stream starts (arrival). */
export function splashIntensity(phase: PourPhase, elapsed: number): number {
  if (phase !== "stream" && phase !== "settle") return 0;
  const arrival = POUR_TIMELINE.holdEnd + 80;
  const age = elapsed - arrival;
  if (age < 0) return 0;
  if (age < 220) return clamp01(age / 80);
  if (age < 700) return clamp01(1 - (age - 220) / 480);
  return 0;
}

export interface ComputeFxIntensitiesInput {
  fx?: VesselFx;
  effects?: EngineEffect[];
  now: number;
  heatAttached?: boolean;
  coolAttached?: boolean;
  boiling?: boolean;
  /** Live sim temperature 0–1 (ambient 0.5). */
  simTemperature?: number;
  /** Live frost 0–1. */
  simFrost?: number;
  /** Live viscosity 0–1. */
  simViscosity?: number;
  /** Continuous stir engaged. */
  stirActive?: boolean;
  /** Continuous shake engaged. */
  shakeActive?: boolean;
  /** Continuous mix/cast engaged. */
  mixActive?: boolean;
  /** 0–1 ease-out agitation from live sim. */
  agitation?: number;
  /** Solid melt fraction 0–1. */
  meltFraction?: number;
}

/**
 * Map VesselFx + effect kinds + now → shared 0–1 intensities.
 * Prefer this over ad-hoc fxAlive checks in CSS / SVG / fluid paths.
 */
export function computeFxIntensities(
  input: ComputeFxIntensitiesInput,
): FxIntensities {
  const {
    fx,
    effects,
    now,
    heatAttached = false,
    coolAttached = false,
    boiling = false,
    simTemperature,
    simFrost = 0,
    simViscosity,
    stirActive = false,
    shakeActive = false,
    mixActive = false,
    agitation = 0,
    meltFraction = 0,
  } = input;
  const temp =
    typeof simTemperature === "number" ? simTemperature : heatAttached ? 0.62 : 0.5;

  const pourAt = fx?.pourAt ?? fx?.transferAt;
  const pourElapsed =
    pourAt && now ? Math.max(0, now - pourAt) : 0;
  const pourActive =
    Boolean(pourAt) && pourElapsed < POUR_WINDOW_MS && pourElapsed >= 0;
  const pourPhase = pourActive ? getPourPhase(pourElapsed) : "idle";

  const pourEnv = fxEnvelope(pourAt, POUR_WINDOW_MS, now, 0.08, 0.2);
  const streamGate =
    pourPhase === "stream" ? 1 : pourPhase === "settle" ? 0.35 : 0;
  const pour = clamp01(pourEnv * Math.max(streamGate, pourPhase === "hold" ? 0.25 : 0));

  const mixAt = fx?.mixAt;
  const continuousMix = clamp01(
    Math.max(
      agitation,
      stirActive ? 0.55 : 0,
      shakeActive ? 0.8 : 0,
      mixActive ? 0.9 : 0,
    ),
  );
  const mix = Math.max(
    fxEnvelope(mixAt, MIX_WINDOW_MS, now, 0.05, 0.45),
    fxEnvelope(fx?.shakeAt, 1600, now, 0.05, 0.4),
    continuousMix > 0.05
      ? continuousMix * (0.85 + 0.15 * Math.sin(now / 220))
      : 0,
  );

  const blastKind =
    effectStrength(effects, "blast") ||
    effectStrength(effects, "burst") ||
    effectStrength(effects, "flash");
  const blastPulse = Math.max(
    fxPeak(mixAt, BLAST_WINDOW_MS, now),
    fxPeak(fx?.shakeAt, 700, now) * 0.6,
  );
  const blast = clamp01(blastKind * Math.max(blastPulse, mix * 0.55));

  const boilFx = effectStrength(effects, "boil");
  const bubbleFx = effectStrength(effects, "bubble");
  const gasFx = effectStrength(effects, "gas");
  const simBoil = heatAttached && temp >= 0.72 ? clamp01((temp - 0.72) / 0.28) : 0;
  const boilSustained =
    boiling || boilFx > 0 || simBoil > 0.15
      ? Math.max(0.55, boilFx, boiling ? 0.85 : 0, simBoil * 0.95)
      : 0;
  // Nucleation pulse rides the clock so CSS / SVG / particles share peaks
  const boilPulse =
    boilSustained > 0 && now
      ? 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(now / 180))
      : 0;
  const boil = clamp01(
    Math.max(boilSustained * boilPulse, (bubbleFx || gasFx) * mix * 0.8),
  );

  const solidFx = effectStrength(effects, "solidify");
  const crystalFx = effectStrength(effects, "crystal");
  // Cool bath chills / thickens; frost + viscosity drive gradual ice
  const solidify = clamp01(
    Math.max(
      solidFx,
      crystalFx * 0.7,
      simFrost * 0.95,
      typeof simViscosity === "number" && simViscosity > 0.45
        ? (simViscosity - 0.45) * 1.2
        : 0,
      coolAttached && solidFx === 0 ? 0.18 + simFrost * 0.35 : coolAttached ? 0.35 : 0,
      fxEnvelope(fx?.coolFlashAt, COOL_FLASH_MS, now) *
        (solidFx > 0 || crystalFx > 0 || simFrost > 0.3 ? 0.85 : 0.35),
    ),
  );

  const meltFx = effectStrength(effects, "melt");
  const melt = clamp01(
    Math.max(
      meltFx,
      meltFraction,
      heatAttached && temp > 0.55 ? (temp - 0.55) * 0.8 : 0,
      fxEnvelope(fx?.heatFlashAt, HEAT_FLASH_MS, now) *
        (meltFx > 0 || hasKind(effects, "melt") || meltFraction > 0.2 ? 1 : 0.35),
    ),
  );

  const smoke = hasKind(effects, "smoke");
  const flash = hasKind(effects, "flash");
  const combustion =
    smoke || (flash && (heatAttached || effectStrength(effects, "heat") > 0.5));
  // Do not fake burn on plain boiling water (boil without combustion markers)
  const burn = combustion
    ? clamp01(
        0.55 +
          effectStrength(effects, "smoke") * 0.45 +
          (flash ? 0.35 : 0) +
          (heatAttached ? 0.2 : 0),
      )
    : 0;

  const heatFx = effects?.find((e) => e.kind === "heat");
  const heat = clamp01(
    Math.max(
      heatAttached ? 0.35 + Math.max(0, temp - 0.5) * 1.1 : Math.max(0, temp - 0.55) * 0.6,
      heatFx?.intensity === "exo" ? 0.85 : 0,
      heatFx?.intensity === "endo" ? 0 : effectStrength(effects, "heat") * 0.5,
      fxEnvelope(fx?.heatFlashAt, HEAT_FLASH_MS, now),
      boil * 0.35,
    ),
  );

  const cool = clamp01(
    Math.max(
      coolAttached ? 0.62 + simFrost * 0.35 : simFrost * 0.75,
      heatFx?.intensity === "endo" ? 0.75 : 0,
      solidify * 0.35,
      temp < 0.45 ? (0.45 - temp) * 1.4 : 0,
      fxEnvelope(fx?.coolFlashAt, COOL_FLASH_MS, now),
    ),
  );

  return {
    pour,
    mix,
    blast,
    boil,
    solidify,
    melt,
    burn,
    heat,
    cool,
    pourPhase,
    pourElapsed: pourActive ? pourElapsed : 0,
    sourceFillFactor: pourActive
      ? sourceFillFactor(pourPhase, pourElapsed)
      : 1,
    splash: pourActive ? splashIntensity(pourPhase, pourElapsed) : 0,
  };
}

/** Desk surface response from active vessel intensities. */
export function deskMotionClass(intensities: FxIntensities[]): string {
  let maxBlast = 0;
  let maxSplash = 0;
  let settling = false;
  for (const i of intensities) {
    maxBlast = Math.max(maxBlast, i.blast);
    maxSplash = Math.max(maxSplash, i.splash);
    if (i.pourPhase === "settle" || i.pourPhase === "upright") settling = true;
  }
  if (maxBlast > 0.45) return "lab-desk-blast-shake";
  if (settling || maxSplash > 0.4) return "lab-desk-pour-settle";
  return "";
}
