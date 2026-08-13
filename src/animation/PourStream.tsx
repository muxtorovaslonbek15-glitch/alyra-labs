"use client";

import { useId } from "react";
import { viscousPourParams } from "./cupSet/viscousPour";
import type { PourPhase } from "./fxIntensity";
import { POUR_TIMELINE } from "./fxIntensity";
import { usePrefersReducedMotion } from "./useFxClock";

export interface StreamPoint {
  x: number;
  y: number;
}

interface Props {
  from: StreamPoint;
  to: StreamPoint;
  color: string;
  /** Optional layered band colors leaving the source (immiscible pour). */
  layerColors?: string[];
  /** Restart key — typically pourAt / transferAt; remount via key from parent */
  activeKey: number | string;
  className?: string;
  /** When false, parent is outside stream phase — settle may still paint splash. */
  streaming?: boolean;
  /** 0–1; high = wax/oil column, low = watery ribbon. */
  viscosity?: number;
  /** Target splash gate from the pose machine (peaks on arrival, tails through settle). */
  splash?: number;
  /** Pose phase — keeps the ribbon through settle so splash can land. */
  phase?: PourPhase;
}

/**
 * Desk- or vessel-local SVG pour ribbon along a viscosity-aware quadratic.
 * Lifetime / phase is owned by the parent; this paints stream + settle impact.
 */
export function pourRibbonTiming(viscosity: number): {
  streamMs: number;
  settleMs: number;
  drawMs: number;
  fadeMs: number;
  fadeBeginMs: number;
} {
  const params = viscousPourParams(viscosity);
  const streamMs = POUR_TIMELINE.streamEnd - POUR_TIMELINE.holdEnd;
  const settleMs = POUR_TIMELINE.settleEnd - POUR_TIMELINE.streamEnd;
  return {
    streamMs,
    settleMs,
    drawMs: Math.min(params.durationMs, streamMs * 0.82),
    fadeMs: Math.max(180, settleMs),
    fadeBeginMs: streamMs,
  };
}

/** Desk- or vessel-local SVG pour ribbon along a viscosity-aware quadratic. */
export function PourStream({
  from,
  to,
  color,
  layerColors,
  activeKey,
  className = "",
  streaming = true,
  viscosity = 0.18,
  splash = 0,
  phase,
}: Props) {
  const reduced = usePrefersReducedMotion();
  const uid = useId().replace(/:/g, "");
  const livePhase: PourPhase =
    phase ?? (streaming ? "stream" : splash > 0.04 ? "settle" : "idle");
  const showRibbon = livePhase === "stream" || livePhase === "settle";
  const showSplash =
    (livePhase === "stream" || livePhase === "settle") && splash > 0.03;

  if (!showRibbon && !showSplash) return null;

  if (reduced) {
    return (
      <svg
        key={activeKey}
        className={`pointer-events-none absolute inset-0 h-full w-full overflow-visible ${className}`}
        aria-hidden
      >
        <ReducedPourCue from={from} to={to} color={color} />
      </svg>
    );
  }

  return (
    <svg
      key={activeKey}
      className={`pointer-events-none absolute inset-0 h-full w-full overflow-visible ${className}`}
      aria-hidden
    >
      <PourRibbon
        uid={uid}
        from={from}
        to={to}
        color={color}
        layerColors={layerColors}
        viscosity={viscosity}
        splash={splash}
        showRibbon={showRibbon}
        showSplash={showSplash}
      />
    </svg>
  );
}

/** Local pour stream inside a vessel (lip or mouth → liquid surface), viewBox 0 0 100 140 */
export function VesselPourStream({
  lip,
  mouthY,
  color,
  activeKey,
  fillPct,
  streaming = true,
  layerColors,
  viscosity = 0.18,
  splash = 0,
  phase,
  origin = "lip",
  well,
  /** Transfer target: splash / meniscus only — desk PourStream owns the aerial ribbon. */
  impactOnly = false,
}: {
  lip: { x: number; y: number };
  mouthY: number;
  color: string;
  activeKey: number | string;
  fillPct: number;
  streaming?: boolean;
  layerColors?: string[];
  viscosity?: number;
  splash?: number;
  phase?: PourPhase;
  origin?: "lip" | "mouth";
  well?: { y: number; height: number };
  impactOnly?: boolean;
}) {
  const reduced = usePrefersReducedMotion();
  const uid = useId().replace(/:/g, "");
  const livePhase: PourPhase =
    phase ?? (streaming ? "stream" : splash > 0.04 ? "settle" : "idle");
  const showRibbon =
    !impactOnly && (livePhase === "stream" || livePhase === "settle");
  const showSplash =
    (livePhase === "stream" || livePhase === "settle") && splash > 0.03;

  if (!showRibbon && !showSplash && !reduced) return null;
  if (!streaming && livePhase === "idle" && !showSplash) return null;

  const surfaceY = pourSurfaceLocalY(fillPct, well);
  const to = { x: 50, y: Math.max(mouthY + 6, surfaceY) };
  const from =
    origin === "mouth"
      ? { x: 50, y: mouthY + 1 }
      : { x: lip.x, y: lip.y };

  if (reduced) {
    return (
      <g key={activeKey} className="pointer-events-none">
        <ReducedPourCue from={from} to={to} color={color} compact />
      </g>
    );
  }

  return (
    <g key={activeKey} className="pointer-events-none">
      <PourRibbon
        uid={uid}
        from={from}
        to={to}
        color={color}
        layerColors={layerColors}
        viscosity={viscosity}
        splash={Math.max(splash, showRibbon ? 0.2 : splash)}
        showRibbon={showRibbon}
        showSplash={showSplash || (impactOnly && livePhase === "stream")}
        local
      />
    </g>
  );
}

/** SVG well-space Y of the free surface (y down). Marked-full ≈ 82%. */
export function pourSurfaceLocalY(
  fillPct: number,
  well: { y: number; height: number } = { y: 30, height: 92 },
): number {
  const pct = Math.min(82, Math.max(0, fillPct)) / 100;
  return well.y + well.height * (1 - pct);
}

function PourRibbon({
  uid,
  from,
  to,
  color,
  layerColors,
  viscosity,
  splash,
  showRibbon,
  showSplash,
  local = false,
}: {
  uid: string;
  from: StreamPoint;
  to: StreamPoint;
  color: string;
  layerColors?: string[];
  viscosity: number;
  splash: number;
  showRibbon: boolean;
  showSplash: boolean;
  local?: boolean;
}) {
  const params = viscousPourParams(viscosity);
  const ctrl = streamControl(from, to, viscosity);
  const d = `M${from.x} ${from.y} Q${ctrl.x} ${ctrl.y} ${to.x} ${to.y}`;
  const pathLen = Math.max(24, approxQuadLength(from, ctrl, to));
  const bands =
    layerColors && layerColors.length >= 2
      ? layerColors.slice(0, 3)
      : [color];

  const timing = pourRibbonTiming(viscosity);
  const drawMs = timing.drawMs;
  const fadeMs = timing.fadeMs;
  const fadeBegin = `${timing.fadeBeginMs}ms`;
  const scale = local ? 0.55 : 1;
  const bodyWidth = params.strokeWidth * scale;
  const coreWidth = Math.max(1.6, bodyWidth * 0.42);

  const blobCount = Math.max(0, params.dropletCount);
  const blobs = Array.from({ length: blobCount }).map((_, i) => {
    const t = (i + 1) / (blobCount + 1);
    const p = quadPoint(from, ctrl, to, t);
    const tan = quadTangent(from, ctrl, to, t);
    const deg = (Math.atan2(tan.y, tan.x) * 180) / Math.PI;
    return {
      ...p,
      i,
      deg,
      fill: bands[i % bands.length]!,
      rx: params.elongate ? 1.6 * scale : (2.4 + (i % 3) * 1.1) * scale,
      ry: params.elongate
        ? (6.5 + t * 3.5) * scale
        : (2.4 + (i % 3) * 1.1) * scale,
    };
  });

  return (
    <>
      <defs>
        <linearGradient id={`stream-${uid}`} x1="0" y1="0" x2="0" y2="1">
          {bands.length === 1 ? (
            <>
              <stop offset="0%" stopColor={color} stopOpacity={0.45} />
              <stop offset="40%" stopColor={color} stopOpacity={1} />
              <stop offset="100%" stopColor={color} stopOpacity={0.82} />
            </>
          ) : (
            bands.map((c, i) => (
              <stop
                key={i}
                offset={`${(i / (bands.length - 1)) * 100}%`}
                stopColor={c}
                stopOpacity={0.95}
              />
            ))
          )}
        </linearGradient>
        {params.glow ? (
          <filter
            id={`stream-glow-${uid}`}
            x="-30%"
            y="-30%"
            width="160%"
            height="160%"
          >
            <feGaussianBlur stdDeviation={local ? 0.9 : 1.15} result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        ) : null}
      </defs>

      {showRibbon
        ? bands.map((band, i) => {
            const n = bandNormal(from, ctrl, to, 0.45);
            const offset =
              bands.length === 1 ? 0 : (i - (bands.length - 1) / 2) * (2.2 * scale);
            const di =
              offset === 0
                ? d
                : offsetQuad(
                    from,
                    ctrl,
                    to,
                    n.x * offset,
                    n.y * offset,
                  );
            const isCore = i === 0;
            return (
              <path
                key={`band-${i}`}
                d={di}
                fill="none"
                stroke={
                  bands.length === 1 ? `url(#stream-${uid})` : band
                }
                strokeWidth={isCore ? bodyWidth : bodyWidth * 0.55}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={pathLen}
                strokeDashoffset={pathLen}
                opacity={0.94}
                filter={
                  isCore && params.glow ? `url(#stream-glow-${uid})` : undefined
                }
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from={pathLen}
                  to="0"
                  dur={`${drawMs}ms`}
                  fill="freeze"
                  calcMode="spline"
                  keySplines="0.22 0.8 0.28 1"
                  keyTimes="0;1"
                  begin={isCore ? "0s" : "0.04s"}
                />
                <animate
                  attributeName="opacity"
                  from="0.94"
                  to="0.08"
                  dur={`${fadeMs}ms`}
                  begin={fadeBegin}
                  fill="freeze"
                />
              </path>
            );
          })
        : null}

      {showRibbon ? (
        <path
          d={d}
          fill="none"
          stroke="rgba(255,255,255,0.38)"
          strokeWidth={coreWidth}
          strokeLinecap="round"
          strokeDasharray={pathLen}
          strokeDashoffset={pathLen}
          opacity={params.elongate ? 0.22 : 0.45}
        >
          <animate
            attributeName="stroke-dashoffset"
            from={pathLen}
            to="0"
            dur={`${drawMs}ms`}
            begin="0.03s"
            fill="freeze"
            calcMode="spline"
            keySplines="0.22 0.8 0.28 1"
            keyTimes="0;1"
          />
          <animate
            attributeName="opacity"
            from={params.elongate ? "0.22" : "0.45"}
            to="0.04"
            dur={`${fadeMs}ms`}
            begin={fadeBegin}
            fill="freeze"
          />
        </path>
      ) : null}

      {showRibbon
        ? blobs.map((blob) => (
            <ellipse
              key={`b-${blob.i}`}
              cx={blob.x}
              cy={blob.y}
              rx={blob.rx}
              ry={blob.ry}
              fill={blob.fill}
              transform={`rotate(${blob.deg} ${blob.x} ${blob.y})`}
              opacity={0}
            >
              <animate
                attributeName="opacity"
                values="0;0.95;0"
                dur={params.elongate ? "1.15s" : "0.85s"}
                begin={`${blob.i * (params.elongate ? 0.07 : 0.04)}s`}
                fill="freeze"
                calcMode="spline"
                keySplines="0.22 0.8 0.28 1;0.22 0.8 0.28 1"
                keyTimes="0;0.24;1"
              />
            </ellipse>
          ))
        : null}

      {/* Meniscus where the column meets the free surface — not a CSS bloom. */}
      {showRibbon || showSplash ? (
        <ellipse
          cx={to.x}
          cy={to.y}
          rx={(params.elongate ? 7 : 8 + splash * 6) * scale}
          ry={(params.elongate ? 2.2 : 3.2 + splash * 1.4) * scale}
          fill={color}
          opacity={
            params.elongate
              ? 0.22 + splash * 0.12
              : 0.28 + splash * 0.35 * params.bloom
          }
        />
      ) : null}

      {showSplash ? (
        <ImpactRings
          at={to}
          color={color}
          splash={splash}
          viscosity={viscosity}
          scale={scale}
          uid={uid}
        />
      ) : null}
    </>
  );
}

function ImpactRings({
  at,
  color,
  splash,
  viscosity,
  scale,
  uid,
}: {
  at: StreamPoint;
  color: string;
  splash: number;
  viscosity: number;
  scale: number;
  uid: string;
}) {
  const thick = viscosity >= 0.65;
  if (thick) {
    return (
      <ellipse
        cx={at.x}
        cy={at.y}
        rx={11 * scale}
        ry={3 * scale}
        fill={color}
        opacity={0.16 + splash * 0.12}
      />
    );
  }
  const count = splash > 0.45 ? 3 : 2;
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <ellipse
          key={`ring-${uid}-${i}`}
          cx={at.x}
          cy={at.y}
          fill="none"
          stroke={color}
          strokeWidth={Math.max(0.6, (1.35 - i * 0.28) * scale)}
          opacity={splash * (0.5 - i * 0.12)}
        >
          <animate
            attributeName="rx"
            from={String(5 * scale)}
            to={String((12 + i * 7) * scale)}
            dur="0.52s"
            begin={`${i * 0.07}s`}
            fill="freeze"
            calcMode="spline"
            keySplines="0.22 0.8 0.28 1"
            keyTimes="0;1"
          />
          <animate
            attributeName="ry"
            from={String(2.2 * scale)}
            to={String((4.5 + i * 2.2) * scale)}
            dur="0.52s"
            begin={`${i * 0.07}s`}
            fill="freeze"
            calcMode="spline"
            keySplines="0.22 0.8 0.28 1"
            keyTimes="0;1"
          />
          <animate
            attributeName="opacity"
            from={String(splash * (0.55 - i * 0.12))}
            to="0"
            dur="0.52s"
            begin={`${i * 0.07}s`}
            fill="freeze"
          />
        </ellipse>
      ))}
    </>
  );
}

function ReducedPourCue({
  from,
  to,
  color,
  compact = false,
}: {
  from: StreamPoint;
  to: StreamPoint;
  color: string;
  compact?: boolean;
}) {
  const mx = from.x + (to.x - from.x) * 0.42;
  const my = from.y + (to.y - from.y) * 0.42;
  return (
    <>
      <line
        x1={from.x}
        y1={from.y}
        x2={mx}
        y2={my}
        stroke={color}
        strokeWidth={compact ? 4 : 6}
        strokeLinecap="round"
        opacity={0.55}
      />
      <ellipse
        cx={to.x}
        cy={to.y}
        rx={compact ? 6 : 9}
        ry={compact ? 2.4 : 3.5}
        fill={color}
        opacity={0.4}
      />
    </>
  );
}

function streamControl(
  from: StreamPoint,
  to: StreamPoint,
  viscosity: number,
): StreamPoint {
  const v = clamp01(viscosity);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const arcLift = Math.abs(dx) * lerp(0.32, 0.05, v) + lerp(18, 2, v);
  return {
    x: from.x + dx * lerp(0.5, 0.3, v),
    y: Math.min(from.y, to.y) - arcLift + dy * lerp(0, 0.12, v),
  };
}

function offsetQuad(
  a: StreamPoint,
  c: StreamPoint,
  b: StreamPoint,
  ox: number,
  oy: number,
): string {
  return `M${a.x + ox} ${a.y + oy} Q${c.x + ox} ${c.y + oy} ${b.x + ox} ${b.y + oy}`;
}

function bandNormal(
  a: StreamPoint,
  c: StreamPoint,
  b: StreamPoint,
  t: number,
): StreamPoint {
  const tan = quadTangent(a, c, b, t);
  const len = Math.hypot(tan.x, tan.y) || 1;
  return { x: -tan.y / len, y: tan.x / len };
}

function quadPoint(
  a: StreamPoint,
  c: StreamPoint,
  b: StreamPoint,
  t: number,
): StreamPoint {
  const u = 1 - t;
  return {
    x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
  };
}

function quadTangent(
  a: StreamPoint,
  c: StreamPoint,
  b: StreamPoint,
  t: number,
): StreamPoint {
  const u = 1 - t;
  return {
    x: 2 * u * (c.x - a.x) + 2 * t * (b.x - c.x),
    y: 2 * u * (c.y - a.y) + 2 * t * (b.y - c.y),
  };
}

function approxQuadLength(
  a: StreamPoint,
  c: StreamPoint,
  b: StreamPoint,
  samples = 16,
): number {
  let len = 0;
  let prev = a;
  for (let i = 1; i <= samples; i++) {
    const p = quadPoint(a, c, b, i / samples);
    len += Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
  }
  return len;
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
