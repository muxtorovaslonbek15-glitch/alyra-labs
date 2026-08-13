"use client";

import { useEffect, useId, useRef } from "react";
import {
  FIRE_H,
  FIRE_W,
  RAIL_MOUTHS,
  allocFireBuf,
  blitFire,
  flameRailEnvelope,
  makeBunsenPalette,
  stepFire,
} from "./fireSim";
import { usePrefersReducedMotion } from "../useFxClock";
import "./heatSource.css";

/**
 * Full-card heat: wash + rim + full-width burner rail + turbulent lab jets.
 * Clipped by the vessel card — never a hanging tab.
 */
export function CardHeatAtmosphere({ intensity = 1 }: { intensity?: number }) {
  const reduced = usePrefersReducedMotion();
  const uid = useId().replace(/:/g, "");
  const jetId = `bunsenJet-${uid}`;
  const softId = `bunsenSoft-${uid}`;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const palette = makeBunsenPalette();
    const buf = allocFireBuf();
    const off = document.createElement("canvas");
    off.width = FIRE_W;
    off.height = FIRE_H;
    const octx = off.getContext("2d");
    if (!octx) return;
    const image = octx.createImageData(FIRE_W, FIRE_H);
    let raf = 0;
    let alive = true;

    const paint = () => {
      if (!alive) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const cssW = canvas.clientWidth || 1;
      const cssH = canvas.clientHeight || 1;
      const w = Math.max(1, Math.round(cssW * dpr));
      const h = Math.max(1, Math.round(cssH * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      stepFire(buf, Math.random, intensity, RAIL_MOUTHS);
      blitFire(image, buf, palette);
      octx.putImageData(image, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.save();
      ctx.clip(flameRailEnvelope(cssW, cssH));
      ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = 0.92;
      ctx.drawImage(off, 0, 0, cssW, cssH);
      ctx.restore();
      raf = requestAnimationFrame(paint);
    };

    raf = requestAnimationFrame(paint);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [reduced, intensity]);

  return (
    <div
      className="lab-card-heat pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit]"
      aria-hidden
    >
      <div className="lab-card-heat-wash absolute inset-0" />
      <div className="lab-card-heat-rim absolute inset-0 rounded-[inherit]" />
      {!reduced ? (
        <div className="lab-card-heat-haze absolute inset-x-0 bottom-0 h-[48%]" />
      ) : null}

      <div className="absolute inset-x-0 bottom-0 h-[3.75rem] md:h-[5.75rem]">
        <svg
          viewBox="0 0 184 92"
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={jetId} x1="0.5" y1="1" x2="0.5" y2="0">
              <stop offset="0%" stopColor="#1e4fd8" />
              <stop offset="18%" stopColor="#4aa3ff" />
              <stop offset="42%" stopColor="#b8956c" />
              <stop offset="72%" stopColor="#ffe08a" />
              <stop offset="100%" stopColor="#fff8e8" />
            </linearGradient>
            <filter id={softId} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.1" />
            </filter>
          </defs>
          <ellipse
            className="lab-bunsen-glow"
            cx="92"
            cy="78"
            rx="78"
            ry="14"
            fill="rgba(184,149,108,0.35)"
            filter={`url(#${softId})`}
          />
          <g fill={`url(#${jetId})`} filter={`url(#${softId})`}>
            <path
              className="lab-bunsen-tongue"
              d="M36 82 C28 58 30 36 36 18 C42 36 46 58 42 82 Z"
            />
            <path
              className="lab-bunsen-tongue-b lab-bunsen-tongue"
              d="M92 84 C78 52 80 22 92 4 C104 22 106 52 106 84 Z"
            />
            <path
              className="lab-bunsen-tongue-c lab-bunsen-tongue"
              d="M148 82 C140 56 142 34 148 16 C154 34 158 56 156 82 Z"
            />
          </g>
        </svg>
        {!reduced ? (
          <canvas
            ref={canvasRef}
            className="lab-bunsen-canvas absolute inset-0 h-full w-full"
          />
        ) : null}
        {!reduced
          ? [0, 1, 2].map((i) => (
              <span
                key={i}
                className="lab-bunsen-ember absolute bottom-3 h-0.5 w-0.5 rounded-full bg-[#fff8e8]"
                style={{
                  left: `${28 + i * 22}%`,
                  animationDelay: `${i * 0.35}s`,
                }}
              />
            ))
          : null}
      </div>

      <div className="lab-card-heat-rail absolute inset-x-0 bottom-0 h-2.5">
        <span className="absolute left-[18%] top-0 h-1.5 w-2 -translate-y-1/2 rounded-sm bg-[#6a6258]" />
        <span className="absolute left-1/2 top-0 h-1.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-[#7a7268]" />
        <span className="absolute right-[18%] top-0 h-1.5 w-2 -translate-y-1/2 rounded-sm bg-[#6a6258]" />
      </div>
    </div>
  );
}
