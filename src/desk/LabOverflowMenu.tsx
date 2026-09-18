"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { labSound } from "@/desk/labSound";
import { usePresence } from "@/animation/usePresence";

export type LabOverflowAction = {
  id: string;
  label: string;
  onClick?: () => void;
  href?: string;
  dividerBefore?: boolean;
};

/**
 * Single ⋯ menu for Lab — rehomes Profile, Mute, Market, Guide, Scan, etc.
 */
export function LabOverflowMenu({
  actions,
  onDark = true,
}: {
  actions: LabOverflowAction[];
  onDark?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { mounted, visible } = usePresence(open);
  const rootRef = useRef<HTMLDivElement>(null);
  const [muted, setMuted] = useState(() => labSound.isMuted());

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDoc);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [open]);

  const itemClass =
    "flex w-full items-center rounded-md px-2.5 py-2 text-left text-xs font-medium text-lab-ink outline-none hover:bg-lab-wash focus-visible:ring-1 focus-visible:ring-lab-line";

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="More"
        title="More"
        className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold leading-none outline-none focus-visible:ring-1 ${
          onDark
            ? "border border-white/20 text-lab-foam hover:bg-white/10 focus-visible:ring-white/35"
            : "border border-lab-line text-lab-ink hover:bg-lab-wash focus-visible:ring-lab-line"
        }`}
      >
        ⋯
      </button>
      {mounted ? (
        <div
          className={`lab-overlay-panel origin-top-right absolute right-0 top-full z-[220] mt-1.5 w-52 rounded-xl border border-lab-line bg-lab-panel p-1.5 shadow-xl ${
            visible ? "" : "pointer-events-none"
          }`}
          data-open={visible}
        >
          {actions.map((a) => (
            <div key={a.id}>
              {a.dividerBefore ? (
                <div className="my-1 border-t border-lab-line/60" />
              ) : null}
              {a.href ? (
                <Link
                  href={a.href}
                  className={itemClass}
                  onClick={() => setOpen(false)}
                >
                  {a.label}
                </Link>
              ) : (
                <button
                  type="button"
                  className={itemClass}
                  onClick={() => {
                    setOpen(false);
                    a.onClick?.();
                  }}
                >
                  {a.label}
                </button>
              )}
            </div>
          ))}

          <div className="my-1 border-t border-lab-line/60" />
          <button
            type="button"
            className={itemClass}
            onClick={() => {
              setMuted(labSound.toggleMute());
              setOpen(false);
            }}
          >
            {muted ? "Unmute" : "Mute"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Tiny spacer helper for overflow section labels (unused visually, typed for menus). */
export function OverflowSection({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
