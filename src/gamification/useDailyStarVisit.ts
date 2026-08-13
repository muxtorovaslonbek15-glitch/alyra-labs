"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { useProgressStore } from "@/store/progressStore";
import { getAuthHeaders } from "@/lib/client/authHeaders";
import { nextDailyClaimState } from "@/lib/stars/dailyStar";
import { showToast } from "@/gamification/ToastHost";
import { track } from "@/lib/analytics/track";

const inFlight = new Set<string>();
const settled = new Set<string>();

/**
 * Signed-in visit (and optional tap) → at most one ★ per IST day.
 * Hits existing POST /api/daily-star. Guests are skipped. Ignore double-taps.
 */
export function requestDailyStarIfDue(): void {
  const { user, authReady } = useAuthStore.getState();
  if (!authReady || !user) return;
  const uid = user.uid;
  if (inFlight.has(uid) || settled.has(uid)) return;
  const lastDailyStarAt = useProgressStore.getState().lastDailyStarAt;
  if (!nextDailyClaimState(lastDailyStarAt, Date.now()).canClaim) {
    settled.add(uid);
    return;
  }

  inFlight.add(uid);
  void (async () => {
    try {
      const headers = await getAuthHeaders();
      if (!headers) return;
      const res = await fetch("/api/daily-star", {
        method: "POST",
        headers,
        body: "{}",
      });
      const data = (await res.json()) as {
        granted?: boolean;
        stars?: number;
        lastDailyStarAt?: number;
        error?: string;
      };
      if (!res.ok) return;
      settled.add(uid);
      if (typeof data.stars === "number") {
        useProgressStore.getState().setStarsFromServer({
          stars: data.stars,
          lastDailyStarAt: data.lastDailyStarAt,
        });
      }
      if (data.granted) {
        track("daily_star_claim", { stars: data.stars });
        showToast({
          title: "Welcome back · +1★",
          detail: "A star each day you return.",
        });
      }
    } catch {
      /* next mount / refresh retries */
    } finally {
      inFlight.delete(uid);
    }
  })();
}

export function useDailyStarVisit() {
  const user = useAuthStore((s) => s.user);
  const authReady = useAuthStore((s) => s.authReady);
  const lastDailyStarAt = useProgressStore((s) => s.lastDailyStarAt);

  useEffect(() => {
    requestDailyStarIfDue();
  }, [authReady, user, lastDailyStarAt]);
}
