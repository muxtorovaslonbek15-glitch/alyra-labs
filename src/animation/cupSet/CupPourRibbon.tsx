"use client";

import { viscousPourParams } from "./viscousPour";
import { CUP_MOUTH, TIN_POUR_FROM } from "./cupGeometry";

function quadPoint(
  a: { x: number; y: number },
  c: { x: number; y: number },
  b: { x: number; y: number },
  t: number,
) {
  const u = 1 - t;
  return {
    x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
  };
}

/**
 * Viscous balm ribbon owned by cup-set (does not use PourStream).
 * Thick, slow, elongated blobs — not a watery splash.
 */
export function CupPourRibbon({
  color,
  pour01,
  viscosity = 0.78,
  durationMs,
}: {
  color: string;
  pour01: number;
  viscosity?: number;
  durationMs?: number;
}) {
  if (pour01 < 0.04) return null;

  const p = viscousPourParams(viscosity);
  const from = TIN_POUR_FROM;
  const to = CUP_MOUTH;
  const ctrl = {
    x: (from.x + to.x) / 2 + 6,
    y: Math.min(from.y, to.y) - 18,
  };
  const d = `M${from.x} ${from.y} Q${ctrl.x} ${ctrl.y} ${to.x} ${to.y}`;
  const ms = durationMs ?? p.durationMs;
  const blobs = Math.max(3, p.dropletCount);

  return (
    <svg
      viewBox="0 0 100 140"
      className="pointer-events-none absolute inset-0 z-[6] h-full w-full overflow-visible"
      aria-hidden
    >
      <defs>
        <linearGradient id="cupset-ribbon" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="40%" stopColor={color} stopOpacity={0.95} />
          <stop offset="100%" stopColor={color} stopOpacity={0.7} />
        </linearGradient>
      </defs>
      <path
        d={d}
        fill="none"
        stroke="url(#cupset-ribbon)"
        strokeWidth={p.strokeWidth}
        strokeLinecap="round"
        strokeDasharray={p.dash}
        strokeDashoffset={p.dash * (1 - pour01)}
        opacity={0.35 + pour01 * 0.6}
        style={{
          transition: `stroke-dashoffset ${ms}ms cubic-bezier(0.22, 0.8, 0.28, 1)`,
        }}
      />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={p.strokeWidth * 0.42}
        strokeLinecap="round"
        opacity={0.55 + pour01 * 0.35}
      />
      {Array.from({ length: blobs }).map((_, i) => {
        const t = (i + 0.35) / (blobs + 0.4);
        const pt = quadPoint(from, ctrl, to, t);
        const rx = p.elongate ? 3.2 + (i % 2) : 2.2;
        const ry = p.elongate ? 1.6 + (i % 3) * 0.4 : 2.2;
        return (
          <ellipse
            key={i}
            cx={pt.x}
            cy={pt.y}
            rx={rx}
            ry={ry}
            fill={color}
            opacity={0.35 + pour01 * 0.45}
            transform={`rotate(${18 + i * 8} ${pt.x} ${pt.y})`}
          />
        );
      })}
      {p.bloom > 0.2 ? (
        <circle
          cx={to.x}
          cy={to.y}
          r={6 + p.bloom * 4}
          fill={color}
          opacity={0.12 * pour01 * p.bloom}
        />
      ) : null}
    </svg>
  );
}
