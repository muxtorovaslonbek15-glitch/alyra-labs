import { describe, expect, it } from "vitest";
import {
  calendarDayKey,
  msUntilNextCalendarDay,
  nextDailyClaimState,
} from "./dailyStar";

/** 2026-08-13 00:00:00 IST = 2026-08-12 18:30:00 UTC */
const IST_MIDNIGHT = Date.UTC(2026, 7, 12, 18, 30, 0);
/** 2026-08-13 23:00:00 IST */
const IST_23H = Date.UTC(2026, 7, 13, 17, 30, 0);
/** 2026-08-14 00:30:00 IST */
const NEXT_DAY = Date.UTC(2026, 7, 13, 19, 0, 0);

describe("dailyStar calendar (IST)", () => {
  it("formats YYYY-MM-DD in IST", () => {
    expect(calendarDayKey(IST_MIDNIGHT)).toBe("2026-08-13");
    expect(calendarDayKey(IST_23H)).toBe("2026-08-13");
    expect(calendarDayKey(NEXT_DAY)).toBe("2026-08-14");
  });

  it("grants on a new IST day even if 24h have not elapsed", () => {
    const claimedAt23 = IST_23H;
    const ninetyMinutesLater = NEXT_DAY;
    expect(ninetyMinutesLater - claimedAt23).toBeLessThan(24 * 60 * 60 * 1000);
    expect(nextDailyClaimState(claimedAt23, ninetyMinutesLater).canClaim).toBe(
      true,
    );
  });

  it("does not grant twice on the same IST day", () => {
    const morning = IST_MIDNIGHT + 3 * 60 * 60 * 1000;
    const evening = IST_23H;
    expect(nextDailyClaimState(morning, evening).canClaim).toBe(false);
    expect(nextDailyClaimState(morning, evening).dayKey).toBe("2026-08-13");
  });

  it("grants when never claimed", () => {
    expect(nextDailyClaimState(0, IST_MIDNIGHT).canClaim).toBe(true);
    expect(nextDailyClaimState(undefined, IST_MIDNIGHT).canClaim).toBe(true);
  });

  it("counts down to next IST midnight", () => {
    const oneHourBefore = IST_23H;
    const ms = msUntilNextCalendarDay(oneHourBefore);
    expect(ms).toBeGreaterThan(50 * 60 * 1000);
    expect(ms).toBeLessThanOrEqual(60 * 60 * 1000);
  });
});
