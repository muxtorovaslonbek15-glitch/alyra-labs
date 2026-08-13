"use client";

import type { PerfumeFormatChoice } from "./types";

/**
 * Quiet once-per-brief ask — DESIGN.md: ink CTA, no pill HUD.
 * Solid is the Alyra default path; liquid stays teaching EDP/oil.
 */
export function FormatForkBar({
  onChoose,
}: {
  onChoose: (choice: PerfumeFormatChoice) => void;
}) {
  return (
    <div
      className="rounded-lg border border-lab-line/70 bg-lab-wash/50 px-2.5 py-2"
      role="group"
      aria-label="Solid perfume or liquid"
    >
      <p className="text-[10px] font-semibold uppercase tracking-label text-lab-muted">
        Format
      </p>
      <p className="mt-0.5 text-[12px] leading-snug text-lab-ink">
        Solid perfume (tin / balm) or a liquid (EDP / oil)?
      </p>
      <div className="mt-2 flex gap-1.5">
        <button
          type="button"
          onClick={() => onChoose("Solid")}
          className="min-h-9 flex-1 rounded-lg bg-lab-teal px-2 py-1.5 text-[11px] font-semibold text-white hover:bg-lab-teal/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lab-teal md:min-h-8"
        >
          Solid perfume
        </button>
        <button
          type="button"
          onClick={() => onChoose("EDP")}
          className="min-h-9 flex-1 rounded-lg border border-lab-line/80 bg-white px-2 py-1.5 text-[11px] font-semibold text-lab-ink hover:border-lab-teal/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lab-teal md:min-h-8"
        >
          Liquid · EDP / oil
        </button>
      </div>
      <p className="mt-1.5 text-[10px] leading-snug text-lab-muted">
        Asked once this brief. Solid → tin + cup-set. Liquid → beaker Mix.
      </p>
    </div>
  );
}
