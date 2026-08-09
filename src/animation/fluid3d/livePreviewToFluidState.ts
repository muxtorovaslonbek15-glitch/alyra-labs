import type {
  DeskVessel,
  EngineEffect,
  EngineEffectKind,
  LiveVesselPreview,
  VesselFx,
} from "@/types";
import type { FxIntensities } from "../fxIntensity";
import { computeFxIntensities } from "../fxIntensity";
import type {
  FluidImpulse,
  FluidImpulseKind,
  FluidLayer,
  FluidState,
} from "./types";

const IMPULSE_KINDS = new Set<EngineEffectKind>([
  "blast",
  "flash",
  "burst",
  "boil",
]);

const IMPULSE_DURATION: Record<FluidImpulseKind, number> = {
  blast: 700,
  flash: 450,
  pour: 900,
  stir: 600,
  shake: 700,
  burst: 550,
};

function intensityStrength(
  intensity?: EngineEffect["intensity"],
): number {
  switch (intensity) {
    case "high":
      return 1;
    case "medium":
      return 0.65;
    case "low":
      return 0.35;
    case "exo":
      return 0.85;
    case "endo":
      return 0.4;
    default:
      return 0.55;
  }
}

function effectActive(
  effects: EngineEffect[] | undefined,
  kind: EngineEffectKind,
): EngineEffect | undefined {
  return effects?.find((e) => e.kind === kind);
}

function buildLayers(
  layerColors: string[] | undefined,
  fillColor: string,
): FluidLayer[] {
  const colors = (layerColors ?? []).filter(
    (c) => c && c !== "transparent",
  );
  if (colors.length < 2) {
    return [
      {
        color: fillColor === "transparent" ? "#8fc0b5" : fillColor,
        fraction: 1,
      },
    ];
  }
  const fraction = 1 / colors.length;
  return colors.map((color) => ({ color, fraction }));
}

function fxImpulse(
  kind: FluidImpulseKind,
  at: number | undefined,
  strength: number,
): FluidImpulse | null {
  if (!at) return null;
  return {
    kind,
    strength,
    at,
    durationMs: IMPULSE_DURATION[kind],
  };
}

function impulsesFromFx(fx: VesselFx | undefined): FluidImpulse[] {
  if (!fx) return [];
  const out: FluidImpulse[] = [];
  const pour = fxImpulse("pour", fx.pourAt ?? fx.transferAt, 0.85);
  if (pour) out.push(pour);
  const stir = fxImpulse("stir", fx.stirAt, 0.45);
  if (stir) out.push(stir);
  const shake = fxImpulse("shake", fx.shakeAt, 0.75);
  if (shake) out.push(shake);
  return out;
}

function impulsesFromEffects(
  effects: EngineEffect[] | undefined,
  mixAt: number | undefined,
): FluidImpulse[] {
  if (!effects?.length) return [];
  const at = mixAt ?? Date.now();
  const out: FluidImpulse[] = [];
  for (const e of effects) {
    if (!IMPULSE_KINDS.has(e.kind)) continue;
    if (e.kind === "boil") continue; // sustained, not a burst
    const kind = e.kind as FluidImpulseKind;
    out.push({
      kind,
      strength: intensityStrength(e.intensity),
      at,
      durationMs: IMPULSE_DURATION[kind] ?? 500,
    });
  }
  return out;
}

export type FluidVesselInput = Pick<
  DeskVessel,
  "fx" | "stirLevel" | "lastResult"
> & {
  heatAttached?: boolean;
  coolAttached?: boolean;
  /** Optional resolved fill when preview is partial */
  fillColorOverride?: string;
  fillPctOverride?: number;
  boiling?: boolean;
  /** Shared FX intensities (preferred); computed from fx+now when omitted */
  intensities?: FxIntensities;
  now?: number;
  simTemperature?: number;
  simFrost?: number;
  simViscosity?: number;
  stirActive?: boolean;
  shakeActive?: boolean;
  mixActive?: boolean;
  agitation?: number;
  meltFraction?: number;
  mixBlend?: number;
};

/**
 * Map live preview + vessel FX into FluidState for the WebGL vessel.
 */
export function livePreviewToFluidState(
  preview: LiveVesselPreview | null | undefined,
  vessel: FluidVesselInput,
): FluidState {
  const effects = [
    ...(preview?.effects ?? []),
    ...(vessel.lastResult?.effects ?? []),
  ];
  const fillColor =
    vessel.fillColorOverride ??
    preview?.fillColor ??
    vessel.lastResult?.effects.find((e) => e.kind === "color")?.value ??
    "#8fc0b5";

  const fill =
    vessel.fillPctOverride ??
    preview?.fillPct ??
    (preview ? 0 : 0);

  const turbid =
    effectActive(effects, "turbid") || effectActive(effects, "dirty");
  const foamFx = effectActive(effects, "foam");
  const boilFx =
    Boolean(vessel.boiling) || Boolean(effectActive(effects, "boil"));
  const bubbleFx = Boolean(effectActive(effects, "bubble"));
  const meltFx = effectActive(effects, "melt");
  const solidFx = effectActive(effects, "solidify");
  const heatFx = effectActive(effects, "heat");

  const now = vessel.now ?? Date.now();
  const intensities =
    vessel.intensities ??
    computeFxIntensities({
      fx: vessel.fx,
      effects,
      now,
      heatAttached: Boolean(vessel.heatAttached),
      coolAttached: Boolean(vessel.coolAttached),
      boiling: boilFx,
      simTemperature: vessel.simTemperature,
      simFrost: vessel.simFrost,
      simViscosity: vessel.simViscosity,
      stirActive: vessel.stirActive,
      shakeActive: vessel.shakeActive,
      mixActive: vessel.mixActive,
      agitation: vessel.agitation,
      meltFraction: vessel.meltFraction,
    });

  // Ease viscosity / freeze from shared solidify / melt intensities + live sim
  const solidAmt = Math.max(
    intensities.solidify,
    solidFx ? intensityStrength(solidFx.intensity) : 0,
    vessel.simFrost ?? 0,
  );
  const meltAmt = Math.max(
    intensities.melt,
    meltFx ? intensityStrength(meltFx.intensity) : 0,
    vessel.meltFraction ?? 0,
  );
  const freeze = Math.max(0, solidAmt - meltAmt * 0.9);
  const viscosityBase =
    typeof vessel.simViscosity === "number"
      ? vessel.simViscosity
      : freeze > 0.05
        ? 0.45 + freeze * 0.5
        : meltAmt > 0.05
          ? Math.max(0.05, 0.32 - meltAmt * 0.22)
          : 0.18;

  const temperature = Math.min(
    1,
    Math.max(
      0,
      typeof vessel.simTemperature === "number"
        ? vessel.simTemperature
        : (vessel.heatAttached ? 0.55 : 0) +
            (heatFx ? intensityStrength(heatFx.intensity) * 0.45 : 0) +
            (boilFx || intensities.boil > 0.3 ? 0.35 : 0) +
            intensities.heat * 0.2 -
            (vessel.coolAttached ? 0.45 : 0) -
            intensities.cool * 0.15,
    ),
  );

  const impulses = [
    ...impulsesFromFx(vessel.fx),
    ...impulsesFromEffects(effects, vessel.fx?.mixAt ?? vessel.fx?.heatFlashAt),
  ];

  // Align pour impulse to stream phase when transferring
  if (intensities.pourPhase === "stream" && vessel.fx?.transferAt) {
    const existing = impulses.find((i) => i.kind === "pour");
    if (existing) {
      existing.strength = Math.max(existing.strength, 0.95);
      existing.at = vessel.fx.transferAt + 620;
    }
  }

  const overflowFx = effectActive(effects, "overflow");
  const fillClamped = Math.max(0, Math.min(112, fill));
  // Desk overfill (fillPct > ~95) should spill even without an engine effect
  const overfillAmt =
    fillClamped > 95 ? Math.min(1, (fillClamped - 95) / 17) : 0;
  const foamFromOverflow = Math.max(
    overflowFx
      ? Math.max(0.55, intensityStrength(overflowFx.intensity) * 0.85)
      : 0,
    overfillAmt * 0.85,
  );
  const overflow = Math.max(
    overflowFx ? intensityStrength(overflowFx.intensity) : 0,
    overfillAmt,
  );

  // Continuous swirl from live stir + mix / shake envelope
  const agitation = Math.min(
    1,
    Math.max(
      intensities.mix,
      vessel.stirActive ? 0.7 : 0,
      Math.min(1, (vessel.stirLevel ?? 0) / 3) * 0.55,
      vessel.mixBlend ?? 0,
      vessel.fx?.shakeAt && intensities.mix > 0.05 ? intensities.mix : 0,
    ),
  );

  return {
    // Allow slight over-lip fill so spill / foam band reads at the rim
    fill: fillClamped,
    layers: buildLayers(preview?.layerColors, fillColor),
    viscosity: Math.max(0, Math.min(1, viscosityBase)),
    turbidity: turbid ? intensityStrength(turbid.intensity) : 0,
    foam: Math.max(
      foamFx ? intensityStrength(foamFx.intensity) : 0,
      foamFromOverflow,
    ),
    temperature,
    impulses,
    fillColor: fillColor === "transparent" ? "#8fc0b5" : fillColor,
    boil: boilFx || intensities.boil > 0.35,
    // Reaction gas independent of boil — still emit when bubble/gas effects fire
    bubble:
      bubbleFx ||
      Boolean(effectActive(effects, "gas")) ||
      boilFx ||
      intensities.boil > 0.35 ||
      agitation > 0.55,
    melt: meltAmt,
    solidify: freeze,
    agitation,
    overflow,
  };
}
