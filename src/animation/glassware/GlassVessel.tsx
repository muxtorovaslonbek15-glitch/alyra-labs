"use client";

import { useId, useRef, useState } from "react";
import { resolveGlassShape } from "./shapes";
import {
  LiquidSurface,
  type LiquidMotion,
} from "../LiquidSurface";
import { VesselEffects } from "../VesselEffects";
import { VesselPourStream } from "../PourStream";
import { computeFxIntensities } from "../fxIntensity";
import { useFxClock, usePrefersReducedMotion } from "../useFxClock";
import {
  FluidVesselCanvas,
  livePreviewToFluidState,
} from "../fluid3d";
import type {
  EngineResult,
  LiveVesselPreview,
  VesselFx,
  VesselSim,
} from "@/types";

interface Props {
  equipmentId: string;
  fillPct: number;
  fillColor: string;
  motion: LiquidMotion;
  result?: EngineResult;
  fx?: VesselFx;
  /** Live preview for fluid layers / effects (optional) */
  livePreview?: LiveVesselPreview;
  layerColors?: string[];
  stirLevel?: number;
  heatAttached?: boolean;
  coolAttached?: boolean;
  /** Live heat/cool/stir sim (optional). */
  sim?: VesselSim;
  className?: string;
  pouringCue?: boolean;
  /** Small glass tip only — card owns the pour pose. */
  tiltDeg?: number;
  /** Force SVG LiquidSurface instead of WebGL */
  force2d?: boolean;
  onGlassClick?: (e: React.MouseEvent) => void;
}

export function GlassVessel({
  equipmentId,
  fillPct,
  fillColor,
  motion,
  result,
  fx,
  livePreview,
  layerColors,
  stirLevel = 0,
  heatAttached,
  coolAttached,
  sim,
  className = "",
  pouringCue,
  tiltDeg = 0,
  force2d = false,
  onGlassClick,
}: Props) {
  const geo = resolveGlassShape(equipmentId);
  const uid = useId().replace(/:/g, "");
  const clipId = `well-${uid}`;
  const glassGrad = `glass-${uid}`;
  const shineGrad = `shine-${uid}`;
  const simAlive =
    Boolean(heatAttached) ||
    Boolean(coolAttached) ||
    Boolean(sim?.stirActive) ||
    Boolean(sim?.shakeActive) ||
    Boolean(sim?.mixActive) ||
    (sim?.agitation ?? 0) > 0.02;
  const now = useFxClock(
    [
      fx?.pourAt,
      fx?.transferAt,
      fx?.mixAt,
      fx?.heatFlashAt,
      fx?.coolFlashAt,
      fx?.stirAt,
      fx?.shakeAt,
    ],
    2200,
    simAlive,
  );
  const prefersReduced = usePrefersReducedMotion();
  const [webglFailed, setWebglFailed] = useState(false);
  const onFluidUnavailable = useRef(() => setWebglFailed(true)).current;

  const effects = [
    ...(result?.effects ?? []),
    ...(livePreview?.effects ?? []),
  ];
  const intensities = computeFxIntensities({
    fx,
    effects,
    now,
    heatAttached: Boolean(heatAttached),
    coolAttached: Boolean(coolAttached),
    boiling: motion.boiling,
    simTemperature: sim?.temperature,
    simFrost: sim?.frost,
    simViscosity: sim?.viscosity,
    stirActive: sim?.stirActive,
    shakeActive: sim?.shakeActive,
    mixActive: sim?.mixActive,
    agitation: sim?.agitation,
    meltFraction: sim?.meltFraction,
  });

  const isTransferTarget =
    fx?.transferRole === "target" && intensities.pourPhase !== "idle";
  const isTransferSource =
    fx?.transferRole === "source" && intensities.pourPhase !== "idle";

  // Stream only during stream phase (pose machine)
  const streaming = intensities.pourPhase === "stream";
  const showPourStream =
    streaming &&
    (isTransferTarget || Boolean(fx?.pourAt && !fx?.transferRole)) &&
    (fx?.pourColor || fillColor !== "transparent");

  // Source drain: animate display fill from stamped sourceFillPct
  const displayFillPct = isTransferSource
    ? (fx?.sourceFillPct ?? Math.max(fillPct, 48)) * intensities.sourceFillFactor
    : fillPct;

  const useFluid3d =
    !force2d && !prefersReduced && !webglFailed && displayFillPct > 0.5;

  const preview: LiveVesselPreview =
    livePreview != null
      ? {
          ...livePreview,
          fillColor: livePreview.fillColor ?? fillColor,
          fillPct: livePreview.fillPct ?? displayFillPct,
          layerColors: layerColors ?? livePreview.layerColors,
        }
      : {
          fillColor,
          fillPct: displayFillPct,
          layerColors,
          ethanolPct: 0,
          oilLoadPct: 0,
          hazards: [],
          notes: [],
          effects: result?.effects ?? [],
        };

  const fluidState = livePreviewToFluidState(preview, {
    fx: fx ?? {},
    heatAttached: Boolean(heatAttached),
    coolAttached: Boolean(coolAttached),
    stirLevel,
    lastResult: result,
    fillColorOverride: fillColor,
    fillPctOverride: displayFillPct,
    boiling: motion.boiling || (Boolean(heatAttached) && (sim?.temperature ?? 0) >= 0.72),
    intensities,
    now,
    simTemperature: sim?.temperature,
    simFrost: sim?.frost,
    simViscosity: sim?.viscosity,
    stirActive: sim?.stirActive,
    shakeActive: sim?.shakeActive,
    mixActive: sim?.mixActive,
    agitation: sim?.agitation,
    meltFraction: sim?.meltFraction,
    mixBlend: sim?.mixBlend,
  });

  const liquidMotion: LiquidMotion = {
    ...motion,
    pourIntensity: Math.max(
      motion.pourIntensity,
      intensities.pour,
      intensities.splash,
    ),
    transferringOut: Boolean(isTransferSource),
    boilIntensity: intensities.boil,
    solidify: intensities.solidify,
    melt: intensities.melt,
  };

  const wb = geo.wellBounds;
  const wellStyle = {
    left: `${wb.x}%`,
    top: `${(wb.y / 140) * 100}%`,
    width: `${wb.width}%`,
    height: `${(wb.height / 140) * 100}%`,
    borderRadius: wellRadius(equipmentId),
  } as const;

  // Glass tip only — keep small so card pour pose isn't doubled
  const tipDeg = isTransferSource
    ? Math.min(Math.abs(tiltDeg || 8), 10) * -1
    : tiltDeg;

  const tiltStyle = {
    transform: tipDeg ? `rotate(${tipDeg}deg)` : undefined,
    transformOrigin: "70% 82%",
    transition: tipDeg
      ? "transform 0.45s cubic-bezier(0.22, 0.8, 0.28, 1)"
      : "transform 0.35s ease-out",
  } as const;

  return (
    <div
      className={`relative aspect-[100/140] w-full select-none ${className}`}
      onClick={onGlassClick}
      title="Click liquid to stir"
    >
      <div className="absolute inset-0" style={tiltStyle}>
        {/* 1. Glass body + shadow (under liquid) */}
        <svg
          viewBox="0 0 100 140"
          className="absolute inset-0 h-full w-full overflow-visible"
          aria-hidden
        >
          <defs>
            <linearGradient id={glassGrad} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
              <stop offset="45%" stopColor="rgba(200,230,220,0.18)" />
              <stop offset="100%" stopColor="rgba(143,192,181,0.28)" />
            </linearGradient>
          </defs>
          <ellipse
            cx="50"
            cy="132"
            rx="28"
            ry="4"
            fill="rgba(20,36,31,0.18)"
          />
          <path d={geo.outline} fill={`url(#${glassGrad})`} />
        </svg>

        {/* 2. WebGL liquid in well (between body and rim) */}
        {useFluid3d ? (
          <div
            className="pointer-events-none absolute z-[1] overflow-hidden"
            style={wellStyle}
          >
            <FluidVesselCanvas
              state={fluidState}
              onUnavailable={onFluidUnavailable}
            />
          </div>
        ) : null}

        {/* 3. 2D liquid + glass rim / shine / pour (above liquid) */}
        <svg
          viewBox="0 0 100 140"
          className="absolute inset-0 z-[2] h-full w-full overflow-visible"
          aria-hidden
        >
          <defs>
            <linearGradient id={shineGrad} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
              <stop offset="40%" stopColor="rgba(255,255,255,0.05)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
            <clipPath id={clipId}>
              <path d={geo.well} />
            </clipPath>
          </defs>

          {!useFluid3d ? (
            <LiquidSurface
              geometry={geo}
              fillPct={displayFillPct}
              fillColor={fillColor}
              motion={liquidMotion}
              clipId={clipId}
              reducedMotion={prefersReduced}
            />
          ) : null}

          <path
            d={geo.well}
            fill={`url(#${shineGrad})`}
            opacity={0.55}
            style={{ mixBlendMode: "soft-light" }}
          />

          <path
            d={geo.outline}
            fill="none"
            stroke="rgba(255,255,255,0.75)"
            strokeWidth={1.6}
            strokeLinejoin="round"
          />
          <path
            d={geo.outline}
            fill="none"
            stroke="rgba(26,107,92,0.35)"
            strokeWidth={0.7}
            strokeLinejoin="round"
          />

          <path
            d={geo.rim}
            fill="none"
            stroke="rgba(255,255,255,0.9)"
            strokeWidth={2.2}
            strokeLinecap="round"
          />

          {geo.ticks ? (
            <path
              d={geo.ticks}
              fill="none"
              stroke="rgba(20,36,31,0.28)"
              strokeWidth={0.8}
              strokeLinecap="round"
            />
          ) : null}

          <path
            d={leftEdgeHighlight(equipmentId)}
            fill="none"
            stroke="rgba(255,255,255,0.55)"
            strokeWidth={1.4}
            strokeLinecap="round"
            opacity={0.7}
          />

          {showPourStream ? (
            <VesselPourStream
              lip={geo.lip}
              mouthY={geo.mouth.y}
              color={fx?.pourColor ?? fillColor}
              activeKey={fx?.pourAt ?? fx?.transferAt ?? 0}
              fillPct={displayFillPct}
              streaming={streaming}
              layerColors={layerColors}
            />
          ) : null}
        </svg>
      </div>

      {/* CSS FX overlay — beside / on top of 3D liquid */}
      <div className="pointer-events-none absolute inset-[6%_8%_8%_8%] z-[3] overflow-visible">
        <VesselEffects
          result={result}
          fx={fx}
          stirLevel={stirLevel}
          heatAttached={heatAttached}
          coolAttached={coolAttached}
          fillColor={fillColor === "transparent" ? undefined : fillColor}
          boiling={motion.boiling}
          equipmentId={equipmentId}
          fluid3dActive={useFluid3d}
        />
      </div>

      {pouringCue ? (
        <div className="pointer-events-none absolute inset-0 z-[4] flex items-center justify-center">
          <span className="equation-pop rounded-full bg-lab-teal px-2.5 py-1 text-[10px] font-semibold text-white shadow-lg">
            Pour in
          </span>
        </div>
      ) : null}
    </div>
  );
}

function wellRadius(equipmentId: string): string {
  switch (equipmentId) {
    case "test-tube":
      return "0 0 50% 50%";
    case "flask":
      return "0 0 28% 28%";
    case "graduated-cylinder":
      return "0 0 40% 40%";
    default:
      return "0 0 12% 12%";
  }
}

function leftEdgeHighlight(equipmentId: string) {
  switch (equipmentId) {
    case "flask":
      return "M44 30 L30 110";
    case "test-tube":
      return "M42 20 L42 100";
    case "graduated-cylinder":
      return "M40 22 L40 110";
    default:
      return "M28 34 L28 112";
  }
}

export { resolveGlassShape } from "./shapes";
