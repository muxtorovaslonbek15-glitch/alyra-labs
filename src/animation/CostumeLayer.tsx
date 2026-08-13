"use client";

import type { CSSProperties, ReactNode } from "react";

/**
 * Wear ↔ Compose costume fade. Opacity only — no translate.
 * Duration: MOTION_MS.crossfade (220ms) via `.lab-costume` in globals.css.
 */
export function costumeFadeClass(visible: boolean, extra = ""): string {
  return [
    "lab-costume",
    visible ? "lab-costume-in" : "lab-costume-out",
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}

const LAYOUT = {
  left: {
    on: "md:h-full md:shrink-0 lab-costume-left",
    off: "pointer-events-none z-[1] md:h-full md:shrink-0 lab-costume-left",
  },
  right: {
    on: "md:flex md:h-full md:shrink-0",
    off: "pointer-events-none z-[1] md:absolute md:inset-0 md:flex md:h-full",
  },
} as const;

/**
 * Active audience occupies flex layout immediately; outgoing rail overlays.
 * Pass `isWear` / `!isWear`, not `visible` — visible lags 2 frames and jumps the desk.
 * Left Oils rail collapses width in-flow (see `costumeLeftWidthVar`) so the desk
 * does not jump. Right rail stays overlay + persisted `rightWidth`.
 */
export function costumeLayoutClass(
  occupy: boolean,
  slot: "left" | "right",
  extra = "",
): string {
  return [occupy ? LAYOUT[slot].on : LAYOUT[slot].off, extra]
    .filter(Boolean)
    .join(" ");
}

/** Compose overlays (journal, reward) stay painted while Wear costume fades. */
export function composeOverlayOpen(isWear: boolean, open: boolean): boolean {
  return open && !isWear;
}

/**
 * Desktop-only Oils rail width. Phone must not get an inline width — ItemPanel
 * stays a FAB/sheet (desk-only). `--lab-costume-left-w` is applied at `md+`.
 */
export function costumeLeftWidthVar(
  occupy: boolean,
  leftOpen: boolean,
  leftWidth: number,
): CSSProperties {
  return {
    ["--lab-costume-left-w"]: occupy && leftOpen ? `${leftWidth}px` : "0px",
  } as CSSProperties;
}

export function CostumeLayer({
  mounted,
  visible,
  className = "",
  style,
  children,
}: {
  mounted: boolean;
  visible: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  if (!mounted) return null;
  return (
    <div
      className={costumeFadeClass(visible, className)}
      style={style}
      aria-hidden={!visible}
    >
      {children}
    </div>
  );
}
