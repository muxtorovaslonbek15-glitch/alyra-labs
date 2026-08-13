/**
 * Transparent metal-rimmed casting-cup geometry in the shared 0 0 100 140 viewBox.
 * Silhouette stays cup/tin-adjacent; champagne-glass read is material, not path.
 */

export const CUP_WELL = {
  x: 28,
  y: 44,
  width: 44,
  height: 76,
} as const;

export const CUP_MOUTH = { x: 50, y: 40 };
/** Tin lip in the overlaid card (tin recedes left while cup is hero). */
export const TIN_POUR_FROM = { x: 24, y: 58 };

export const CUP_OUTLINE =
  "M26 40 L30 118 Q30 126 38 126 L62 126 Q70 126 70 118 L74 40 Q74 34 68 34 L32 34 Q26 34 26 40 Z";

export const CUP_WELL_PATH =
  "M30 42 L33 116 Q33 122 39 122 L61 122 Q67 122 67 116 L70 42 Z";

export const CUP_RIM = "M26 40 Q50 36 74 40";

export interface CupFillOpts {
  meniscusAmp: number;
  set01: number;
  /** Extra surface wobble (pour/settle only). */
  wave?: number;
}

/**
 * Clipped balm body. Molten: concave meniscus (wets glass).
 * Set: slight convex dome like a wax puck.
 */
export function cupFillPath(
  well: { x: number; y: number; width: number; height: number },
  fill01: number,
  opts: CupFillOpts,
): string {
  const fill = Math.max(0, Math.min(1, fill01));
  if (fill <= 0.001) return "";
  const { meniscusAmp, set01, wave = 0 } = opts;
  const lock = Math.max(0, Math.min(1, set01));
  const topY = well.y + well.height * (1 - fill);
  const dip = meniscusAmp * (1 - lock) - lock * 1.55 + wave;
  const x0 = well.x;
  const x1 = well.x + well.width;
  const yb = well.y + well.height;
  const mid = well.x + well.width / 2;
  const edgeY = topY + 0.35 * Math.abs(dip);
  return `M${x0.toFixed(2)} ${edgeY.toFixed(2)} Q${mid.toFixed(2)} ${(topY + dip).toFixed(2)} ${x1.toFixed(2)} ${edgeY.toFixed(2)} L${x1.toFixed(2)} ${yb} L${x0.toFixed(2)} ${yb} Z`;
}

export function cupMeniscusStroke(
  well: { x: number; y: number; width: number; height: number },
  fill01: number,
  opts: CupFillOpts,
): string {
  const fill = Math.max(0, Math.min(1, fill01));
  if (fill <= 0.02) return "";
  const { meniscusAmp, set01, wave = 0 } = opts;
  const lock = Math.max(0, Math.min(1, set01));
  const topY = well.y + well.height * (1 - fill);
  const dip = meniscusAmp * (1 - lock) - lock * 1.55 + wave;
  const x0 = well.x + 1;
  const x1 = well.x + well.width - 1;
  const mid = well.x + well.width / 2;
  const edgeY = topY + 0.35 * Math.abs(dip);
  return `M${x0.toFixed(2)} ${edgeY.toFixed(2)} Q${mid.toFixed(2)} ${(topY + dip).toFixed(2)} ${x1.toFixed(2)} ${edgeY.toFixed(2)}`;
}
