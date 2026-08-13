"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { MOTION_MS, motionMs } from "@/animation/motion";
import { composeOverlayOpen, costumeFadeClass } from "@/animation/CostumeLayer";
import { usePresence } from "@/animation/usePresence";
import { useProgressStore } from "@/store/progressStore";
import { useAuthStore } from "@/store/authStore";
import { nextDailyClaimState } from "@/lib/stars/dailyStar";
import {
  requestDailyStarIfDue,
  useDailyStarVisit,
} from "@/gamification/useDailyStarVisit";
import {
  checkInAria,
  checkInCopy,
  checkInPresence,
  checkInShowsCount,
} from "@/gamification/checkIn";
import { useWearStore } from "@/wear/wearStore";
import { getHouseSku, OCCASION_CHIPS } from "@/wear/houseSkus";
import {
  STAR_MILESTONE_COUNT,
  milestoneDismissKey,
  starMilestoneMailto,
} from "@/lib/stars/milestone";
import { track } from "@/lib/analytics/track";

/**
 * Compact ★ check-in chip + ledger. XP stays off chrome.
 * Wear and Compose never open Goals / FREE-PLAY / badges from this chip.
 */
export function GamificationBar() {
  useDailyStarVisit();

  const stars = useProgressStore((s) => s.stars);
  const lastDailyStarAt = useProgressStore((s) => s.lastDailyStarAt);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [popoverShown, setPopoverShown] = useState(false);
  const [milestoneDismissed, setMilestoneDismissed] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  const user = useAuthStore((s) => s.user);
  const isWear = useWearStore((s) => s.audience === "owner");
  const skuId = useWearStore((s) => s.skuId);
  const occasion = useWearStore((s) => s.occasion);

  const daily = nextDailyClaimState(lastDailyStarAt, Date.now());
  const presence = checkInPresence({
    signedIn: Boolean(user),
    grantedToday: Boolean(user) && !daily.canClaim,
  });
  const copy = checkInCopy(presence);
  const showCount = checkInShowsCount(stars, presence);
  const pendingRing = presence === "not-yet";

  const sku = isWear ? getHouseSku(skuId) : null;
  const showSkuName = Boolean(
    isWear && sku && skuId && skuId !== "generic",
  );
  const occasionLabel = occasion
    ? OCCASION_CHIPS.find((c) => c.id === occasion)?.label
    : null;

  const milestoneEligible = Boolean(user) && stars >= STAR_MILESTONE_COUNT;
  const showMilestoneRow = milestoneEligible && !milestoneDismissed;

  useEffect(() => {
    if (!user) {
      setMilestoneDismissed(true);
      return;
    }
    try {
      setMilestoneDismissed(
        window.localStorage.getItem(milestoneDismissKey(user.uid)) === "1",
      );
    } catch {
      setMilestoneDismissed(false);
    }
  }, [user, stars]);

  useEffect(() => {
    if (drawerOpen) {
      if (closeTimerRef.current != null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setPopoverShown(true);
      return;
    }
    if (!popoverShown) return;
    closeTimerRef.current = window.setTimeout(() => {
      setPopoverShown(false);
      closeTimerRef.current = null;
    }, motionMs(MOTION_MS.checkIn));
    return () => {
      if (closeTimerRef.current != null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [drawerOpen, popoverShown]);

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

  function onChip() {
    if (presence === "not-yet") requestDailyStarIfDue();
    if (drawerOpen) {
      setDrawerOpen(false);
      return;
    }
    setPopoverShown(true);
    setDrawerOpen(true);
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={onChip}
        aria-expanded={drawerOpen}
        aria-label={checkInAria(stars, presence)}
        title={showCount ? `${stars} ★` : "★"}
        className={`relative flex h-8 items-center gap-1 rounded-lg border px-2 text-lab-foam outline-none hover:bg-white/10 focus-visible:ring-1 focus-visible:ring-white/35 ${
          pendingRing
            ? "border-lab-glass/60 bg-white/5 ring-1 ring-lab-glass/40 motion-reduce:ring-0"
            : "border-white/15 bg-white/5"
        }`}
      >
        <span
          className="pointer-events-none absolute -inset-y-1.5 -inset-x-1.5 md:hidden"
          aria-hidden
        />
        {showCount ? (
          <span className="font-display text-xs leading-none text-lab-amber">
            {stars}
          </span>
        ) : null}
        <span className="text-[9px] leading-none text-lab-amber/80">★</span>
      </button>

      {popoverShown ? (
        <div
          className={`absolute right-0 top-full z-[220] mt-1.5 w-[min(20rem,calc(100vw-1.5rem))] rounded-xl border border-lab-line bg-lab-panel p-3 text-lab-ink shadow-xl ${
            drawerOpen ? "lab-checkin-in" : "lab-checkin-out"
          }`}
        >
          <p className="font-display text-lg text-lab-amber">
            {showCount ? `${stars} ★` : "★"}
          </p>
          {copy.title ? (
            <p className="mt-1 text-sm font-medium text-lab-ink">{copy.title}</p>
          ) : null}
          <p
            className={`text-[11px] text-lab-muted ${copy.title ? "mt-0.5" : "mt-1"}`}
          >
            {copy.subline}
          </p>

          {showSkuName && sku ? (
            <div className="mt-3 border-t border-lab-line/60 pt-3">
              <p className="font-display text-base tracking-display text-lab-ink">
                {sku.name}
              </p>
              {occasionLabel ? (
                <p className="mt-0.5 text-[11px] text-lab-muted">
                  {occasionLabel}
                </p>
              ) : null}
            </div>
          ) : null}

          {presence === "guest" ? (
            <Link
              href="/login"
              className="mt-3 flex min-h-9 items-center justify-center rounded-md bg-lab-ink px-3 text-xs font-semibold text-lab-foam"
            >
              Sign in
            </Link>
          ) : null}

          {showMilestoneRow && user ? (
            <div className="mt-3 border-t border-lab-line/60 pt-3">
              <p className="text-[11px] text-lab-muted">
                Have done 30. I will get a star.
              </p>
              <a
                href={starMilestoneMailto()}
                className="mt-1.5 inline-flex min-h-9 items-center text-xs font-semibold text-lab-ink underline decoration-lab-line underline-offset-2 hover:text-lab-ink"
                onClick={() => {
                  track("star_milestone_mailto", { stars });
                }}
              >
                Write Neil
              </a>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function RecipeJournal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const journal = useProgressStore((s) => s.journal);
  const badges = useProgressStore((s) => s.badges);
  const earned = badges.filter((b) => b.earnedAt);
  const isWear = useWearStore((s) => s.audience === "owner");
  const live = composeOverlayOpen(isWear, open);
  const { mounted, visible } = usePresence(live, MOTION_MS.crossfade);

  useEffect(() => {
    if (!live) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [live, onClose]);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={costumeFadeClass(
        visible,
        "fixed inset-0 z-[220] flex items-end justify-center p-3 md:items-start md:justify-end md:pt-14 md:pr-4",
      )}
    >
      <button
        type="button"
        className="absolute inset-0 bg-lab-ink/35"
        aria-label="Close recipe log"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg rounded-xl border border-lab-line bg-lab-panel p-3 text-lab-ink shadow-xl">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-label text-lab-muted">
              Journal
            </p>
            <h2 className="font-display text-lg tracking-display text-lab-ink">
              Recipe log
            </h2>
            <p className="mt-0.5 text-[11px] text-lab-muted">
              {journal.length} discoveries · {earned.length} badges
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 items-center rounded-lg bg-lab-ink px-3 text-xs font-semibold text-lab-foam outline-none focus-visible:ring-1 focus-visible:ring-lab-line"
          >
            Done
          </button>
        </div>
        <div className="mt-3 grid max-h-[min(50dvh,22rem)] grid-cols-1 gap-3 overflow-hidden sm:grid-cols-2">
          <div className="scroll-thin min-h-0 overflow-y-auto">
            <p className="text-[10px] font-semibold uppercase tracking-label text-lab-muted">
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
            <p className="text-[10px] font-semibold uppercase tracking-label text-lab-muted">
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
                      {b.description}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
