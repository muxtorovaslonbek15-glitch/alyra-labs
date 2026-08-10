"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { QUESTS, useProgressStore } from "@/store/progressStore";
import { useGoalStore } from "@/store/goalStore";
import { useAuthStore } from "@/store/authStore";
import { getGoal } from "@/domains/chemistry/data/goals";
import { currentStep, goalProgressPct } from "@/goals/goalProgress";
import { labCopy } from "@/lab/labCopy";
import { getAuthHeaders } from "@/lib/client/authHeaders";
import { showToast } from "@/gamification/ToastHost";
import { track } from "@/lib/analytics/track";

/**
 * Compact XP chip + drawer. Replaces the full second toolbar on Lab.
 * Shop / Perfume / Market / Shelf / Goals live in Lab overflow — not here.
 */
export function GamificationBar({
  onOpenAtelier,
  onOpenShop,
  onOpenShelf,
  onOpenMarket,
}: {
  onOpenAtelier?: () => void;
  onOpenShop?: () => void;
  onOpenShelf?: () => void;
  onOpenMarket?: () => void;
} = {}) {
  const xp = useProgressStore((s) => s.xp);
  const stars = useProgressStore((s) => s.stars);
  const lastDailyStarAt = useProgressStore((s) => s.lastDailyStarAt);
  const setStarsFromServer = useProgressStore((s) => s.setStarsFromServer);
  const journal = useProgressStore((s) => s.journal);
  const badges = useProgressStore((s) => s.badges);
  const questIndex = useProgressStore((s) => s.questIndex);
  const xpLevel = useProgressStore((s) => s.xpLevel);
  const quest = QUESTS[questIndex % QUESTS.length];
  const earnedBadges = badges.filter((b) => b.earnedAt);
  const nextBadge = badges.find((b) => !b.earnedAt);
  const { level, intoLevel, toNext } = xpLevel();
  const [claiming, setClaiming] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const user = useAuthStore((s) => s.user);
  const guestChemicalAdds = useAuthStore((s) => s.guestChemicalAdds);
  const guestWarn = !user && guestChemicalAdds === 1;
  const guestBlocked = !user && guestChemicalAdds >= 2;

  const activeGoalId = useGoalStore((s) => s.activeGoalId);
  const completedStepIds = useGoalStore((s) => s.completedStepIds);
  const setPickerOpen = useGoalStore((s) => s.setPickerOpen);
  const setGuideOpen = useGoalStore((s) => s.setGuideOpen);

  const goal = activeGoalId ? getGoal(activeGoalId) : undefined;
  const step = goal ? currentStep(goal, completedStepIds) : null;
  const pct = goal ? goalProgressPct(goal, completedStepIds) : 0;

  const canClaimDaily =
    !lastDailyStarAt || Date.now() - lastDailyStarAt >= 24 * 60 * 60 * 1000;

  useEffect(() => {
    if (!drawerOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false);
    }
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setDrawerOpen(false);
    }
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDoc);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [drawerOpen]);

  async function claimDaily() {
    if (!user) {
      showToast({
        title: "Sign in for daily ★",
        detail: "Daily stars need an account.",
      });
      return;
    }
    if (!canClaimDaily || claiming) return;
    setClaiming(true);
    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        showToast({
          title: "Sign in for daily ★",
          detail: "Session expired — log in again to claim.",
        });
        return;
      }
      const res = await fetch("/api/daily-star", {
        method: "POST",
        headers,
        body: "{}",
      });
      const data = (await res.json()) as {
        granted?: boolean;
        stars?: number;
        lastDailyStarAt?: number;
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        showToast({
          title: res.status === 401 ? "Sign in for daily ★" : "Claim failed",
          detail: data.error ?? data.message ?? "Try again shortly",
        });
        return;
      }
      if (typeof data.stars === "number") {
        setStarsFromServer({
          stars: data.stars,
          lastDailyStarAt: data.lastDailyStarAt,
        });
      }
      if (data.granted) {
        track("daily_star_claim", { stars: data.stars });
      }
      showToast({
        title: data.granted ? "+1★ Daily check-in" : "Already claimed",
        detail: data.message ?? "",
      });
    } catch {
      showToast({ title: "Claim failed", detail: "Try again shortly" });
    } finally {
      setClaiming(false);
    }
  }

  // Keep callbacks typed for LabShell callers; surface via drawer shortcuts.
  void onOpenAtelier;
  void onOpenShop;
  void onOpenShelf;
  void onOpenMarket;

  return (
    <div ref={rootRef} className="relative shrink-0">
      {guestWarn ? (
        <div className="fixed left-0 right-0 top-0 z-[300] bg-lab-amber/90 px-3 py-1 text-center text-[11px] font-semibold text-lab-ink md:px-4">
          {labCopy.guestBannerWarn}{" "}
          <Link href="/signup" className="underline">
            Sign up
          </Link>
        </div>
      ) : null}
      {guestBlocked ? (
        <div className="fixed left-0 right-0 top-0 z-[300] bg-lab-teal px-3 py-1 text-center text-[11px] font-semibold text-white md:px-4">
          {labCopy.guestBannerBlocked}{" "}
          <Link href="/signup" className="underline">
            Create account
          </Link>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setDrawerOpen((v) => !v)}
        aria-expanded={drawerOpen}
        aria-label="Progress"
        title="Progress"
        className="flex h-8 items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2 text-lab-foam hover:bg-white/10"
      >
        <span className="text-[9px] font-semibold uppercase leading-none tracking-[0.1em] text-lab-foam/55">
          Lv {level}
        </span>
        <span className="font-display text-xs leading-none text-lab-foam">
          {xp}
        </span>
        <span className="text-[9px] leading-none text-lab-foam/50">XP</span>
        <span className="font-display text-xs leading-none text-lab-amber">
          {stars}
        </span>
        <span className="text-[9px] leading-none text-lab-amber/80">★</span>
      </button>

      {drawerOpen ? (
        <div className="absolute right-0 top-full z-[220] mt-1.5 w-[min(20rem,calc(100vw-1.5rem))] rounded-xl border border-lab-line bg-lab-panel p-3 text-lab-ink shadow-xl">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-lab-muted">
                Level {level}
              </p>
              <p className="mt-0.5 font-display text-xl text-lab-ink">{xp} XP</p>
            </div>
            <p className="font-display text-lg text-lab-amber">{stars} ★</p>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-lab-line/70">
            <div
              role="progressbar"
              aria-valuenow={intoLevel}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-full rounded-full bg-lab-ink"
              style={{ width: `${intoLevel}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-lab-muted">
            {toNext} to next level
            {nextBadge ? ` · next: ${nextBadge.title}` : ""}
          </p>

          <div className="mt-3 border-t border-lab-line/60 pt-3">
            {goal ? (
              <button
                type="button"
                className="w-full text-left"
                onClick={() => {
                  setDrawerOpen(false);
                  setGuideOpen(true);
                }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-lab-muted">
                  Goal · {pct}%
                </p>
                <p className="mt-0.5 text-sm text-lab-ink">
                  {goal.icon} {goal.title}
                  {step ? ` — ${step.title}` : " — complete!"}
                </p>
              </button>
            ) : (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-lab-muted">
                  Free-play
                </p>
                <p className="mt-0.5 text-sm text-lab-ink">{quest?.prompt}</p>
              </>
            )}
          </div>

          <div className="mt-3 flex items-center gap-1.5">
            {badges.slice(0, 8).map((b) => (
              <span
                key={b.id}
                className={`inline-block h-2 w-2 rounded-full ${
                  b.earnedAt ? "bg-lab-amber" : "bg-lab-line"
                }`}
                title={b.earnedAt ? b.title : `Locked: ${b.title}`}
              />
            ))}
            <span className="ml-1 text-[11px] text-lab-muted">
              {earnedBadges.length} badges · {journal.length} logged
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void claimDaily()}
              disabled={claiming || (Boolean(user) && !canClaimDaily)}
              className="min-h-9 rounded-md border border-lab-amber/50 px-3 text-xs font-semibold text-lab-amber hover:bg-lab-amber/10 disabled:opacity-40"
            >
              {canClaimDaily ? "Daily ★" : "★ claimed"}
            </button>
            <button
              type="button"
              onClick={() => {
                setDrawerOpen(false);
                setPickerOpen(true);
              }}
              className="min-h-9 rounded-md bg-lab-ink px-3 text-xs font-semibold text-lab-foam"
            >
              Goals
            </button>
            {onOpenAtelier ? (
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  onOpenAtelier();
                }}
                className="min-h-9 rounded-md border border-lab-line px-3 text-xs font-medium text-lab-ink hover:bg-lab-wash"
              >
                Perfume
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function RecipeJournal() {
  const [open, setOpen] = useState(false);
  const journal = useProgressStore((s) => s.journal);
  const badges = useProgressStore((s) => s.badges);
  const earned = badges.filter((b) => b.earnedAt);

  return (
    <div className="border-t border-lab-line/50 bg-lab-panel/95">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs text-lab-ink hover:bg-lab-wash/50"
      >
        <span className="font-medium">
          Recipe log & badges
          <span className="ml-1.5 text-[10px] font-normal text-lab-muted">
            {journal.length} discoveries · {earned.length} badges
          </span>
        </span>
        <span className="text-lab-muted">{open ? "▾" : "▴"}</span>
      </button>
      {open ? (
        <div className="grid max-h-40 grid-cols-1 gap-3 overflow-hidden border-t border-lab-line/40 px-3 py-2 sm:grid-cols-2">
          <div className="scroll-thin min-h-0 overflow-y-auto">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-lab-muted">
              Equations found
            </p>
            <ul className="mt-1.5 space-y-1">
              {journal.length === 0 ? (
                <li className="text-xs text-lab-muted">
                  Mix something new to fill this log.
                </li>
              ) : (
                journal.slice(0, 10).map((e) => (
                  <li
                    key={`${e.discoveryId}-${e.at}`}
                    className={`truncate font-mono text-[11px] ${
                      e.ok ? "text-lab-ink" : "text-lab-hazard"
                    }`}
                  >
                    {e.label}
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="scroll-thin min-h-0 overflow-y-auto">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-lab-muted">
              Badges (earned first)
            </p>
            <ul className="mt-1.5 space-y-1.5">
              {[...earned, ...badges.filter((b) => !b.earnedAt)]
                .slice(0, 24)
                .map((b) => (
                  <li
                    key={b.id}
                    className={`text-xs ${
                      b.earnedAt ? "text-lab-teal" : "text-lab-muted/65"
                    }`}
                  >
                    <span className="mr-1.5">{b.earnedAt ? "●" : "○"}</span>
                    {b.title}
                    <span className="ml-1 text-[10px] text-lab-muted">
                      — {b.description}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
