"use client";

import type { ReactNode } from "react";
import { CUP_SET_WINDOW_MS, cupSetFrame } from "./timeline";
import { SolidCupVessel } from "./SolidCupVessel";
import { CupPourRibbon } from "./CupPourRibbon";
import { useFxClock, usePrefersReducedMotion } from "@/animation/useFxClock";

interface Props {
  fillPct: number;
  fillColor: string;
  cupSetAt?: number;
  meltFraction?: number;
  heatAttached?: boolean;
  viscosity?: number;
  pressEnabled?: boolean;
  onPress?: () => void;
  children: ReactNode;
}

/**
 * In-card solid Cast: mix in the tin, pour into a metal-rimmed cup, watch it set.
 * Renders `children` (tin) unchanged when `cupSetAt` is unset.
 */
export function CupSetStage({
  fillPct,
  fillColor,
  cupSetAt,
  meltFraction = 0,
  heatAttached,
  viscosity = 0.78,
  pressEnabled,
  onPress,
  children,
}: Props) {
  const reduced = usePrefersReducedMotion();
  const hasFill = fillPct > 0;
  const started = Boolean(cupSetAt) && hasFill;
  const now = useFxClock([cupSetAt], CUP_SET_WINDOW_MS + 200, false);
  const elapsedMs = cupSetAt && now ? Math.max(0, now - cupSetAt) : 0;
  const phone =
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 767px)").matches;
  const frame = cupSetFrame({
    elapsedMs,
    hasFill,
    started,
    reducedMotion: reduced,
    timeScale: phone ? 0.82 : 1,
  });

  if (!started) return <>{children}</>;

  const tinHero = frame.phase === "idle" || frame.phase === "mix_hold";

  return (
    <div className="relative aspect-[100/140] w-full">
      <div
        className="absolute inset-0"
        style={{
          opacity: frame.tinOpacity,
          transform: `translateX(${tinHero ? 0 : -10}%) scale(${tinHero ? 1 : 0.78}) rotate(${frame.tinTilt}deg)`,
          transformOrigin: "50% 82%",
          transition: reduced
            ? "opacity 0.15s ease"
            : "transform 0.45s cubic-bezier(0.22, 0.8, 0.28, 1), opacity 0.4s ease",
          pointerEvents: frame.phase === "ready" ? "none" : undefined,
          zIndex: 1,
        }}
      >
        {children}
      </div>

      <div
        className="absolute inset-0 z-[3]"
        style={{
          opacity: frame.cupEnter,
          transform: `translateX(${(1 - frame.cupEnter) * 16}%)`,
          transition: reduced
            ? "opacity 0.15s ease"
            : "transform 0.5s cubic-bezier(0.22, 0.8, 0.28, 1), opacity 0.35s ease",
        }}
      >
        <SolidCupVessel
          fillPct={fillPct}
          fillColor={fillColor}
          frame={frame}
          elapsedMs={elapsedMs}
          meltFraction={meltFraction}
          heatAttached={heatAttached}
          pressEnabled={pressEnabled && frame.phase === "ready"}
          onPress={onPress}
        />
      </div>

      <CupPourRibbon
        color={fillColor === "transparent" ? "#c4a882" : fillColor}
        pour01={frame.pour01}
        viscosity={Math.max(0.7, viscosity)}
      />
    </div>
  );
}
