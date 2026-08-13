"use client";

import { useId, useRef, useState } from "react";
import { pathToUnitBox, resolveGlassShape } from "./shapes";
import {
  LiquidSurface,
  type LiquidMotion,
} from "../LiquidSurface";
import { VesselEffects } from "../VesselEffects";
import { VesselPourStream } from "../PourStream";
import {
  computeFxIntensities,
  transferDisplayFillPct,
} from "../fxIntensity";
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

/** Champagne glass — DESIGN.md `--lab-glass`. Walls must read on ebony. */
const GLASS = {
  hi: "rgba(247,245,241,0.72)",
  mid: "rgba(196,180,154,0.42)",
  lo: "rgba(90,78,62,0.5)",
  rim: "rgba(247,245,241,0.92)",
  edge: "rgba(196,180,154,0.65)",
  inner: "rgba(12,12,12,0.28)",
} as const;

/** Tin-adjacent cup: brushed champagne metal, still see-through well. */
const METAL = {
  hi: "rgba(232,217,192,0.62)",
  mid: "rgba(90,78,62,0.48)",
  lo: "rgba(42,34,28,0.58)",
  rim: "rgba(232,217,192,0.88)",
  edge: "rgba(90,78,62,0.82)",
  inner: "rgba(12,12,12,0.18)",
} as const;

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
  const clipObbId = `well-obb-${uid}`;
  const glassGrad = `glass-${uid}`;
  const wallGrad = `wall-${uid}`;
  const shineGrad = `shine-${uid}`;
  const rimGrad = `rim-${uid}`;
  const isCup = geo.id === "cup";
  const shell = isCup ? METAL : GLASS;
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

  const streaming =
    intensities.pourPhase === "stream" || intensities.pourPhase === "settle";
  const isInventoryPour = Boolean(fx?.pourAt && !fx?.transferRole);
  const showPourStream =
    streaming &&
    (isTransferTarget || isInventoryPour) &&
    (fx?.pourColor || fillColor !== "transparent");

  const displayFillPct = transferDisplayFillPct({
    role: isTransferSource
      ? "source"
      : isTransferTarget
        ? "target"
        : undefined,
    phase: intensities.pourPhase,
    elapsed: intensities.pourElapsed,
    storeFillPct: fillPct,
    sourceFillPct: fx?.sourceFillPct,
    targetFillPct: fx?.targetFillPct,
  });

  const useFluid3d =
    !force2d && !prefersReduced && !webglFailed && displayFillPct > 0.5;

  const preview: LiveVesselPreview =
    livePreview != null
      ? {
          ...livePreview,
          fillColor: livePreview.fillColor ?? fillColor,
          fillPct: isTransferSource || isTransferTarget
            ? displayFillPct
            : (livePreview.fillPct ?? displayFillPct),
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
    borderRadius: wellRadius(geo.id),
  } as const;

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

  const wallPath = `${geo.outline} ${geo.well}`;
  const wellMask = `url("data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140"><path fill="white" d="${geo.well}"/></svg>`,
  )}")`;
  const wellClipCss = `url(#${clipObbId})`;

  return (
    <div
      className={`relative aspect-[100/140] w-full select-none ${className}`}
      onClick={onGlassClick}
      title="Click liquid to stir"
    >
      <div className="absolute inset-0" style={tiltStyle}>
        {/* 1. Glass body + shadow (under liquid). Evenodd punches the well. */}
        <svg
          viewBox="0 0 100 140"
          className="absolute inset-0 h-full w-full overflow-visible"
          aria-hidden
        >
          <defs>
            <linearGradient id={glassGrad} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={shell.hi} />
              <stop offset="42%" stopColor={shell.mid} />
              <stop offset="100%" stopColor={shell.lo} />
            </linearGradient>
            <linearGradient id={wallGrad} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(255,255,255,0.42)" />
              <stop offset="22%" stopColor="rgba(196,180,154,0.12)" />
              <stop offset="55%" stopColor="rgba(196,180,154,0.06)" />
              <stop offset="88%" stopColor="rgba(42,34,28,0.12)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.18)" />
            </linearGradient>
            <clipPath id={clipObbId} clipPathUnits="objectBoundingBox">
              <path d={pathToUnitBox(geo.well)} />
            </clipPath>
          </defs>
          <ellipse
            cx="50"
            cy="132"
            rx={geo.foot?.rx ?? 22}
            ry="4"
            fill="rgba(12,12,12,0.28)"
          />
          <path
            d={wallPath}
            fill={`url(#${glassGrad})`}
            fillRule="evenodd"
            opacity={isCup ? 0.78 : 1}
          />
          <path
            d={wallPath}
            fill={`url(#${wallGrad})`}
            fillRule="evenodd"
            opacity={0.9}
            style={{ mixBlendMode: "soft-light" }}
          />
          {/* Empty well is a darker cavity so wall thickness reads */}
          <path
            d={geo.well}
            fill={isCup ? "rgba(12,12,12,0.08)" : "rgba(12,12,12,0.22)"}
          />
        </svg>

        {/* 2. WebGL liquid clipped to the well silhouette (not the AABB) */}
        {useFluid3d ? (
          <div
            className="pointer-events-none absolute inset-0 z-[1]"
            style={{
              clipPath: wellClipCss,
              WebkitClipPath: wellClipCss,
              maskImage: wellMask,
              WebkitMaskImage: wellMask,
              maskSize: "100% 100%",
              WebkitMaskSize: "100% 100%",
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
            }}
          >
            <div
              className="pointer-events-none absolute overflow-hidden"
              style={wellStyle}
            >
              <FluidVesselCanvas
                state={fluidState}
                onUnavailable={onFluidUnavailable}
              />
            </div>
          </div>
        ) : null}

        {/* 3. 2D liquid + glass rim / refraction / pour (above liquid) */}
        <svg
          viewBox="0 0 100 140"
          className="absolute inset-0 z-[2] h-full w-full overflow-visible"
          aria-hidden
        >
          <defs>
            <linearGradient id={shineGrad} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.38)" />
              <stop offset="35%" stopColor="rgba(255,255,255,0.04)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
            <linearGradient id={rimGrad} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={isCup ? "rgba(90,78,62,0.9)" : "rgba(255,255,255,0.15)"} />
              <stop offset="35%" stopColor={isCup ? "rgba(232,217,192,0.92)" : "rgba(255,255,255,0.9)"} />
              <stop offset="70%" stopColor="rgba(196,180,154,0.45)" />
              <stop offset="100%" stopColor={isCup ? "rgba(42,34,28,0.85)" : "rgba(255,255,255,0.55)"} />
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

          {/* Inner well refraction — thickness reads at the meniscus edge */}
          <path
            d={geo.well}
            fill="none"
            stroke={shell.inner}
            strokeWidth={isCup ? 1.05 : 1.35}
            strokeLinejoin="round"
          />
          <path
            d={geo.well}
            fill={`url(#${shineGrad})`}
            opacity={isCup ? 0.28 : 0.4}
            style={{ mixBlendMode: "soft-light" }}
          />

          <path
            d={geo.outline}
            fill="none"
            stroke={shell.rim}
            strokeWidth={isCup ? 1.7 : 1.35}
            strokeLinejoin="round"
          />
          <path
            d={geo.outline}
            fill="none"
            stroke={shell.edge}
            strokeWidth={isCup ? 0.9 : 0.65}
            strokeLinejoin="round"
          />

          {/* Mouth lip — ellipse so the rim has optical thickness */}
          <ellipse
            cx={geo.mouth.x}
            cy={geo.mouth.y}
            rx={geo.mouthRx}
            ry={geo.mouthRy}
            fill="none"
            stroke={`url(#${rimGrad})`}
            strokeWidth={isCup ? 3.1 : 2.4}
          />
          <ellipse
            cx={geo.mouth.x}
            cy={geo.mouth.y + 0.4}
            rx={Math.max(4, geo.mouthRx - 2.4)}
            ry={Math.max(0.8, geo.mouthRy - 0.7)}
            fill={isCup ? "rgba(42,34,28,0.12)" : "rgba(255,255,255,0.14)"}
            stroke="rgba(196,180,154,0.4)"
            strokeWidth={0.7}
          />
          <path
            d={geo.rim}
            fill="none"
            stroke={isCup ? "rgba(232,217,192,0.55)" : "rgba(255,255,255,0.72)"}
            strokeWidth={isCup ? 1.35 : 1.1}
            strokeLinecap="round"
          />

          {geo.foot ? (
            <ellipse
              cx={geo.foot.cx}
              cy={geo.foot.cy}
              rx={geo.foot.rx}
              ry={geo.foot.ry}
              fill="none"
              stroke={isCup ? "rgba(90,78,62,0.7)" : "rgba(255,255,255,0.28)"}
              strokeWidth={isCup ? 1.5 : 0.9}
            />
          ) : null}

          {geo.ticks ? (
            <path
              d={geo.ticks}
              fill="none"
              stroke="rgba(12,12,12,0.22)"
              strokeWidth={0.7}
              strokeLinecap="round"
            />
          ) : null}

          <path
            d={geo.caustic}
            fill="none"
            stroke={isCup ? "rgba(232,217,192,0.42)" : "rgba(255,255,255,0.62)"}
            strokeWidth={isCup ? 1.25 : 1.45}
            strokeLinecap="round"
            opacity={0.75}
          />

          {showPourStream ? (
            <VesselPourStream
              lip={geo.lip}
              mouthY={geo.mouth.y}
              color={fx?.pourColor ?? fillColor}
              activeKey={fx?.pourAt ?? fx?.transferAt ?? 0}
              fillPct={displayFillPct}
              streaming={intensities.pourPhase === "stream"}
              layerColors={layerColors}
              viscosity={sim?.viscosity ?? 0.18}
              splash={intensities.splash}
              phase={intensities.pourPhase}
              origin={isTransferTarget ? "mouth" : "lip"}
              well={geo.wellBounds}
              impactOnly={isTransferTarget}
            />
          ) : null}
        </svg>
      </div>

      <div className="pointer-events-none absolute inset-[6%_8%_8%_8%] z-[3] overflow-visible">
        <VesselEffects
          result={result}
          fx={fx}
          stirLevel={stirLevel}
          heatAttached={heatAttached}
          coolAttached={coolAttached}
          fillColor={fillColor === "transparent" ? undefined : fillColor}
          boiling={
            motion.boiling ||
            (Boolean(heatAttached) && (sim?.temperature ?? 0) >= 0.68)
          }
          equipmentId={equipmentId}
          fluid3dActive={useFluid3d}
          simTemperature={sim?.temperature}
          simFrost={sim?.frost}
          simViscosity={sim?.viscosity}
          meltFraction={sim?.meltFraction}
          mixActive={sim?.mixActive}
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

function wellRadius(shapeId: string): string {
  switch (shapeId) {
    case "test-tube":
      return "0 0 50% 50%";
    case "flask":
      return "0 0 28% 28%";
    case "graduated-cylinder":
      return "0 0 40% 40%";
    case "cup":
      return "0 0 18% 18%";
    default:
      return "0 0 12% 12%";
  }
}

export { resolveGlassShape } from "./shapes";
