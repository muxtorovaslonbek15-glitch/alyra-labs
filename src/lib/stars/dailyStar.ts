/**
 * Daily ★ is one grant per IST calendar day, per Firebase uid.
 * Canonical store: MySQL `alyra_lab_users` + `alyra_lab_daily_stars`
 * (unique uid + IST YYYY-MM-DD). Firestore `users/{uid}` is dual-write only.
 */

export const DAILY_STAR_TZ = "Asia/Kolkata";

/** IST is UTC+5:30, no DST. */
export const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const DAY_MS = 86_400_000;

export function calendarDayKey(
  nowMs: number,
  timeZone: string = DAILY_STAR_TZ,
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(nowMs));
}

export function msUntilNextCalendarDay(nowMs: number): number {
  const shifted = nowMs + IST_OFFSET_MS;
  const msIntoIstDay = ((shifted % DAY_MS) + DAY_MS) % DAY_MS;
  return DAY_MS - msIntoIstDay;
}

export function nextDailyClaimState(
  lastDailyStarAt: number | undefined,
  now: number,
): { canClaim: boolean; nextClaimInMs: number; dayKey: string } {
  const dayKey = calendarDayKey(now);
  if (!lastDailyStarAt || lastDailyStarAt <= 0) {
    return { canClaim: true, nextClaimInMs: 0, dayKey };
  }
  const lastDay = calendarDayKey(lastDailyStarAt);
  if (lastDay === dayKey) {
    return {
      canClaim: false,
      nextClaimInMs: msUntilNextCalendarDay(now),
      dayKey,
    };
  }
  return { canClaim: true, nextClaimInMs: 0, dayKey };
}
