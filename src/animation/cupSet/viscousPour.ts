/**
 * Viscosity-aware pour ribbon parameters.
 * Cup-set owns the wax ribbon; other specialists may reuse this helper.
 */

export interface ViscousPourParams {
  strokeWidth: number;
  dropletCount: number;
  bloom: number;
  durationMs: number;
  elongate: boolean;
  glow: boolean;
  /** Dash length for CSS stroke-dasharray */
  dash: number;
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function viscousPourParams(viscosity: number): ViscousPourParams {
  const v = clamp01(viscosity);
  const thick = v >= 0.65;
  return {
    strokeWidth: lerp(7.5, 16.5, v),
    dropletCount: Math.round(lerp(11, 3, v)),
    bloom: lerp(1, 0.05, v),
    durationMs: lerp(1150, 1580, v),
    elongate: thick,
    glow: !thick,
    dash: lerp(160, 220, v),
  };
}
