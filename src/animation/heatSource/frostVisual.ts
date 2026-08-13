/** Frost language tracks live sim — condensation first, ice only after SLUSH/ICE. */

export type FrostStage =
  | "none"
  | "condensation"
  | "rime"
  | "dendrite"
  | "ice";

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

/** Map chill + freeze intensities to a visual stage. Ice never on attach alone. */
export function frostStage(chill: number, ice: number): FrostStage {
  if (ice > 0.55) return "ice";
  if (ice > 0.2) return "dendrite";
  if (chill > 0.38) return "rime";
  if (chill > 0.08) return "condensation";
  return "none";
}

/** Bead count — fades as ice takes the surface. */
export function condensationCount(chill: number, ice: number, reduced: boolean) {
  if (reduced || chill < 0.08) return 0;
  return Math.round(2 + chill * 8 * (1 - ice * 0.55));
}

export function frostRimOpacity(chill: number, ice: number, reduced: boolean) {
  if (reduced) return clamp01(0.22 + chill * 0.38 + ice * 0.18);
  return clamp01(0.08 + chill * 0.4 + ice * 0.22);
}

/** Bottom ice film — 0 until freezeFromLiveSim actually moves. */
export function iceFilmOpacity(ice: number, reduced: boolean) {
  if (ice < 0.12) return 0;
  return reduced ? clamp01(0.42 + ice * 0.4) : clamp01(0.1 + ice * 0.7);
}

export function iceFilmHeightPct(ice: number) {
  if (ice < 0.12) return 0;
  return 6 + ice * 58;
}

export function dendriteOpacity(ice: number) {
  if (ice < 0.2) return 0;
  return clamp01((ice - 0.2) * 1.35);
}

/** Ice-bath tray: water stays liquid; frost blooms with live frost 0–1. */
export function trayFrost(frost: number) {
  const f = clamp01(frost);
  return {
    waterOpacity: 0.42 + (1 - f) * 0.22,
    slushOpacity: f * 0.55,
    rimFrost: clamp01(0.12 + f * 0.7),
    crystalOpacity: f < 0.22 ? 0 : clamp01((f - 0.22) * 1.2),
    haze: clamp01(0.08 + f * 0.45),
  };
}
