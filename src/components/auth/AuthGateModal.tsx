"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { track } from "@/lib/analytics/track";

/**
 * Guest soft-cap only (2 chemicals). Incomplete profile never traps Lab/Chat —
 * demographics live in Settings / soft prompts. Chat BYOK stays a separate gate.
 */
export function AuthGateModal() {
  const open = useAuthStore((s) => s.authGateOpen);
  const user = useAuthStore((s) => s.user);
  const guestChemicalAdds = useAuthStore((s) => s.guestChemicalAdds);
  const closeAuthGate = useAuthStore((s) => s.closeAuthGate);
  const primaryRef = useRef<HTMLAnchorElement>(null);

  const guestBlocked = !user && guestChemicalAdds >= 2;
  /** Profile incompleteness is not a Lab trap — dismissible only if opened explicitly. */
  const blocked = guestBlocked;
  const visible = open || blocked;

  useEffect(() => {
    if (!visible) return;
    // Signed-in: never keep a leftover profile wall open.
    if (user) {
      closeAuthGate();
      return;
    }
    track("auth_gate_shown", {
      guestBlocked,
      needsProfile: false,
    });
    primaryRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !blocked) closeAuthGate();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, blocked, guestBlocked, user, closeAuthGate]);

  if (!visible || user) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-lab-ink/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-gate-title"
      onClick={() => {
        if (!blocked) closeAuthGate();
      }}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-lab-line bg-lab-panel p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {!blocked ? (
          <button
            type="button"
            aria-label="Close"
            onClick={() => closeAuthGate()}
            className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-lg text-lab-muted hover:bg-lab-wash hover:text-lab-ink"
          >
            <span aria-hidden className="text-xl leading-none">
              ×
            </span>
          </button>
        ) : null}
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-lab-teal">
          Alyra Labs
        </p>
        <h2
          id="auth-gate-title"
          className="mt-1 font-display text-2xl text-lab-ink"
        >
          Save your discoveries
        </h2>
        <p className="mt-2 text-sm text-lab-muted">
          You&apos;ve added two chemicals. Log in or sign up to mix, react, and
          earn XP.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link
            ref={primaryRef}
            href="/signup"
            className="flex-1 rounded-lg bg-lab-teal px-3 py-2 text-center text-sm font-semibold text-white hover:bg-lab-teal/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lab-teal"
          >
            Sign up
          </Link>
          <Link
            href="/login"
            className="flex-1 rounded-lg border border-lab-line bg-white px-3 py-2 text-center text-sm font-semibold text-lab-ink hover:bg-lab-wash focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lab-teal"
          >
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
