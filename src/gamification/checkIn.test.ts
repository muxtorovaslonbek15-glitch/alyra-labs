import { describe, expect, it } from "vitest";
import {
  checkInAria,
  checkInCopy,
  checkInPresence,
  checkInShowsCount,
  idleStarCopyIsQuiet,
} from "./checkIn";
import { QUESTS } from "@/store/progressStore";

describe("★ check-in presence", () => {
  it("maps guest / not-yet / here-today", () => {
    expect(checkInPresence({ signedIn: false, grantedToday: false })).toBe(
      "guest",
    );
    expect(checkInPresence({ signedIn: false, grantedToday: true })).toBe(
      "guest",
    );
    expect(checkInPresence({ signedIn: true, grantedToday: false })).toBe(
      "not-yet",
    );
    expect(checkInPresence({ signedIn: true, grantedToday: true })).toBe(
      "here-today",
    );
  });

  it("never uses casino or Goals copy", () => {
    for (const presence of ["guest", "not-yet", "here-today"] as const) {
      const { title, subline } = checkInCopy(presence);
      const blob = `${title ?? ""} ${subline}`.toLowerCase();
      expect(blob).not.toMatch(/claim|streak|free-play|badge|goal|gas/);
      expect(blob).not.toMatch(/come back in/);
    }
    expect(checkInCopy("guest").subline).toBe(
      "Sign in to check in each day.",
    );
    expect(checkInCopy("not-yet").subline).toBe("A star when you return.");
    expect(checkInCopy("here-today")).toEqual({
      title: "Here today.",
      subline: "Another star tomorrow.",
    });
  });

  it("aria is check-in, not Open goals", () => {
    expect(checkInAria(0, "guest")).toBe("Stars, sign in to check in");
    expect(checkInAria(8, "not-yet")).toBe("8 stars, check in");
    expect(checkInAria(8, "here-today")).toBe("8 stars, here today");
    expect(checkInAria(8, "here-today").toLowerCase()).not.toMatch(/goal/);
  });

  it("hides a fake zero for guests", () => {
    expect(checkInShowsCount(0, "guest")).toBe(false);
    expect(checkInShowsCount(3, "guest")).toBe(true);
    expect(checkInShowsCount(0, "not-yet")).toBe(true);
    expect(checkInShowsCount(8, "here-today")).toBe(true);
  });

  it("idle ★ never greets with produce a gas or FREE-PLAY", () => {
    for (const presence of ["guest", "not-yet", "here-today"] as const) {
      const { title, subline } = checkInCopy(presence);
      const blob = `${title ?? ""} ${subline}`;
      expect(idleStarCopyIsQuiet(blob)).toBe(true);
      for (const q of QUESTS) {
        expect(blob.toLowerCase()).not.toContain(q.prompt.toLowerCase());
      }
    }
  });
});
