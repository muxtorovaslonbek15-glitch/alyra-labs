import { describe, expect, it } from "vitest";
import { firestoreUserToLab, labToFirestorePatch } from "./labMirror";

describe("labMirror", () => {
  it("maps Firestore users/{uid} into a lab profile", () => {
    const lab = firestoreUserToLab("uid_abc123", {
      email: "a@b.co",
      displayName: "Neil",
      phone: "9999999999",
      xp: 40,
      stars: 3,
      lastDailyStarAt: 1_700_000_000_000,
      discoveredIds: ["neutralization::hcl+naoh::salt"],
      badgeIds: ["first-neutralization"],
    });
    expect(lab.uid).toBe("uid_abc123");
    expect(lab.phone).toBe("9999999999");
    expect(lab.stars).toBe(3);
    expect(lab.lastDailyStarAt).toBe(1_700_000_000_000);
    expect(lab.discoveredIds).toHaveLength(1);
  });

  it("round-trips progress fields for dual-write", () => {
    const lab = firestoreUserToLab("uid_abc123", {
      email: "a@b.co",
      stars: 2,
      lastDailyStarAt: 99,
      xp: 10,
    });
    const patch = labToFirestorePatch(lab);
    expect(patch.stars).toBe(2);
    expect(patch.lastDailyStarAt).toBe(99);
    expect(patch.xp).toBe(10);
    expect(patch.email).toBe("a@b.co");
  });
});
