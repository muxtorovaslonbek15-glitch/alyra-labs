"use client";

import { useId } from "react";
import type { CupSetFrame } from "./timeline";
import { cupSetMaterial } from "./material";
import {
  CUP_OUTLINE,
  CUP_RIM,
  CUP_WELL,
  CUP_WELL_PATH,
  cupFillPath,
  cupMeniscusStroke,
} from "./cupGeometry";

function hexWithAlpha(hex: string, alpha: number) {
  if (!hex || hex === "transparent") return `rgba(196, 180, 154, ${alpha})`;
  const raw = hex.replace("#", "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw.slice(0, 6);
  if (full.length !== 6) return `rgba(196, 180, 154, ${alpha})`;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface Props {
  fillPct: number;
  fillColor: string;
  frame: CupSetFrame;
  elapsedMs?: number;
  meltFraction?: number;
  heatAttached?: boolean;
  pressEnabled?: boolean;
  onPress?: () => void;
}

/**
 * Metal-rimmed casting cup (DESIGN champagne metal, not purple chrome).
 * Walls stay see-through enough to watch fill/set; rim/foot read as brushed tin.
 */
export function SolidCupVessel({
  fillPct,
  fillColor,
  frame,
  elapsedMs = 0,
  meltFraction = 0,
  heatAttached,
  pressEnabled,
  onPress,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const tint =
    fillColor && fillColor !== "transparent" ? fillColor : "#c4a882";
  const fill01 = Math.max(0, Math.min(1, frame.fill01 * Math.min(1, fillPct / 100)));
  const mat = cupSetMaterial(frame.set01, meltFraction);
  const wave =
    frame.phase === "pour" || frame.phase === "settle"
      ? Math.sin(elapsedMs / 260) * mat.meniscusAmp * 0.35
      : 0;
  const fillOpts = {
    meniscusAmp: mat.meniscusAmp,
    set01: frame.set01,
    wave,
  };
  const body = cupFillPath(CUP_WELL, fill01, fillOpts);
  const meniscus = cupMeniscusStroke(CUP_WELL, fill01, fillOpts);
  const coolRim =
    frame.phase === "cool" || frame.phase === "set";
  const showPress =
    Boolean(pressEnabled) &&
    (frame.phase === "ready" || frame.phase === "set") &&
    fill01 > 0.4;
  const cx = CUP_WELL.x + CUP_WELL.width / 2;
  const by = CUP_WELL.y + CUP_WELL.height;

  return (
    <div
      className="relative aspect-[100/140] w-full select-none"
      title={showPress ? "Press to wear" : "Metal casting cup"}
    >
      <svg
        viewBox="0 0 100 140"
        className="absolute inset-0 h-full w-full overflow-visible"
        aria-hidden
      >
        <defs>
          <linearGradient id={`cup-metal-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(232,217,192,0.55)" />
            <stop offset="28%" stopColor="rgba(90,78,62,0.42)" />
            <stop offset="62%" stopColor="rgba(196,180,154,0.22)" />
            <stop offset="100%" stopColor="rgba(42,34,28,0.5)" />
          </linearGradient>
          <linearGradient id={`cup-rim-metal-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(90,78,62,0.95)" />
            <stop offset="35%" stopColor="rgba(232,217,192,0.92)" />
            <stop offset="70%" stopColor="rgba(196,180,154,0.7)" />
            <stop offset="100%" stopColor="rgba(42,34,28,0.88)" />
          </linearGradient>
          <linearGradient id={`cup-balm-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={hexWithAlpha(tint, 0.55 + frame.set01 * 0.35)} />
            <stop offset="55%" stopColor={hexWithAlpha(tint, 0.78 + frame.set01 * 0.16)} />
            <stop offset="100%" stopColor={hexWithAlpha(tint, 0.92)} />
          </linearGradient>
          <radialGradient id={`cup-bloom-${uid}`} cx="48%" cy="38%" r="62%">
            <stop offset="0%" stopColor="rgba(255,248,230,0.28)" />
            <stop offset="55%" stopColor="rgba(20,16,12,0.08)" />
            <stop offset="100%" stopColor="rgba(20,16,12,0.22)" />
          </radialGradient>
          <filter id={`cup-grain-${uid}`}>
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.85"
              numOctaves="2"
              seed="7"
              result="n"
            />
            <feColorMatrix
              in="n"
              type="saturate"
              values="0"
              result="g"
            />
            <feBlend in="SourceGraphic" in2="g" mode="multiply" />
          </filter>
          <clipPath id={`cup-well-${uid}`}>
            <path d={CUP_WELL_PATH} />
          </clipPath>
        </defs>

        <ellipse cx="50" cy="130" rx="26" ry="4.5" fill="rgba(20,16,12,0.28)" />

        {/* Brushed champagne-metal body — well punched so fill stays visible */}
        <path
          d={`${CUP_OUTLINE} ${CUP_WELL_PATH}`}
          fill={`url(#cup-metal-${uid})`}
          fillRule="evenodd"
          stroke="rgba(90,78,62,0.75)"
          strokeWidth={1.55}
        />
        <path d={CUP_WELL_PATH} fill="rgba(12,10,8,0.1)" />

        {body ? (
          <g clipPath={`url(#cup-well-${uid})`}>
            <g
              style={{
                transformOrigin: `${cx}px ${by}px`,
                transform: `scale(${frame.contraction})`,
              }}
            >
              <path
                d={body}
                fill={`url(#cup-balm-${uid})`}
                opacity={mat.opacity}
                filter={mat.grain > 0.2 ? `url(#cup-grain-${uid})` : undefined}
              />
              {mat.bloom > 0.08 ? (
                <path
                  d={body}
                  fill={`url(#cup-bloom-${uid})`}
                  opacity={mat.bloom}
                  style={{ mixBlendMode: "multiply" }}
                />
              ) : null}
              {mat.specular > 0.08 && fill01 > 0.15 ? (
                <ellipse
                  cx={42}
                  cy={CUP_WELL.y + CUP_WELL.height * (1 - fill01) + 8}
                  rx={9}
                  ry={4.5}
                  fill="rgba(255,248,230,0.55)"
                  opacity={mat.gloss * (heatAttached ? 1.1 : 1)}
                />
              ) : null}
              {meniscus ? (
                <path
                  d={meniscus}
                  fill="none"
                  stroke={
                    frame.set01 > 0.55
                      ? "rgba(20,16,12,0.22)"
                      : "rgba(255,255,255,0.45)"
                  }
                  strokeWidth={frame.set01 > 0.55 ? 1.1 : 1.35}
                  strokeLinecap="round"
                />
              ) : null}
            </g>
          </g>
        ) : null}

        {/* Brushed catchlight — metal, not glass caustic */}
        <path
          d="M32 46 L34.5 114"
          fill="none"
          stroke="rgba(232,217,192,0.38)"
          strokeWidth={1.35}
          strokeLinecap="round"
        />
        <path
          d="M68 48 L65.5 112"
          fill="none"
          stroke="rgba(42,34,28,0.28)"
          strokeWidth={0.9}
          strokeLinecap="round"
        />

        <ellipse
          cx="50"
          cy="40"
          rx="24"
          ry="4.2"
          fill="none"
          stroke={`url(#cup-rim-metal-${uid})`}
          strokeWidth={3.2}
        />
        <path
          d={CUP_RIM}
          fill="none"
          stroke="rgba(232,217,192,0.55)"
          strokeWidth={1.4}
          strokeLinecap="round"
        />
        <ellipse
          cx="50"
          cy="126"
          rx="17"
          ry="2.8"
          fill="none"
          stroke="rgba(90,78,62,0.7)"
          strokeWidth={1.6}
        />
        <path
          d={CUP_OUTLINE}
          fill="none"
          stroke="rgba(42,34,28,0.45)"
          strokeWidth={0.8}
        />

        {coolRim ? (
          <ellipse
            cx="50"
            cy="40"
            rx="24"
            ry="5"
            fill="none"
            stroke="rgba(125,211,252,0.28)"
            strokeWidth={1.1}
            opacity={frame.phase === "cool" ? 0.9 : 0.45}
          />
        ) : null}
      </svg>

      {showPress ? (
        <button
          type="button"
          className="absolute left-1/2 top-[58%] z-[4] flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/20 text-[9px] font-semibold uppercase tracking-label text-lab-foam/90 backdrop-blur-[1px] transition hover:bg-black/35 md:h-10 md:w-10"
          onClick={(e) => {
            e.stopPropagation();
            onPress?.();
          }}
          aria-label="Press to wear"
        >
          Press
        </button>
      ) : null}
    </div>
  );
}
