"use client";

import { useId } from "react";
import { trayFrost } from "./frostVisual";
import { usePrefersReducedMotion } from "../useFxClock";
import "./heatSource.css";

/**
 * Full-card cool: wash + frost rim + full-width bath. Frost grows with live
 * sim frost — condensation first, crystals only after freeze has actually begun.
 */
export function CardCoolAtmosphere({ frost = 0 }: { frost?: number }) {
  const reduced = usePrefersReducedMotion();
  const filmId = `cardFrostFilm-${useId().replace(/:/g, "")}`;
  const visual = trayFrost(frost);

  return (
    <div
      className="lab-card-cool pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit]"
      aria-hidden
    >
      <div className="lab-card-cool-wash absolute inset-0" />
      <div className="lab-card-cool-rim absolute inset-0 rounded-[inherit]" />

      <svg
        viewBox="0 0 100 140"
        className={`absolute inset-0 h-full w-full ${reduced ? "" : "lab-frost-film"}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={filmId} x1="0.5" y1="1" x2="0.5" y2="0">
            <stop offset="0%" stopColor="rgba(224,242,254,0.55)" />
            <stop offset="55%" stopColor="rgba(186,230,253,0.18)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>
        <rect
          x="0"
          y="48"
          width="100"
          height="92"
          fill={`url(#${filmId})`}
          opacity={visual.haze}
        />
        <g
          className="lab-frost-dendrite"
          strokeWidth="0.7"
          opacity={visual.crystalOpacity}
        >
          <path d="M8 128 L10 92 L6 70 M10 92 L22 78 L28 62 M10 92 L4 80" />
          <path d="M32 130 L36 96 L30 72 M36 96 L48 84 L52 66 M36 96 L40 78" />
          <path d="M68 130 L64 94 L70 70 M64 94 L52 80 L46 64 M64 94 L72 78" />
          <path d="M92 128 L90 90 L94 68 M90 90 L78 76 L72 58 M90 90 L96 78" />
        </g>
      </svg>

      <div className="lab-card-cool-tray absolute inset-x-0 bottom-0 h-5 overflow-hidden md:h-8">
        <div
          className="absolute inset-x-2 top-1 h-4 rounded-sm"
          style={{
            background:
              "linear-gradient(180deg, rgba(186,230,253,0.35), rgba(12,74,110,0.55))",
            opacity: visual.waterOpacity,
          }}
        />
        <div
          className="absolute inset-x-3 top-2 h-3 rounded-sm"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.55), rgba(186,230,253,0.2))",
            opacity: visual.slushOpacity,
            filter: "blur(0.6px)",
          }}
        />
        <div
          className="absolute inset-x-1 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)",
            opacity: visual.rimFrost,
          }}
        />
      </div>
    </div>
  );
}
