import { CUP_SET_TIMELINE } from "@/animation/cupSet";
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
  /** Target display fill 0→1 during stream (no teleport to the rim). */
  targetFillFactor: number;
  /** Target splash/bloom gate (peaks when stream arrives). */
  splash: number;
  /**
   * One-shot liquid Mix bloom (mixAt only — not stir/shake/continuous).
   * 0 on solid Cast; cup-set owns that spectacle after the cue.
   */
  mixBloom: number;
  /** Solid Cast mix_hold cue 0–1; 0 on liquid Mix. */
  castCue: number;
}

/**
 * Pose timeline — hold before stream so the tilt reads.
 * tilt → hold → stream → settle → upright
 * Settle is long enough for surface recovery (not a 270ms snap).
 */
export const POUR_TIMELINE = {
  tiltEnd: 280,
  holdEnd: 620,
  streamEnd: 1280,
  settleEnd: 1630,
  uprightEnd: 1880,
} as const;

/** Total pour / transfer FX window (ms). */
export const POUR_WINDOW_MS = POUR_TIMELINE.uprightEnd;

/** Delay after stream starts before source fill moves (ribbon travel). */
const STREAM_TRAVEL_MS = 90;

/** Source card lift so it never paints behind the target. */
export const POUR_LIFT_PX = 58;

/** Liquid Mix bloom window — held homogenize, then settle. Not a flash. */
export const MIX_WINDOW_MS = 1600;
/** Solid Cast mix_hold — then cup-set owns the eye. */
export const CAST_CUE_MS = CUP_SET_TIMELINE.mixHoldEnd;
const BLAST_WINDOW_MS = 900;
/** Brief amber well-wash on heat toggle — presence, not a firework. */
export const HEAT_FLASH_MS = 560;
/** Melt pulse rides the heat flash a touch longer so solids read as pooling. */
export const MELT_FLASH_MS = 900;
/** Live-sim temp where convection starts (warming). */
export const HEAT_WARM_TEMP = 0.6;
/** Live-sim temp where nucleation begins (simmer). Matches vesselSim phase. */
export const HEAT_SIMMER_TEMP = 0.72;
/** Live-sim temp where steam / rolling boil dominates. */
export const HEAT_VAPOR_TEMP = 0.92;
/** Ice-bath toggle flash — DESIGN 200–300ms feel, quiet peak (not a freeze pop). */
export const COOL_FLASH_MS = 550;

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

/**
 * Heat-driven boil 0–1 from live temperature.
 * Warming = convection only; simmer nucleates; vapor is a rolling boil.
 */
export function boilFromTemperature(temp: number): number {
  if (temp < HEAT_WARM_TEMP) return 0;
  if (temp < HEAT_SIMMER_TEMP) {
    return ((temp - HEAT_WARM_TEMP) / (HEAT_SIMMER_TEMP - HEAT_WARM_TEMP)) * 0.36;
  }
  if (temp < HEAT_VAPOR_TEMP) {
    return (
      0.36 +
      ((temp - HEAT_SIMMER_TEMP) / (HEAT_VAPOR_TEMP - HEAT_SIMMER_TEMP)) * 0.42
    );
  }
  return clamp01(0.78 + (temp - HEAT_VAPOR_TEMP) * 2.75);
}

function smooth01(t: number) {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

/**
 * Freeze amount from live sim — condensation (low frost) is not ice.
 * Ice bath attach must not jump this; frost/viscosity climb over SLUSH/ICE.
 */
export function freezeFromLiveSim(
  simFrost: number,
  simViscosity?: number,
): number {
  const frostIce =
    simFrost > 0.28 ? smooth01((simFrost - 0.28) / 0.72) : 0;
  const viscIce =
    typeof simViscosity === "number" && simViscosity > 0.5
      ? (simViscosity - 0.5) * 1.05
      : 0;
  return clamp01(Math.max(frostIce, viscIce));
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

/** Source fill factor: full until stream, eases empty during stream (no teleport). */
export function sourceFillFactor(phase: PourPhase, elapsed: number): number {
  if (phase === "idle") return 1;
  if (phase === "tilt" || phase === "hold") return 1;
  if (phase === "stream") {
    const span = POUR_TIMELINE.streamEnd - POUR_TIMELINE.holdEnd;
    const t = clamp01(
      (elapsed - POUR_TIMELINE.holdEnd - STREAM_TRAVEL_MS) /
        Math.max(1, span - STREAM_TRAVEL_MS),
    );
    const eased = t * t * (3 - 2 * t);
    return 1 - eased * 0.94;
  }
  return 0.06;
}

/** Target fill 0→1: stay at pre-transfer level until the ribbon arrives. */
export function targetFillFactor(phase: PourPhase, elapsed: number): number {
  if (phase === "idle") return 1;
  if (phase === "tilt" || phase === "hold") return 0;
  if (phase === "stream") {
    const span = POUR_TIMELINE.streamEnd - POUR_TIMELINE.holdEnd;
    const t = clamp01(
      (elapsed - POUR_TIMELINE.holdEnd - STREAM_TRAVEL_MS) /
        Math.max(1, span - STREAM_TRAVEL_MS),
    );
    return t * t * (3 - 2 * t);
  }
  return 1;
}

/**
 * Lift (px up) for the source card. Peaks through hold/stream, eases down
 * as the vessel uprights — stacking is z-index; this is the physical raise.
 */
export function pourPoseLiftPx(phase: PourPhase, elapsed: number): number {
  const { tiltEnd, streamEnd, settleEnd, uprightEnd } = POUR_TIMELINE;
  switch (phase) {
    case "tilt": {
      const t = clamp01(elapsed / tiltEnd);
      return POUR_LIFT_PX * (t * t * (3 - 2 * t));
    }
    case "hold":
    case "stream":
      return POUR_LIFT_PX;
    case "settle": {
      const t = clamp01((elapsed - streamEnd) / (settleEnd - streamEnd));
      return POUR_LIFT_PX * (1 - t * 0.42);
    }
    case "upright": {
      const t = clamp01((elapsed - settleEnd) / (uprightEnd - settleEnd));
      return POUR_LIFT_PX * 0.58 * (1 - t);
    }
    default:
      return 0;
  }
}

/**
 * 0 during tilt/hold/stream (stay over the target), 0→1 through settle+upright
 * so the source slides into pourHome instead of teleporting.
 */
export function pourHomeFactor(phase: PourPhase, elapsed: number): number {
  const { streamEnd, settleEnd, uprightEnd } = POUR_TIMELINE;
  if (phase === "idle") return 1;
  if (phase === "settle") {
    const t = clamp01((elapsed - streamEnd) / (settleEnd - streamEnd));
    return t * 0.4;
  }
  if (phase === "upright") {
    const t = clamp01((elapsed - settleEnd) / (uprightEnd - settleEnd));
    return 0.4 + 0.6 * (t * t * (3 - 2 * t));
  }
  return 0;
}

/** Display fill % for a transferring vessel (source drains, target eases in). */
export function transferDisplayFillPct(opts: {
  role?: "source" | "target";
  phase: PourPhase;
  elapsed: number;
  storeFillPct: number;
  sourceFillPct?: number;
  targetFillPct?: number;
}): number {
  if (opts.role === "source") {
    const start = opts.sourceFillPct ?? Math.max(opts.storeFillPct, 48);
    return start * sourceFillFactor(opts.phase, opts.elapsed);
  }
  if (opts.role === "target") {
    const start = opts.targetFillPct ?? 0;
    const t = targetFillFactor(opts.phase, opts.elapsed);
    return start + (opts.storeFillPct - start) * t;
  }
  return opts.storeFillPct;
}

/** Splash intensity on target — peaks on arrival, tails through settle. */
export function splashIntensity(
  phase: PourPhase,
  elapsed: number,
  viscosity = 0,
): number {
  const visc = clamp01(viscosity);
  const amp = 1 - visc * 0.88;
  if (amp <= 0.02) return 0;
  if (phase !== "stream" && phase !== "settle") return 0;
  if (phase === "settle") {
    const t = clamp01(
      (elapsed - POUR_TIMELINE.streamEnd) /
        Math.max(1, POUR_TIMELINE.settleEnd - POUR_TIMELINE.streamEnd),
    );
    return clamp01((1 - t) * 0.42 * amp);
  }
  const travel = 80 + visc * 140;
  const arrival = POUR_TIMELINE.holdEnd + travel;
  const age = elapsed - arrival;
  if (age < 0) return 0;
  if (age < 220) return clamp01(age / 90) * amp;
  if (age < 780) return clamp01(1 - (age - 220) / 560) * amp;
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
  const isCast = Boolean(fx?.cupSetAt || fx?.castRevealAt);
  /** Continuous mix patches mixAt every tick — never treat that as a one-shot hit. */
  const mixHitAt = mixActive ? undefined : mixAt;
  const continuousMix = clamp01(
    Math.max(
      agitation,
      stirActive ? 0.55 : 0,
      shakeActive ? 0.8 : 0,
      mixActive ? 0.9 : 0,
    ),
  );
  const mix = Math.max(
    fxEnvelope(mixHitAt, MIX_WINDOW_MS, now, 0.08, 0.42),
    fxEnvelope(fx?.shakeAt, 1600, now, 0.05, 0.4),
    continuousMix > 0.05
      ? continuousMix * (0.85 + 0.15 * Math.sin(now / 220))
      : 0,
  );
  const mixBloom =
    isCast || !mixHitAt
      ? 0
      : fxEnvelope(mixHitAt, MIX_WINDOW_MS, now, 0.08, 0.42);
  const castCue = isCast
    ? fxEnvelope(mixHitAt ?? fx?.cupSetAt ?? fx?.castRevealAt, CAST_CUE_MS, now, 0.12, 0.4)
    : 0;

  const blastKind =
    effectStrength(effects, "blast") ||
    effectStrength(effects, "burst") ||
    effectStrength(effects, "flash");
  const blastPulse = isCast
    ? 0
    : Math.max(
        fxPeak(mixHitAt, BLAST_WINDOW_MS, now),
        fxPeak(fx?.shakeAt, 700, now) * 0.6,
      );
  const blast = clamp01(
    blastKind * Math.max(blastPulse, isCast ? 0 : mix * 0.55),
  );

  const boilFx = effectStrength(effects, "boil");
  const bubbleFx = effectStrength(effects, "bubble");
  const gasFx = effectStrength(effects, "gas");
  const tempKnown = typeof simTemperature === "number";
  // Live temp drives boil when known; otherwise engine/boiling flag (tests, no sim).
  const heatBoil =
    (heatAttached || boiling) && tempKnown ? boilFromTemperature(temp) : 0;
  const boilSustained = Math.max(
    boilFx,
    heatBoil,
    boiling && !tempKnown ? 0.85 : 0,
  );
  // Nucleation pulse rides the clock so CSS / SVG / particles share peaks
  const boilPulse =
    boilSustained > 0 && now
      ? 0.72 +
        0.28 * (0.5 + 0.5 * Math.sin(now / (210 - boilSustained * 55)))
      : 0;
  const boil = clamp01(
    Math.max(boilSustained * boilPulse, (bubbleFx || gasFx) * mix * 0.8),
  );

  const solidFx = effectStrength(effects, "solidify");
  const crystalFx = effectStrength(effects, "crystal");
  const liveFreeze = freezeFromLiveSim(simFrost, simViscosity);
  const effectFreeze = Math.max(solidFx, crystalFx * 0.7);
  // Cool bath is chill first; engine solidify/crystal are a ceiling, not a pop.
  // Mix-result freeze (no bath) still lands at full effect strength.
  const solidify = clamp01(
    Math.max(
      liveFreeze,
      coolAttached
        ? effectFreeze * Math.max(liveFreeze, 0.06)
        : effectFreeze,
      fxEnvelope(fx?.coolFlashAt, COOL_FLASH_MS, now, 0.2, 0.55) *
        liveFreeze *
        0.45,
    ),
  );

  const meltFx = effectStrength(effects, "melt");
  const melting =
    meltFx > 0 || hasKind(effects, "melt") || meltFraction > 0.04;
  // Water on heat must not drip-melt; solids/engine melt only.
  const meltFromHeat = melting
    ? tempKnown
      ? meltFx * clamp01((temp - 0.52) / 0.36)
      : meltFx
    : 0;
  const melt = clamp01(
    Math.max(
      meltFraction,
      meltFromHeat,
      fxEnvelope(fx?.heatFlashAt, MELT_FLASH_MS, now, 0.14, 0.4) *
        (melting ? 0.85 : 0),
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
  const heatFlash = fxEnvelope(fx?.heatFlashAt, HEAT_FLASH_MS, now, 0.16, 0.48);
  const heat = clamp01(
    Math.max(
      heatAttached
        ? 0.28 + Math.max(0, temp - 0.5) * 1.05
        : Math.max(0, temp - 0.55) * 0.55,
      heatFx?.intensity === "exo" ? 0.78 : 0,
      heatFx?.intensity === "endo" ? 0 : effectStrength(effects, "heat") * 0.5,
      heatFlash,
      // Boil is hot, not a flame — keep coupling quiet
      boil * 0.16,
    ),
  );

  const cool = clamp01(
    Math.max(
      coolAttached ? 0.62 + simFrost * 0.36 : simFrost * 0.75,
      heatFx?.intensity === "endo" ? 0.75 : 0,
      liveFreeze * 0.32,
      temp < 0.45 ? (0.45 - temp) * 1.4 : 0,
      fxEnvelope(fx?.coolFlashAt, COOL_FLASH_MS, now, 0.18, 0.55),
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
    targetFillFactor: pourActive
      ? targetFillFactor(pourPhase, pourElapsed)
      : 1,
    splash: pourActive
      ? splashIntensity(pourPhase, pourElapsed, simViscosity ?? 0)
      : 0,
    mixBloom,
    castCue,
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
