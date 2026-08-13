import { describe, expect, it } from "vitest";
import {
  DEFAULT_STAR_MILESTONE_EMAIL,
  STAR_MILESTONE_COUNT,
  milestoneDismissKey,
  starMilestoneEmail,
  starMilestoneMailto,
} from "./milestone";

describe("star milestone", () => {
  it("defaults to Neil’s address and 30 ★", () => {
    expect(STAR_MILESTONE_COUNT).toBe(30);
    expect(starMilestoneEmail()).toBe(DEFAULT_STAR_MILESTONE_EMAIL);
    expect(DEFAULT_STAR_MILESTONE_EMAIL).toBe("ncarnac@gmail.com");
  });

  it("builds a mailto with Neil’s wording", () => {
    const href = starMilestoneMailto();
    expect(href.startsWith("mailto:ncarnac@gmail.com?")).toBe(true);
    expect(decodeURIComponent(href)).toContain("Have done 30! I will get a star.");
  });

  it("scopes dismiss per uid", () => {
    expect(milestoneDismissKey("abc")).toBe("alyra.starMilestoneDismissed:abc");
  });
});
