/**
 * Visual material for molten → set balm in the cup.
 * set01: 0 molten gloss, 1 matte wax.
 */

export interface CupSetMaterial {
  opacity: number;
  gloss: number;
  grain: number;
  bloom: number;
  meniscusAmp: number;
  specular: number;
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

/**
 * @param set01 0–1 set progress
 * @param melt01 optional live melt (heat) that reopens gloss after set
 */
export function cupSetMaterial(set01: number, melt01 = 0): CupSetMaterial {
  const s = clamp01(set01);
  const melt = clamp01(melt01);
  const lock = Math.max(0, s - melt * 0.75);

  return {
    opacity: 0.52 + lock * 0.42,
    gloss: 0.55 * (1 - lock) + 0.06 * lock + melt * 0.28,
    grain: lock * 0.48,
    bloom: lock * 0.42,
    meniscusAmp: 1.8 * (1 - lock) + 0.22 * lock,
    specular: 0.42 * (1 - lock) + 0.05 * lock,
  };
}
