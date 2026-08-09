"use client";

import type { ChatAgentMode } from "@/store/builderStore";

/** Cursor-like Plan | Agent segmented control — calm, compact. */
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
  const pad =
    size === "sm" ? "px-1 py-1 text-[10px]" : "px-1.5 py-1 text-[11px]";
  const width = size === "sm" ? "w-[6.75rem]" : "w-[7.5rem]";
  return (
    <div
      role="group"
      aria-label="Chat mode"
      className={`grid ${width} grid-cols-2 rounded-md border border-lab-line/70 bg-lab-wash/80 p-0.5`}
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
            className={`${pad} w-full rounded-[5px] text-center font-semibold tracking-wide transition ${
              active
                ? "bg-lab-ink text-lab-foam shadow-sm"
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
          className="min-h-7 rounded-md bg-lab-ink px-2 text-[10px] font-semibold text-lab-foam hover:bg-black"
        >
          Switch
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="min-h-7 rounded-md px-2 text-[10px] font-medium text-lab-muted hover:bg-white hover:text-lab-ink"
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
