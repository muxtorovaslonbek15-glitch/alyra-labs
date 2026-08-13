"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlyraMark } from "@/components/brand/AlyraMark";
import { MOTION_MS, PHONE_DOCK_EASE } from "@/animation/motion";
import { usePrefersReducedMotion } from "@/animation/useFxClock";

/**
 * First-visit Wear | Compose gate. Must portal to `document.body`:
 * `.lab-app` uses `overflow-x: clip`, which makes `position: fixed`
 * descendants resolve against the lab shell (desk column), not the viewport.
 *
 * Appear/dismiss: fade + scale, 200ms (`MOTION_MS.chrome`). Backdrop fades
 * on the same clock. No translateY — slide-from-bottom clips inside the desk.
 */
export function AudienceChooser({
  onChooseWear,
  onChooseCompose,
}: {
  onChooseWear: () => void;
  onChooseCompose: () => void;
}) {
  const reduced = usePrefersReducedMotion();
  const ms = reduced ? MOTION_MS.reduced : MOTION_MS.chrome;
  const [visible, setVisible] = useState(false);
  const leaving = useRef(false);
  const exitTimer = useRef<number | null>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    let cancelled = false;
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (!cancelled) setVisible(true);
      });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(id);
      if (exitTimer.current != null) window.clearTimeout(exitTimer.current);
      document.body.style.overflow = prev;
    };
  }, []);

  function choose(next: () => void) {
    if (leaving.current) return;
    leaving.current = true;
    setVisible(false);
    exitTimer.current = window.setTimeout(next, ms);
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="pointer-events-auto fixed inset-0 z-[400] flex items-center justify-center overflow-visible p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="audience-chooser-title"
      data-audience-chooser
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-lab-ink/45"
        style={{
          opacity: visible ? 1 : 0,
          transition: `opacity ${ms}ms ${PHONE_DOCK_EASE}`,
        }}
      />
      <div
        className="pointer-events-auto relative w-full max-w-md origin-center rounded-2xl border border-lab-line bg-lab-panel px-5 py-6 shadow-2xl md:px-6"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible || reduced ? "scale(1)" : "scale(0.96)",
          transition: reduced
            ? `opacity ${ms}ms ${PHONE_DOCK_EASE}`
            : `opacity ${ms}ms ${PHONE_DOCK_EASE}, transform ${ms}ms ${PHONE_DOCK_EASE}`,
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <AlyraMark size="sm" href={null} />
        <h2
          id="audience-chooser-title"
          className="mt-5 font-display text-2xl leading-snug tracking-display text-lab-ink"
        >
          How are you using Labs?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-lab-muted">
          Asked once. You can switch Wear and Compose any time in the header.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            autoFocus
            onClick={() => choose(onChooseWear)}
            className="min-h-11 w-full rounded-lg bg-lab-ink px-4 py-2.5 text-sm font-semibold text-lab-foam outline-none hover:bg-lab-ink/90 focus-visible:ring-1 focus-visible:ring-lab-ink/30"
          >
            I bought an Alyra perfume
          </button>
          <button
            type="button"
            onClick={() => choose(onChooseCompose)}
            className="min-h-11 w-full rounded-lg border border-lab-line bg-white px-4 py-2.5 text-sm font-semibold text-lab-ink outline-none hover:border-lab-ink/40 focus-visible:ring-1 focus-visible:ring-lab-line"
          >
            I want to compose
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
