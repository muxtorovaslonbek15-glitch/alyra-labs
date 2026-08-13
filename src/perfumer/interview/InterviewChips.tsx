"use client";

import type { InterviewChip } from "./types";

export function InterviewChips({
  chips,
  onPick,
}: {
  chips: InterviewChip[];
  onPick: (chip: InterviewChip) => void;
}) {
  if (!chips.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5" role="group">
      {chips.map((c) => (
        <button
          key={`${c.id}-${c.label}`}
          type="button"
          onClick={() => onPick(c)}
          className="min-h-11 rounded-lg border border-lab-line/80 bg-white px-3 text-[11px] font-semibold text-lab-ink outline-none hover:bg-lab-wash focus-visible:ring-1 focus-visible:ring-lab-line md:min-h-8"
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
