"use client";

import type { ChatAgentMode } from "@/store/builderStore";

/** Cursor-like Plan | Agent segmented control. Equal cells, calm.
 * Radius: outer `rounded-lg`, cells `rounded-md` (Lab control scale).
 */
export function ChatModeToggle({
  mode,
  onChange,
  disabled,
  size = "md",
}: {
  mode: ChatAgentMode;
  onChange: (mode: ChatAgentMode) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const compact = size === "sm";
  const width = compact ? "w-[6.5rem]" : "w-[7.25rem]";
  const height = compact ? "h-6" : "h-7";
  const cell = compact
    ? "px-1 text-[10px]"
    : "px-1.5 text-[11px]";
  return (
    <div
      role="group"
      aria-label="Chat mode"
      className={`grid ${width} ${height} grid-cols-2 items-stretch rounded-lg border border-lab-line/70 bg-lab-wash/70 p-0.5`}
    >
      {(
        [
          { id: "plan" as const, label: "Plan" },
          { id: "agent" as const, label: "Agent" },
        ] as const
      ).map((opt) => {
        const active = mode === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => onChange(opt.id)}
            className={`${cell} flex h-full w-full items-center justify-center rounded-md text-center font-semibold leading-none tracking-wide transition ${
              active
                ? "bg-lab-ink text-lab-foam"
                : "text-lab-muted hover:text-lab-ink"
            } disabled:opacity-50`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** Soft nudge above composer when a long draft suggests Plan mode. */
export function PlanModeNudge({
  onSwitch,
  onDismiss,
}: {
  onSwitch: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      role="status"
      className="mb-2 flex items-start gap-2 rounded-lg border border-lab-line/60 bg-lab-wash/70 px-2.5 py-2"
    >
      <p className="min-w-0 flex-1 text-[11px] leading-snug text-lab-muted">
        <span className="font-semibold text-lab-ink">Switch to Plan mode</span>{" "}
        for a clearer build?
      </p>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onSwitch}
          className="flex h-7 items-center rounded-lg bg-lab-ink px-2 text-[10px] font-semibold leading-none text-lab-foam hover:bg-black"
        >
          Switch
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="flex h-7 items-center rounded-lg px-2 text-[10px] font-medium leading-none text-lab-muted hover:bg-white hover:text-lab-ink"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

export function wordCount(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}
