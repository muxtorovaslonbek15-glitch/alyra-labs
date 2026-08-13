"use client";

import { useId } from "react";

/** Tiny inventory glyphs — equipment, not emoji fireworks. */

export function EquipmentGlyph({
  id,
  className = "h-5 w-5",
}: {
  id: string;
  className?: string;
}) {
  const gradId = `eqBunsen-${useId().replace(/:/g, "")}`;
  if (id === "ice-bath") {
    return (
      <svg viewBox="0 0 20 20" className={className} aria-hidden>
        <rect
          x="2"
          y="11"
          width="16"
          height="6"
          rx="1.2"
          fill="#3d4a52"
          stroke="#1e2a32"
          strokeWidth="0.6"
        />
        <rect x="3.2" y="12.2" width="13.6" height="3.2" rx="0.6" fill="#0c4a6e" />
        <path
          d="M4 14 L6 10 L8 13 M10 15 L11 9 L13 12 M15 14 L16 10"
          fill="none"
          stroke="rgba(255,255,255,0.75)"
          strokeWidth="0.7"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (id === "bunsen") {
    return (
      <svg viewBox="0 0 20 20" className={className} aria-hidden>
        <defs>
          <linearGradient id={gradId} x1="0.5" y1="1" x2="0.5" y2="0">
            <stop offset="0%" stopColor="#1e4fd8" />
            <stop offset="45%" stopColor="#b8956c" />
            <stop offset="100%" stopColor="#fff8e8" />
          </linearGradient>
        </defs>
        <rect x="7.5" y="12" width="5" height="6" rx="0.6" fill="#3a3530" />
        <rect x="4" y="17.2" width="12" height="1.6" rx="0.4" fill="#2a221c" />
        <path d="M10 12 C8.2 8 8.4 4.5 10 2 C11.6 4.5 11.8 8 10 12 Z" fill={`url(#${gradId})`} />
      </svg>
    );
  }
  return null;
}

export function ItemGlyph({
  id,
  icon,
}: {
  id: string;
  icon: string;
}) {
  if (id === "bunsen" || id === "ice-bath") {
    return <EquipmentGlyph id={id} />;
  }
  return <>{icon}</>;
}
