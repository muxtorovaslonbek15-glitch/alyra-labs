/**
 * Solid Cast → pour-into-cup → set storyboard.
 * Pure elapsed-ms math so SVG / CSS / tests share one clock.
 */

export type CupSetPhase =
  | "idle"
  | "mix_hold"
  | "pour"
  | "settle"
  | "cool"
  | "set"
  | "ready";

export const CUP_SET_TIMELINE = {
  mixHoldEnd: 280,
  pourEnd: 1400,
  settleEnd: 1900,
  coolEnd: 2400,
  setEnd: 3100,
  readyEnd: 3400,
} as const;

/** Full spectacle window (ms). Build mix delay should cover this. */
export const CUP_SET_WINDOW_MS = CUP_SET_TIMELINE.readyEnd;

export interface CupSetInput {
  elapsedMs: number;
  hasFill: boolean;
  started?: boolean;
  reducedMotion?: boolean;
  /** Phone: compress after mix_hold (0.82). Default 1. */
  timeScale?: number;
}

export interface CupSetFrame {
  phase: CupSetPhase;
  /** Cup fill 0–1 during pour, then 1. */
  fill01: number;
  /** Set / matte progress 0–1 after settle. */
  set01: number;
  /** Stream energy 0–1 during pour. */
  pour01: number;
  /** Source tin tilt degrees (negative = pour toward cup). */
  tinTilt: number;
  tinOpacity: number;
  /** Cup slide-in 0–1. */
  cupEnter: number;
  /** Puck scale (1 → ~0.97). */
  contraction: number;
  /** Specular 0–1 (molten high, set low). */
  gloss: number;
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function phaseAt(t: number): CupSetPhase {
  if (t < CUP_SET_TIMELINE.mixHoldEnd) return "mix_hold";
  if (t < CUP_SET_TIMELINE.pourEnd) return "pour";
  if (t < CUP_SET_TIMELINE.settleEnd) return "settle";
  if (t < CUP_SET_TIMELINE.coolEnd) return "cool";
  if (t < CUP_SET_TIMELINE.setEnd) return "set";
  return "ready";
}

const READY: CupSetFrame = {
  phase: "ready",
  fill01: 1,
  set01: 1,
  pour01: 0,
  tinTilt: 0,
  tinOpacity: 0.32,
  cupEnter: 1,
  contraction: 0.97,
  gloss: 0.06,
};

/**
 * Map elapsed ms since `cupSetAt` into one visual frame.
 * `started` is true when `cupSetAt` is set; without it the desk stays idle.
 */
export function cupSetFrame(input: CupSetInput): CupSetFrame {
  const { elapsedMs, hasFill, started, reducedMotion, timeScale = 1 } = input;
  if (!started || !hasFill) {
    return {
      phase: "idle",
      fill01: hasFill ? 1 : 0,
      set01: hasFill ? 1 : 0,
      pour01: 0,
      tinTilt: 0,
      tinOpacity: 1,
      cupEnter: 0,
      contraction: 1,
      gloss: hasFill ? 0.12 : 0,
    };
  }

  if (reducedMotion) return READY;

  const scale = Math.max(0.5, Math.min(1, timeScale));
  const t = Math.max(0, elapsedMs) / scale;
  const phase = phaseAt(t);

  const fill01 = smoothstep(
    CUP_SET_TIMELINE.mixHoldEnd,
    CUP_SET_TIMELINE.pourEnd - 80,
    t,
  );
  const pour01 =
    phase === "pour"
      ? smoothstep(
          CUP_SET_TIMELINE.mixHoldEnd,
          CUP_SET_TIMELINE.mixHoldEnd + 180,
          t,
        ) *
        (1 -
          smoothstep(
            CUP_SET_TIMELINE.pourEnd - 220,
            CUP_SET_TIMELINE.pourEnd,
            t,
          ))
      : 0;

  const set01 = smoothstep(
    CUP_SET_TIMELINE.settleEnd,
    CUP_SET_TIMELINE.setEnd,
    t,
  );

  const tinTilt =
    phase === "pour"
      ? -18 * smoothstep(CUP_SET_TIMELINE.mixHoldEnd, CUP_SET_TIMELINE.mixHoldEnd + 220, t)
      : phase === "settle"
        ? -18 * (1 - smoothstep(CUP_SET_TIMELINE.pourEnd, CUP_SET_TIMELINE.settleEnd, t))
        : 0;

  const tinOpacity =
    t < CUP_SET_TIMELINE.mixHoldEnd
      ? 1
      : 1 - 0.68 * smoothstep(CUP_SET_TIMELINE.mixHoldEnd, CUP_SET_TIMELINE.settleEnd, t);

  const cupEnter = smoothstep(
    CUP_SET_TIMELINE.mixHoldEnd,
    CUP_SET_TIMELINE.mixHoldEnd + 400,
    t,
  );

  const contraction = 1 - 0.03 * set01;
  const gloss = 0.55 * (1 - set01) + 0.06 * set01;

  if (t >= CUP_SET_TIMELINE.readyEnd) return READY;

  return {
    phase,
    fill01,
    set01,
    pour01,
    tinTilt,
    tinOpacity,
    cupEnter,
    contraction,
    gloss,
  };
}
