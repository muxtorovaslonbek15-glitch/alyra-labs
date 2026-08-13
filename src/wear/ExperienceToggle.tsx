"use client";

import { LAB_EASE, MOTION_MS } from "@/animation/motion";
import { usePrefersReducedMotion } from "@/animation/useFxClock";
import type { Audience } from "./audience";

export function ExperienceToggle({
  value,
  onChange,
}: {
  value: Audience;
  onChange: (v: Audience) => void;
}) {
  const reduced = usePrefersReducedMotion();
  const ms = reduced ? MOTION_MS.reduced : MOTION_MS.crossfade;

  return (
    <div
      role="group"
      aria-label="Wear or compose"
      className="relative grid h-8 w-[8.25rem] grid-cols-2 items-stretch rounded-lg bg-white/10 p-0.5"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-md bg-lab-foam"
        style={{
          transform:
            value === "composer" ? "translateX(100%)" : "translateX(0)",
          transition: reduced ? "none" : `transform ${ms}ms ${LAB_EASE}`,
        }}
      />
      {(
        [
          ["owner", "Wear"],
          ["composer", "Compose"],
        ] as const
      ).map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          aria-pressed={value === id}
          className={`relative z-[1] flex h-full w-full items-center justify-center rounded-md px-1 text-center text-xs font-semibold leading-none tracking-wide outline-none focus-visible:ring-1 focus-visible:ring-white/35 ${
            value === id
              ? "text-lab-ink"
              : "text-lab-foam/65 hover:text-lab-foam"
          }`}
          style={{
            transition: `color ${ms}ms ${LAB_EASE}`,
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
