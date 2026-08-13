import { describe, expect, it } from "vitest";
import { buildSlotOrder, filledSlotsFromProfile, skipFormat, shouldCompose } from "./flow";
import { answersToProfilePatch, canPutInterviewPrefs } from "./persist";
import { buildCannedReveal, revealHasForbidden } from "./reveal";
import { extractAnswersFromText, looksLikeSkip } from "./extract";
import type { InterviewSlot } from "./types";

describe("interview skip logic", () => {
  it("skips format on Wear when a house SKU is on the desk", () => {
    expect(skipFormat("wear", "fruit-damour")).toBe(true);
    expect(skipFormat("wear", "generic")).toBe(true);
    expect(skipFormat("compose", "fruit-damour")).toBe(false);
    expect(skipFormat("wear", null)).toBe(false);

    const order = buildSlotOrder({
      seed: 1,
      surface: "wear",
      skuId: "fruit-damour",
      profileFilled: new Set(),
      sessionFilled: new Set(),
    });
    expect(order.includes("format")).toBe(false);
    expect(order.length).toBeGreaterThanOrEqual(6);
  });

  it("skips slots already on a consented profile", () => {
    const filled = filledSlotsFromProfile({
      consentPersonalization: true,
      occasionDefaults: ["office"],
      indiaCity: "mumbai",
      climateHint: "hot_humid",
      scentFamiliesLiked: ["citrus"],
    });
    expect(filled.has("occasion")).toBe(true);
    expect(filled.has("climate_city")).toBe(true);
    expect(filled.has("likes")).toBe(true);
    expect(
      filledSlotsFromProfile({
        consentPersonalization: false,
        occasionDefaults: ["office"],
      }).size,
    ).toBe(0);

    const order = buildSlotOrder({
      seed: 9,
      surface: "compose",
      profileFilled: filled,
      sessionFilled: new Set(),
    });
    expect(order.includes("occasion")).toBe(false);
    expect(order.includes("climate_city")).toBe(false);
    expect(order.includes("likes")).toBe(false);
  });
});

describe("interview variation", () => {
  it("does not freeze Occasion → City → Skin as the only order", () => {
    const orders = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const order = buildSlotOrder({
        seed,
        surface: "compose",
        profileFilled: new Set(),
        sessionFilled: new Set(),
        now: new Date("2026-08-13T04:00:00Z"),
      });
      orders.add(order.slice(0, 3).join(">"));
    }
    expect(orders.size).toBeGreaterThan(1);
    const alwaysOccasionCitySkin = [...orders].every((o) =>
      o.startsWith("occasion>climate_city>skin"),
    );
    expect(alwaysOccasionCitySkin).toBe(false);
  });
});

describe("consent gate", () => {
  it("does not PUT when chat learning is off", () => {
    expect(
      canPutInterviewPrefs({
        consentPersonalization: true,
        consentChatLearning: false,
      }),
    ).toBe(false);
    expect(
      canPutInterviewPrefs({
        consentPersonalization: false,
        consentChatLearning: true,
      }),
    ).toBe(false);
    expect(
      canPutInterviewPrefs({
        consentPersonalization: true,
        consentChatLearning: true,
      }),
    ).toBe(true);
  });

  it("maps slots to prefs and never writes budget or secrets", () => {
    const patch = answersToProfilePatch({
      occasion: "office",
      indiaCity: "mumbai",
      climateHint: "hot_humid",
      intensityPreference: "close",
      scentFamiliesLiked: ["citrus"],
      formatPreference: "press_tin",
      timeOfDayDefaults: ["morning"],
    });
    expect(patch.indiaCity).toBe("mumbai");
    expect(patch.intensityPreference).toBe("close");
    expect(patch.formatPreference).toBe("press_tin");
    expect(patch.timeOfDayDefaults).toEqual(["morning"]);
    expect(patch.budgetBand).toBeUndefined();
    expect(patch.ageBand).toBeUndefined();
    expect("apiKey" in patch).toBe(false);
  });
});

describe("RevealCard payload", () => {
  it("has no cost keys and no Galaxolide / ₹ / IFRA", () => {
    const card = buildCannedReveal({
      answers: {
        occasion: "wedding",
        indiaCity: "mumbai",
        climateHint: "hot_humid",
        intensityPreference: "close",
        scentFamiliesLiked: ["floral", "fruity"],
        formatPreference: "press_tin",
      },
      skuId: "fruit-damour",
      seed: 3,
    });
    expect(card.name).toMatch(/Fruit d’Amour/);
    expect(card.notes.brightness.length).toBeGreaterThan(0);
    expect(card.vibe.length).toBeGreaterThan(20);
    expect(card.feel.toLowerCase()).toMatch(/press|balm|skin|heat|humid/);
    expect(revealHasForbidden(card)).toBe(false);
    expect(card).not.toHaveProperty("cost");
    expect(card).not.toHaveProperty("totalCostInr");
    expect(JSON.stringify(card)).not.toMatch(/Galaxolide|HHCB|₹|IFRA/i);
  });

  it("does not always name a Compose reveal Fruit d’Amour", () => {
    const names = new Set<string>();
    for (const fam of ["citrus", "woody", "musk", "oud"] as const) {
      names.add(
        buildCannedReveal({
          answers: {
            occasion: "office",
            climateHint: "hot_humid",
            scentFamiliesLiked: [fam],
            formatPreference: "solid",
          },
          skuId: "generic",
          seed: hashish(fam),
        }).name,
      );
    }
    expect(names.size).toBeGreaterThan(1);
  });
});

describe("extract", () => {
  it("fills several slots from one paragraph and treats skip as compose", () => {
    const a = extractAnswersFromText(
      "Office in Mumbai monsoon, close to skin, I love sandal and citrus, skip the sweet stuff",
    );
    expect(a.occasion).toBe("office");
    expect(a.indiaCity).toBe("mumbai");
    expect(a.climateHint).toBe("hot_humid");
    expect(a.intensityPreference).toBe("close");
    expect(a.scentFamiliesLiked).toEqual(expect.arrayContaining(["woody", "citrus"]));
    expect(looksLikeSkip("just make me something")).toBe(true);
  });
});

describe("compose exit", () => {
  it("composes after six session answers or an empty remaining queue", () => {
    expect(
      shouldCompose({
        answers: { occasion: "office" },
        questionCount: 6,
        skipRequested: false,
        sessionAnswered: 6,
        remaining: 2,
      }),
    ).toBe(true);
    expect(
      shouldCompose({
        answers: {},
        questionCount: 2,
        skipRequested: false,
        sessionAnswered: 2,
        remaining: 5,
      }),
    ).toBe(false);
    expect(
      shouldCompose({
        answers: {},
        questionCount: 1,
        skipRequested: false,
        sessionAnswered: 1,
        remaining: 0,
      }),
    ).toBe(true);
  });
});

function hashish(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

void (null as unknown as InterviewSlot);
