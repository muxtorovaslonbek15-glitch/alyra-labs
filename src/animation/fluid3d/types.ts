/** Fluid sim state derived from live preview + vessel FX. */

export type FluidImpulseKind = "blast" | "flash" | "pour" | "stir" | "shake" | "burst";

export interface FluidImpulse {
  kind: FluidImpulseKind;
  /** 0–1 peak strength */
  strength: number;
  /** Wall-clock ms when the impulse started */
  at: number;
  /** Duration ms (default ~400–900 by kind) */
  durationMs: number;
}

export interface FluidLayer {
  color: string;
  /** Fraction of filled height (sums ≈ 1) */
  fraction: number;
}

export interface FluidState {
  /** Fill level 0–100 */
  fill: number;
  layers: FluidLayer[];
  /** 0 = watery, 1 = syrup / near-solid */
  viscosity: number;
  /** 0–1 dirty haze */
  turbidity: number;
  /** 0–1 foam cap intensity */
  foam: number;
  /** 0–1 heat energy (drives boil agitation) */
  temperature: number;
  impulses: FluidImpulse[];
  fillColor: string;
  /** Particle emitters */
  boil: boolean;
  bubble: boolean;
  /** 0–1 melt toward free liquid */
  melt: number;
  /** 0–1 solidify toward matte / slow */
  solidify: number;
  /** 0–1 continuous stir / mix swirl (rod + mix window) */
  agitation: number;
  /** 0–1 overflow / spill energy (overfill past lip) */
  overflow: number;
}
