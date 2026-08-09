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
 * Matte solid-perfume tin / pan — no free-surface waves.
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
    // ~1.8s storyboard (phone-friendly within 1.6–2.2s)
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
    // Gradual live melt (reduced-motion: still show state, no pulse)
    melt01 > 0.08 ? (reduced ? melt01 * 0.45 : 0.2 + melt01 * 0.55) : 0,
  );
  // Live Melt unlocks gloss even after cast "ready"; Set / idle keep matte.
  const liveMeltOpen = heatAttached || melt01 >= 0.35;
  const matteLock =
    !liveMeltOpen &&
    (phase === "matte" ||
      phase === "snap" ||
      phase === "seat" ||
      phase === "ready" ||
      (hasFill && !castRevealAt && melt01 < 0.35));
  const snapScale =
    phase === "snap" ? 1.02 : phase === "seat" || phase === "ready" ? 1 : 1;
  const coolRim =
    coolAttached ||
    phase === "cool" ||
    phase === "matte" ||
    (melt01 < 0.25 && coolAttached);

  const puckOpacity = hasFill
    ? matteLock
      ? 0.92
      : 0.55 + Math.min(fillPct, 100) * 0.003
    : 0;

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
          <radialGradient id={`puck-${uid}`} cx="42%" cy="38%" r="65%">
            <stop
              offset="0%"
              stopColor={tint}
              stopOpacity={matteLock ? 0.95 : 0.75}
            />
            <stop offset="70%" stopColor={tint} stopOpacity={0.88} />
            <stop offset="100%" stopColor={tint} stopOpacity={0.7} />
          </radialGradient>
          <radialGradient id={`grain-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
            <stop offset="100%" stopColor="rgba(20,16,12,0.18)" />
          </radialGradient>
          <linearGradient id={`rim-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e8d9c0" />
            <stop offset="45%" stopColor="#c4b49a" />
            <stop offset="100%" stopColor="#8a7a62" />
          </linearGradient>
          <filter id={`soft-${uid}`}>
            <feGaussianBlur stdDeviation="0.6" />
          </filter>
        </defs>

        {/* Desk shadow */}
        <ellipse
          cx="50"
          cy="128"
          rx="32"
          ry="5"
          fill="rgba(20,16,12,0.28)"
        />

        {/* Outer tin body */}
        <ellipse
          cx="50"
          cy="78"
          rx="34"
          ry="34"
          fill="#1a1612"
          stroke={`url(#rim-${uid})`}
          strokeWidth={2.2}
        />
        <ellipse
          cx="50"
          cy="78"
          rx="30"
          ry="30"
          fill="#2a241e"
          stroke="rgba(196,180,154,0.55)"
          strokeWidth={1.2}
        />

        {/* Inner pan well */}
        <ellipse cx="50" cy="78" rx="24" ry="24" fill="#12100e" />

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
              transformOrigin: "50px 78px",
              transform: `scale(${snapScale})`,
              transition: reduced
                ? "opacity 0.15s ease"
                : "transform 0.22s cubic-bezier(0.22, 0.8, 0.28, 1)",
            }}
          >
            <ellipse
              cx="50"
              cy="78"
              rx={22 * Math.min(1, 0.35 + fillPct / 140)}
              ry={22 * Math.min(1, 0.35 + fillPct / 140)}
              fill={`url(#puck-${uid})`}
              opacity={puckOpacity}
              style={{
                filter: matteLock ? undefined : `url(#soft-${uid})`,
                transition: reduced
                  ? "opacity 0.15s ease"
                  : "opacity 0.35s ease-out, filter 0.4s ease",
              }}
            />
            {/* Soft grain when set */}
            {matteLock ? (
              <ellipse
                cx="50"
                cy="78"
                rx={20 * Math.min(1, 0.35 + fillPct / 140)}
                ry={20 * Math.min(1, 0.35 + fillPct / 140)}
                fill={`url(#grain-${uid})`}
                opacity={0.45}
                style={{ mixBlendMode: "multiply" }}
              />
            ) : null}
            {/* Melt gloss */}
            {meltGloss > 0.05 && !matteLock ? (
              <ellipse
                cx="44"
                cy="70"
                rx="10"
                ry="6"
                fill="rgba(255,248,230,0.55)"
                opacity={meltGloss}
              />
            ) : null}
            {/* Amber melt wash when heat on */}
            {heatAttached && !matteLock ? (
              <ellipse
                cx="50"
                cy="78"
                rx="22"
                ry="22"
                fill="rgba(184,149,108,0.28)"
              />
            ) : null}
          </g>
        ) : null}

        {/* Cool rim flash */}
        {coolRim ? (
          <ellipse
            cx="50"
            cy="78"
            rx="25"
            ry="25"
            fill="none"
            stroke="rgba(125,211,252,0.45)"
            strokeWidth={1.4}
            className={reduced ? undefined : "lab-frost-rim"}
          />
        ) : null}

        {/* Champagne rim light kiss after seat */}
        {phase === "seat" || phase === "ready" ? (
          <ellipse
            cx="50"
            cy="78"
            rx="34"
            ry="34"
            fill="none"
            stroke="rgba(232,217,192,0.55)"
            strokeWidth={1}
            opacity={0.85}
          />
        ) : null}

        {/* Tin label ring highlight */}
        <ellipse
          cx="50"
          cy="52"
          rx="8"
          ry="2.5"
          fill="none"
          stroke="rgba(196,180,154,0.35)"
          strokeWidth={0.8}
        />
      </svg>

      {/* Press affordance — post reveal only */}
      {showPress && hasFill ? (
        <button
          type="button"
          className="lab-press-affordance absolute left-1/2 top-[52%] z-[4] flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/20 text-[9px] font-semibold uppercase tracking-[0.12em] text-lab-foam/90 backdrop-blur-[1px] transition hover:bg-black/35 md:h-10 md:w-10"
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
