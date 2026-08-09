"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { GlassGeometry } from "./glassware/shapes";
import { usePrefersReducedMotion } from "./useFxClock";

export interface LiquidMotion {
  pourIntensity: number;
  stirLevel: number;
  shaking: boolean;
  boiling: boolean;
  transferringOut: boolean;
  /** Shared 0–1 intensities (optional — falls back to booleans). */
  boilIntensity?: number;
  solidify?: number;
  melt?: number;
}

interface Props {
  geometry: GlassGeometry;
  fillPct: number;
  fillColor: string;
  motion: LiquidMotion;
  clipId: string;
  reducedMotion?: boolean;
}

interface Bubble {
  x: number;
  y: number;
  r: number;
  opacity: number;
}

interface FrameState {
  displayPct: number;
  surfacePath: string;
  sloshDeg: number;
  morphT: number;
  colorA: string;
  colorB: string;
  meniscus: string;
  bubbles: Bubble[];
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function hexWithAlpha(hex: string, alpha: number) {
  if (!hex || hex === "transparent") return `rgba(143, 192, 181, ${alpha})`;
  const raw = hex.replace("#", "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw.slice(0, 6);
  if (full.length !== 6) return `rgba(143, 192, 181, ${alpha})`;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function staticSurface(wb: GlassGeometry["wellBounds"], fillPct: number) {
  const topY = wb.y + wb.height * (1 - clamp(fillPct, 0, 100) / 100);
  return `M${wb.x} ${topY} L${wb.x + wb.width} ${topY} L${wb.x + wb.width} ${wb.y + wb.height} L${wb.x} ${wb.y + wb.height} Z`;
}

function buildWaveSurface(
  wb: GlassGeometry["wellBounds"],
  fillPct: number,
  t: number,
  amp: number,
  freq: number,
  tiltBias: number,
) {
  const baseY = wb.y + wb.height * (1 - clamp(fillPct, 0, 100) / 100);
  const steps = 10;
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const x = wb.x + wb.width * u;
    const wave =
      Math.sin(u * Math.PI * 2 * freq + t * freq * 2.2) * amp * 0.55 +
      Math.sin(u * Math.PI * 3 + t * 3.1) * amp * 0.25 +
      tiltBias * (u - 0.5) * 2;
    pts.push(
      `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${(baseY + wave).toFixed(2)}`,
    );
  }
  pts.push(
    `L${wb.x + wb.width} ${wb.y + wb.height} L${wb.x} ${wb.y + wb.height} Z`,
  );
  return pts.join(" ");
}

function meniscusStroke(
  wb: GlassGeometry["wellBounds"],
  fillPct: number,
  t: number,
  amp: number,
) {
  const baseY = wb.y + wb.height * (1 - clamp(fillPct, 0, 100) / 100);
  const steps = 8;
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const x = wb.x + 1 + (wb.width - 2) * u;
    const y =
      baseY +
      Math.sin(u * Math.PI * 2 + t * 2.4) * amp * 0.5 -
      Math.sin(u * Math.PI) * 0.8;
    pts.push(`${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return pts.join(" ");
}

/**
 * Animated free-surface liquid clipped to glass well.
 * Props sync via layout effect; motion via a long-lived rAF loop.
 */
export function LiquidSurface({
  geometry,
  fillPct,
  fillColor,
  motion,
  clipId,
  reducedMotion: reducedProp,
}: Props) {
  const prefersReduced = usePrefersReducedMotion();
  const reduced = reducedProp ?? prefersReduced;
  const { wellBounds: wb } = geometry;
  const gradId = useId().replace(/:/g, "");

  const propsRef = useRef({ fillPct, fillColor, motion, reduced });
  useLayoutEffect(() => {
    propsRef.current = { fillPct, fillColor, motion, reduced };
  }, [fillPct, fillColor, motion, reduced]);

  const [frame, setFrame] = useState<FrameState>(() => ({
    displayPct: fillPct,
    surfacePath: staticSurface(wb, fillPct),
    sloshDeg: 0,
    morphT: 1,
    colorA: fillColor,
    colorB: fillColor,
    meniscus: "",
    bubbles: [],
  }));

  useEffect(() => {
    let raf = 0;
    let currentPct = propsRef.current.fillPct;
    let morphT = 1;
    let colorA = propsRef.current.fillColor;
    let colorB = propsRef.current.fillColor;
    let t0 = 0;
    let cancelled = false;
    let lastIdleFrame = -1;

    const tick = (now: number) => {
      if (cancelled) return;
      const { fillPct: target, fillColor: nextColor, motion: m, reduced: red } =
        propsRef.current;

      if (red) {
        currentPct = target;
        colorA = nextColor;
        colorB = nextColor;
        morphT = 1;
        setFrame({
          displayPct: target,
          surfacePath: staticSurface(wb, target),
          sloshDeg: 0,
          morphT: 1,
          colorA: nextColor,
          colorB: nextColor,
          meniscus: "",
          bubbles: [],
        });
        // Reduced motion: stop looping after one static frame
        return;
      }

      if (!t0) t0 = now;
      const t = (now - t0) / 1000;

      if (nextColor !== colorB) {
        colorA = colorB;
        colorB = nextColor;
        morphT = 0;
      }

      const diff = target - currentPct;
      currentPct += diff * 0.12;
      if (Math.abs(diff) < 0.15) currentPct = target;
      if (morphT < 1) morphT = Math.min(1, morphT + 0.035);

      const pour = m.pourIntensity;
      const stir = m.stirLevel;
      const boil = m.boilIntensity ?? (m.boiling ? 1 : 0);
      const shake = m.shaking ? 1 : 0;
      const out = m.transferringOut ? 1 : 0;
      const solid = m.solidify ?? 0;
      const meltAmt = m.melt ?? 0;
      // Solidify freezes waves; melt unlocks
      const freeze = Math.max(0, solid - meltAmt * 0.85);

      const energy =
        pour +
        stir +
        boil +
        shake +
        out +
        meltAmt +
        Math.abs(target - currentPct) +
        (morphT < 1 ? 1 : 0) +
        (freeze > 0.4 ? 0 : 0.01);
      // Idle: ~8fps gentle wave instead of full 60fps
      if (energy < 0.05 && freeze < 0.3) {
        const idleFrame = Math.floor(t * 8);
        if (idleFrame === lastIdleFrame) {
          raf = requestAnimationFrame(tick);
          return;
        }
        lastIdleFrame = idleFrame;
      }

      const amp =
        (1.2 + pour * 4.5 + stir * 1.4 + boil * 3.4 + shake * 3.5 + out * 3) *
        (1 - freeze * 0.92) *
        (1 + meltAmt * 0.25);
      const freq =
        (1.6 + pour * 2 + stir * 0.8 + boil * 2.2 + shake * 2.5) *
        (1 - freeze * 0.7);
      const tilt =
        (shake * Math.sin(t * 18) * 6 -
          out * 14 +
          (stir > 0 ? Math.sin(t * 3) * stir * 1.5 : 0)) *
        (1 - freeze * 0.9);

      const bubbleN =
        boil > 0.2
          ? Math.min(16, Math.round(7 + boil * 10))
          : stir > 1.5
            ? 4
            : 0;
      const bubbles: Bubble[] =
        bubbleN > 0
          ? Array.from({ length: bubbleN }, (_, i) => {
              // Nucleation from bottom; wobble + grow; pop near surface
              const speed = 1.05 + boil * 0.55 + (i % 3) * 0.08;
              const phase = (t * speed + i * 0.31) % 1.4;
              const life = Math.min(1, phase / 1.4);
              const coalesce = boil > 0.75 && i % 3 === 0 ? 1.5 : 1;
              const wobble =
                Math.sin(t * 3.2 + i * 1.7) * (2 + life * 5) * (1 - freeze);
              const pop = life > 0.88 ? Math.max(0.2, 1 - (life - 0.88) / 0.12) : 1;
              return {
                x:
                  wb.x +
                  wb.width * (0.14 + ((i * 0.17 + i * 0.03) % 0.72)) +
                  wobble,
                y:
                  wb.y +
                  wb.height -
                  (wb.height * (currentPct / 100)) * life -
                  2,
                r: (1.6 + (i % 5) * 0.9) * coalesce * (0.7 + life * 0.55) * pop,
                opacity:
                  (0.95 - life * 0.4) *
                  (0.5 + boil * 0.5) *
                  pop *
                  (1 - freeze * 0.7),
              };
            })
          : [];

      setFrame({
        displayPct: currentPct,
        surfacePath: buildWaveSurface(
          wb,
          currentPct,
          t,
          amp,
          freq,
          tilt * 0.35,
        ),
        sloshDeg: tilt,
        morphT,
        colorA,
        colorB,
        meniscus:
          currentPct > 2
            ? meniscusStroke(wb, currentPct, t, 1 + pour * 3 + stir * 0.8)
            : "",
        bubbles,
      });

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [wb]);

  if (fillPct <= 0 && frame.displayPct < 0.5) return null;

  const bodyPath = frame.surfacePath || staticSurface(wb, frame.displayPct);
  const colorA =
    frame.colorA === "transparent"
      ? "var(--lab-glass, #8fc0b5)"
      : frame.colorA;
  const colorB =
    frame.colorB === "transparent"
      ? "var(--lab-glass, #8fc0b5)"
      : frame.colorB;
  const showMorph = frame.morphT < 1 && colorA !== colorB;

  return (
    <g clipPath={`url(#${clipId})`}>
      <defs>
        <linearGradient id={`liq-${gradId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={hexWithAlpha(colorB, 0.72)} />
          <stop offset="55%" stopColor={hexWithAlpha(colorB, 0.92)} />
          <stop offset="100%" stopColor={hexWithAlpha(colorB, 1)} />
        </linearGradient>
        {showMorph ? (
          <linearGradient id={`liq-prev-${gradId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={hexWithAlpha(colorA, 0.72)} />
            <stop offset="100%" stopColor={hexWithAlpha(colorA, 1)} />
          </linearGradient>
        ) : null}
        <linearGradient id={`liq-spec-${gradId}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="30%" stopColor="rgba(255,255,255,0.35)" />
          <stop offset="60%" stopColor="rgba(255,255,255,0)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.15)" />
        </linearGradient>
      </defs>

      <g
        style={{
          transformOrigin: `${wb.x + wb.width / 2}px ${wb.y + wb.height}px`,
          transform: `rotate(${frame.sloshDeg}deg)`,
        }}
      >
        {showMorph ? (
          <path
            d={bodyPath}
            fill={`url(#liq-prev-${gradId})`}
            opacity={1 - frame.morphT}
          />
        ) : null}
        <path
          d={bodyPath}
          fill={`url(#liq-${gradId})`}
          opacity={showMorph ? frame.morphT : 1}
        />
        <path
          d={bodyPath}
          fill={`url(#liq-spec-${gradId})`}
          opacity={0.35}
          style={{ mixBlendMode: "screen" }}
        />
        {frame.meniscus ? (
          <path
            d={frame.meniscus}
            fill="none"
            stroke="rgba(255,255,255,0.55)"
            strokeWidth={1.2}
            strokeLinecap="round"
          />
        ) : null}
        {frame.bubbles.map((b, i) => (
          <circle
            key={i}
            cx={b.x}
            cy={b.y}
            r={b.r}
            fill="rgba(255,255,255,0.78)"
            stroke="rgba(255,255,255,0.45)"
            strokeWidth={0.4}
            opacity={b.opacity}
          />
        ))}
      </g>
    </g>
  );
}
