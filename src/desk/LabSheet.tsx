"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Phone-only bottom sheet for Lab (`md:hidden`).
 * Matches DESIGN.md: grabber + title + Done, safe-area, internal scroll only.
 * Closable desktop rails must never use this — rails stay `hidden md:flex`.
 */
export function LabSheet({
  open,
  onClose,
  title,
  eyebrow,
  labelledBy,
  children,
  footer,
  maxHeightClass = "max-h-[88dvh]",
  zClass = "z-[280]",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  labelledBy?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxHeightClass?: string;
  zClass?: string;
}) {
  const titleId = labelledBy || "lab-sheet-title";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`fixed inset-0 flex flex-col justify-end md:hidden ${zClass}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-lab-ink/45"
        aria-label={`Close ${title}`}
        onClick={onClose}
      />
      <div
        className={`relative flex ${maxHeightClass} w-full flex-col rounded-t-2xl border border-lab-line bg-lab-panel pb-[env(safe-area-inset-bottom,0px)] shadow-2xl`}
      >
        <div className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-lab-line" />
        <div className="flex items-center justify-between gap-3 border-b border-lab-line/50 px-4 py-3">
          <div className="min-w-0">
            {eyebrow ? (
              <p className="font-display text-[10px] uppercase tracking-[0.2em] text-lab-muted">
                {eyebrow}
              </p>
            ) : null}
            <h2
              id={titleId}
              className="font-display text-lg leading-tight text-lab-ink"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 shrink-0 rounded-lg bg-lab-ink px-3 text-xs font-semibold text-lab-foam"
          >
            Done
          </button>
        </div>
        <div className="scroll-thin flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-lab-line/60 bg-lab-panel">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
