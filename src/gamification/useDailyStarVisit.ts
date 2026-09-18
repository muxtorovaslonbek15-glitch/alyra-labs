"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { useProgressStore } from "@/store/progressStore";
import { nextDailyClaimState } from "@/lib/stars/dailyStar";
import { showToast } from "@/gamification/ToastHost";
import { track } from "@/lib/analytics/track";

const settled = new Set<string>();

/**
 * Ro'yxatdan o'tish olib tashlangani uchun kunlik ★ endi serverda emas,
 * brauzerda hisoblanadi: bir IST kunida ko'pi bilan bitta yulduz.
 */
export function requestDailyStarIfDue(): void {
  const { user } = useAuthStore.getState();
  if (!user) return;
  const uid = user.uid;
  if (settled.has(uid)) return;

  const now = Date.now();
  const lastDailyStarAt = useProgressStore.getState().lastDailyStarAt;
  if (!nextDailyClaimState(lastDailyStarAt, now).canClaim) {
    settled.add(uid);
    return;
  }

  settled.add(uid);
  const stars = useProgressStore.getState().stars + 1;
  useProgressStore.getState().setStarsFromServer({
    stars,
    lastDailyStarAt: now,
  });
  track("daily_star_claim", { stars });
  showToast({
    title: "Welcome back · +1★",
    detail: "A star each day you return.",
  });
}

export function useDailyStarVisit() {
  const user = useAuthStore((s) => s.user);
  const authReady = useAuthStore((s) => s.authReady);
  const lastDailyStarAt = useProgressStore((s) => s.lastDailyStarAt);

  useEffect(() => {
    requestDailyStarIfDue();
  }, [authReady, user, lastDailyStarAt]);
}
