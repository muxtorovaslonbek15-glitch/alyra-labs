"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { signOut } from "@/lib/firebase/auth";
import { labSound } from "@/desk/labSound";

export type LabOverflowAction = {
  id: string;
  label: string;
  onClick?: () => void;
  href?: string;
  dividerBefore?: boolean;
};

/**
 * Single ⋯ menu for Lab — rehomes Profile, Mute, Teacher, Market, Guide, Scan, etc.
 */
export function LabOverflowMenu({
  actions,
  onDark = true,
}: {
  actions: LabOverflowAction[];
  onDark?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const authReady = useAuthStore((s) => s.authReady);
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
    "flex w-full items-center rounded-md px-2.5 py-2 text-left text-xs font-medium text-lab-ink hover:bg-lab-wash";

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="More"
        title="More"
        className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold ${
          onDark
            ? "border border-white/20 text-lab-foam hover:bg-white/10"
            : "border border-lab-line text-lab-ink hover:bg-lab-wash"
        }`}
      >
        ⋯
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-[220] mt-1.5 w-52 rounded-xl border border-lab-line bg-lab-panel p-1.5 shadow-xl">
          {authReady && user ? (
            <p className="truncate px-2.5 py-1.5 text-[11px] text-lab-muted">
              {profile?.displayName || user.email}
            </p>
          ) : null}

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
          {!authReady ? (
            <span className="px-2.5 py-2 text-xs text-lab-muted">…</span>
          ) : user ? (
            <button
              type="button"
              className={itemClass}
              onClick={() => {
                setOpen(false);
                void signOut();
              }}
            >
              Log out
            </button>
          ) : (
            <>
              <Link
                href="/login"
                className={itemClass}
                onClick={() => setOpen(false)}
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="mt-0.5 flex w-full items-center justify-center rounded-md bg-lab-ink px-2.5 py-2 text-xs font-semibold text-lab-foam"
                onClick={() => setOpen(false)}
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function LabModeToggle({
  value,
  onChange,
  showScan,
  scanActive,
  onToggleScan,
}: {
  value: "tutor" | "chat";
  onChange: (v: "tutor" | "chat") => void;
  showScan?: boolean;
  scanActive?: boolean;
  onToggleScan?: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex rounded-lg bg-white/10 p-0.5">
        {(
          [
            ["tutor", "Tutor"],
            ["chat", "Chat"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-pressed={value === id && !scanActive}
            className={`min-h-9 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition md:min-h-0 md:py-1 ${
              value === id && !scanActive
                ? "bg-lab-foam text-lab-ink shadow-sm"
                : "text-lab-foam/65 hover:text-lab-foam"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {showScan && onToggleScan ? (
        <button
          type="button"
          onClick={onToggleScan}
          aria-pressed={scanActive}
          title="Scan formula"
          className={`flex h-9 w-9 items-center justify-center rounded-lg border text-[11px] font-semibold md:h-8 md:w-8 ${
            scanActive
              ? "border-lab-foam bg-lab-foam text-lab-ink"
              : "border-white/20 text-lab-foam/70 hover:bg-white/10 hover:text-lab-foam"
          }`}
        >
          Scan
        </button>
      ) : null}
    </div>
  );
}

/** Tiny spacer helper for overflow section labels (unused visually, typed for menus). */
export function OverflowSection({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
