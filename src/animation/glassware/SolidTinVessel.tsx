"use client";

import { useEffect, useId, useState } from "react";
import { usePrefersReducedMotion } from "@/animation/useFxClock";

export type CastRevealPhase =
  | "idle"
  | "hold"
  | "cool"
  | "matte"
  | "snap"
  | "seat"
  | "ready";

interface Props {
  fillPct: number;
  fillColor: string;
  heatAttached?: boolean;
  coolAttached?: boolean;
  /** Live sim melt 0–1 (gradual melt/set; does not replace cast reveal). */
  meltFraction?: number;
  /** Timestamp when Cast / Mix fired — starts reveal storyboard */
  castRevealAt?: number;
  className?: string;
  onPress?: () => void;
  pressEnabled?: boolean;
}

/**
 * Shallow solid-perfume tin — champagne metal pan on the ebony desk.
 * Reveal: melt pool → cool → matte lock → snap → seat (≈1.8s).
 * Live Melt/Set uses meltFraction for gradual gloss without evaporating wax.
 */
export function SolidTinVessel({
  fillPct,
  fillColor,
  heatAttached,
  coolAttached,
  meltFraction = 0,
  castRevealAt,
  className = "",
  onPress,
  pressEnabled,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const reduced = usePrefersReducedMotion();
  const [phase, setPhase] = useState<CastRevealPhase>("idle");
  const [showPress, setShowPress] = useState(false);

  const hasFill = fillPct > 0.5;
  const tint =
    fillColor && fillColor !== "transparent" ? fillColor : "#c4a882";
  const melt01 = Math.max(0, Math.min(1, meltFraction));

  useEffect(() => {
    if (!castRevealAt || !hasFill) {
      setPhase(hasFill ? "ready" : "idle");
      setShowPress(Boolean(hasFill && pressEnabled));
      return;
    }

    if (reduced) {
      setPhase("ready");
      setShowPress(Boolean(pressEnabled));
      return;
    }

    setPhase("hold");
    setShowPress(false);
    const timers: number[] = [];
    timers.push(window.setTimeout(() => setPhase("cool"), 100));
    timers.push(window.setTimeout(() => setPhase("matte"), 450));
    timers.push(window.setTimeout(() => setPhase("snap"), 850));
    timers.push(window.setTimeout(() => setPhase("seat"), 1150));
    timers.push(
      window.setTimeout(() => {
        setPhase("ready");
        setShowPress(Boolean(pressEnabled));
      }, 1600),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [castRevealAt, hasFill, reduced, pressEnabled]);

  const meltGloss = Math.max(
    heatAttached || phase === "hold" || phase === "cool"
      ? phase === "cool"
        ? 0.35
        : 0.55
      : 0,
    melt01 > 0.08 ? (reduced ? melt01 * 0.45 : 0.2 + melt01 * 0.55) : 0,
  );
  const liveMeltOpen = heatAttached || melt01 >= 0.35;
  const matteLock =
    !liveMeltOpen &&
    (phase === "matte" ||
      phase === "snap" ||
      phase === "seat" ||
      phase === "ready" ||
      (hasFill && !castRevealAt && melt01 < 0.35));
  const snapScale =
    phase === "snap" ? 1.012 : phase === "seat" || phase === "ready" ? 1 : 1;
  const coolRim =
    coolAttached ||
    phase === "cool" ||
    phase === "matte" ||
    (melt01 < 0.25 && coolAttached);

  const puckOpacity = hasFill
    ? matteLock
      ? 0.94
      : 0.55 + Math.min(fillPct, 100) * 0.003
    : 0;
  const puckR = Math.min(1, 0.38 + fillPct / 140);

  return (
    <div
      className={`relative aspect-[100/140] w-full select-none ${className}`}
      title={pressEnabled ? "Press to wear" : "Solid perfume tin"}
    >
      <svg
        viewBox="0 0 100 140"
        className="absolute inset-0 h-full w-full overflow-visible"
        aria-hidden
      >
        <defs>
          <linearGradient id={`side-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a322a" />
            <stop offset="45%" stopColor="#1c1814" />
            <stop offset="100%" stopColor="#0c0a08" />
          </linearGradient>
          <radialGradient id={`lid-${uid}`} cx="42%" cy="32%" r="72%">
            <stop offset="0%" stopColor="#f7f5f1" />
            <stop offset="28%" stopColor="#e8d9c0" />
            <stop offset="62%" stopColor="#c4b49a" />
            <stop offset="100%" stopColor="#6e6250" />
          </radialGradient>
          <linearGradient id={`rim-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f7f5f1" />
            <stop offset="35%" stopColor="#e8d9c0" />
            <stop offset="70%" stopColor="#c4b49a" />
            <stop offset="100%" stopColor="#8a7a62" />
          </linearGradient>
          <radialGradient id={`floor-${uid}`} cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="#2a241e" />
            <stop offset="100%" stopColor="#0c0a08" />
          </radialGradient>
          <radialGradient id={`puck-${uid}`} cx="42%" cy="34%" r="68%">
            <stop
              offset="0%"
              stopColor={tint}
              stopOpacity={matteLock ? 0.96 : 0.78}
            />
            <stop offset="62%" stopColor={tint} stopOpacity={0.9} />
            <stop offset="100%" stopColor={tint} stopOpacity={0.72} />
          </radialGradient>
          <filter id={`brushed-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.85 0.12"
              numOctaves="2"
              seed="3"
              result="n"
            />
            <feColorMatrix
              in="n"
              type="matrix"
              values="0 0 0 0 0.77
                      0 0 0 0 0.70
                      0 0 0 0 0.58
                      0 0 0 0.16 0"
            />
          </filter>
          <filter id={`soft-${uid}`}>
            <feGaussianBlur stdDeviation="0.55" />
          </filter>
        </defs>

        {/* Desk contact shadow */}
        <ellipse
          cx="50"
          cy="128"
          rx="40"
          ry="6"
          fill="rgba(12,12,12,0.38)"
        />

        {/* Cylinder wall (shallow pan) */}
        <path
          d="M12 70 L12 98 A38 13 0 0 0 88 98 L88 70"
          fill={`url(#side-${uid})`}
        />
        <ellipse cx="50" cy="98" rx="38" ry="13" fill="#14110e" />
        <ellipse
          cx="50"
          cy="98"
          rx="38"
          ry="13"
          fill="none"
          stroke="rgba(196,180,154,0.22)"
          strokeWidth={0.7}
        />

        {/* Top plate + champagne rim */}
        <ellipse
          cx="50"
          cy="70"
          rx="38"
          ry="13"
          fill={`url(#lid-${uid})`}
        />
        <ellipse
          cx="50"
          cy="70"
          rx="38"
          ry="13"
          fill="#c4b49a"
          filter={`url(#brushed-${uid})`}
          opacity={0.28}
          style={{ mixBlendMode: "overlay" }}
        />
        <ellipse
          cx="50"
          cy="70"
          rx="38"
          ry="13"
          fill="none"
          stroke={`url(#rim-${uid})`}
          strokeWidth={2.1}
        />

        {/* Inner lip — the pan recess */}
        <ellipse
          cx="50"
          cy="72"
          rx="31"
          ry="10.2"
          fill="#1a1612"
          stroke="rgba(232,217,192,0.4)"
          strokeWidth={1.15}
        />
        <ellipse
          cx="50"
          cy="74.5"
          rx="28"
          ry="9"
          fill={`url(#floor-${uid})`}
        />

        {/* Specular kiss on the front rim */}
        <path
          d="M22 76 Q50 84 78 76"
          fill="none"
          stroke="rgba(247,245,241,0.45)"
          strokeWidth={1.05}
          strokeLinecap="round"
        />

        {/* Melt / balm puck */}
        {hasFill ? (
          <g
            className={
              phase === "snap"
                ? "lab-cast-snap"
                : phase === "seat"
                  ? "lab-cast-seat"
                  : ""
            }
            style={{
              transformOrigin: "50px 75px",
              transform: `scale(${snapScale})`,
              transition: reduced
                ? "opacity 0.15s ease"
                : "transform 0.22s cubic-bezier(0.22, 0.8, 0.28, 1)",
            }}
          >
            <ellipse
              cx="50"
              cy="75"
              rx={27 * puckR}
              ry={8.6 * puckR}
              fill={`url(#puck-${uid})`}
              opacity={puckOpacity}
              style={{
                filter: matteLock ? undefined : `url(#soft-${uid})`,
                transition: reduced
                  ? "opacity 0.15s ease"
                  : "opacity 0.35s ease-out, filter 0.4s ease",
              }}
            />
            {matteLock ? (
              <ellipse
                cx="50"
                cy="75"
                rx={25 * puckR}
                ry={7.8 * puckR}
                fill="#c4b49a"
                filter={`url(#brushed-${uid})`}
                opacity={0.4}
                style={{ mixBlendMode: "multiply" }}
              />
            ) : null}
            {meltGloss > 0.05 && !matteLock ? (
              <ellipse
                cx="44"
                cy="71"
                rx="9"
                ry="3.4"
                fill="rgba(255,248,230,0.55)"
                opacity={meltGloss}
              />
            ) : null}
            {heatAttached && !matteLock ? (
              <ellipse
                cx="50"
                cy="75"
                rx={27 * puckR}
                ry={8.6 * puckR}
                fill="rgba(184,149,108,0.28)"
              />
            ) : null}
          </g>
        ) : null}

        {coolRim ? (
          <ellipse
            cx="50"
            cy="70"
            rx="38.6"
            ry="13.4"
            fill="none"
            stroke="rgba(125,211,252,0.28)"
            strokeWidth={1.2}
            className={reduced ? undefined : "lab-frost-rim"}
          />
        ) : null}

        {phase === "seat" || phase === "ready" ? (
          <ellipse
            cx="50"
            cy="70"
            rx="38"
            ry="13"
            fill="none"
            stroke="rgba(232,217,192,0.55)"
            strokeWidth={1}
            opacity={0.85}
          />
        ) : null}

        {/* Tiny hinge at the back of the tin */}
        <ellipse
          cx="50"
          cy="58.5"
          rx="5.5"
          ry="1.8"
          fill="none"
          stroke="rgba(196,180,154,0.4)"
          strokeWidth={0.85}
        />
      </svg>

      {showPress && hasFill ? (
        <button
          type="button"
          className="lab-press-affordance absolute left-1/2 top-[54%] z-[4] flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/20 text-[9px] font-semibold uppercase tracking-label text-lab-foam/90 backdrop-blur-[1px] transition hover:bg-black/35 md:h-10 md:w-10"
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
