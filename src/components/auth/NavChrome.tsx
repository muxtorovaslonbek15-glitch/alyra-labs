"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { signOut } from "@/lib/firebase/auth";
import { labSound } from "@/desk/labSound";

export function NavChrome({ onDark = false }: { onDark?: boolean } = {}) {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const authReady = useAuthStore((s) => s.authReady);
  const [muted, setMuted] = useState(() => labSound.isMuted());
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  async function onLogout() {
    setMenuOpen(false);
    await signOut();
  }

  const linkOnBar = onDark
    ? "rounded-md px-2 py-1.5 font-semibold text-lab-foam/80 hover:bg-white/10 hover:text-lab-foam"
    : "rounded-md px-2 py-1.5 font-semibold text-lab-ink hover:bg-lab-wash";
  const mutedOnBar = onDark
    ? "rounded-md px-2 py-1 font-semibold text-lab-foam/55 hover:bg-white/10 hover:text-lab-foam"
    : "rounded-md px-2 py-1 font-semibold text-lab-muted hover:bg-lab-wash hover:text-lab-ink";
  const linkInMenu =
    "rounded-md px-2 py-1.5 font-semibold text-lab-ink hover:bg-lab-wash";
  const mutedInMenu =
    "rounded-md px-2 py-1.5 text-left font-semibold text-lab-muted hover:bg-lab-wash hover:text-lab-ink";

  const links = (inMenu: boolean) => (
    <>
      <Link
        href="/lab"
        onClick={() => setMenuOpen(false)}
        className={inMenu ? linkInMenu : linkOnBar}
      >
        Lab
      </Link>
      <Link
        href="/teacher"
        onClick={() => setMenuOpen(false)}
        className={inMenu ? linkInMenu : linkOnBar}
      >
        Teacher
      </Link>
      <Link
        href="/market"
        onClick={() => setMenuOpen(false)}
        className={inMenu ? linkInMenu : linkOnBar}
      >
        Market
      </Link>
      <Link
        href="/lab?tab=chat"
        onClick={() => setMenuOpen(false)}
        className={inMenu ? linkInMenu : linkOnBar}
      >
        Chat
      </Link>
      <Link
        href="/profile"
        onClick={() => setMenuOpen(false)}
        className={inMenu ? linkInMenu : linkOnBar}
      >
        Profile
      </Link>
    </>
  );

  return (
    <nav className="relative flex shrink-0 items-center gap-1 text-[11px] md:gap-1.5">
      <div className="hidden items-center gap-1 md:flex">{links(false)}</div>

      <button
        type="button"
        onClick={() => setMuted(labSound.toggleMute())}
        className={`hidden md:inline-flex ${mutedOnBar}`}
        aria-pressed={muted}
        aria-label={muted ? "Unmute lab sounds" : "Mute lab sounds"}
        title={muted ? "Unmute lab sounds" : "Mute lab sounds"}
      >
        {muted ? "Unmute" : "Mute"}
      </button>

      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        className={`flex h-9 w-9 items-center justify-center rounded-lg md:hidden ${
          onDark
            ? "border border-white/20 text-lab-foam"
            : "border border-lab-line/60 text-lab-ink"
        }`}
        aria-expanded={menuOpen}
        aria-label="Menu"
      >
        ☰
      </button>

      {menuOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[200] bg-transparent md:hidden"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute right-0 top-full z-[210] mt-1.5 flex w-44 flex-col rounded-xl border border-lab-line bg-lab-panel p-1.5 shadow-xl md:hidden">
            {links(true)}
            <button
              type="button"
              onClick={() => setMuted(labSound.toggleMute())}
              className={mutedInMenu}
            >
              {muted ? "Unmute" : "Mute"}
            </button>
            <div className="my-1 border-t border-lab-line/60" />
            {!authReady ? (
              <span className="px-2 py-1.5 text-lab-muted">…</span>
            ) : user ? (
              <button
                type="button"
                onClick={() => void onLogout()}
                className={mutedInMenu}
              >
                Log out
              </button>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className={mutedInMenu}
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-md bg-lab-ink px-2 py-1.5 font-semibold text-lab-foam"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </>
      ) : null}

      <div className="hidden items-center gap-1 md:flex">
        {!authReady ? (
          <span className={`px-2 py-1 ${onDark ? "text-lab-foam/50" : "text-lab-muted"}`}>
            …
          </span>
        ) : user ? (
          <>
            <span
              className={`hidden max-w-[7rem] truncate px-1 sm:inline ${
                onDark ? "text-lab-foam/55" : "text-lab-muted"
              }`}
            >
              {profile?.displayName || user.email}
            </span>
            <button
              type="button"
              onClick={() => void onLogout()}
              className={mutedOnBar}
            >
              Log out
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className={mutedOnBar}>
              Log in
            </Link>
            <Link
              href="/signup"
              className={
                onDark
                  ? "rounded-md bg-lab-foam px-2 py-1 font-semibold text-lab-ink hover:bg-white"
                  : "rounded-md bg-lab-teal px-2 py-1 font-semibold text-white hover:bg-lab-teal/90"
              }
            >
              Sign up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
