import { describe, expect, it } from "vitest";
import {
  extractChatPrefSignals,
  formatPreferenceFromChoice,
  mergeSignalTexts,
} from "./profileSignals";

describe("chat pref signals", () => {
  it("extracts format, notes, occasion, climate from a brief", () => {
    const s = extractChatPrefSignals(
      "solid rose perfume for a Mumbai wedding in monsoon heat",
      { format: "Solid" },
    );
    expect(s.formatPreference).toBe("solid");
    expect(s.scentFamiliesLiked).toContain("floral");
    expect(s.occasionDefaults).toContain("wedding");
    expect(s.climateHint).toBe("hot_humid");
    expect(s.indiaCity).toBe("mumbai");
  });

  it("ignores key-shaped text", () => {
    expect(
      extractChatPrefSignals("here is gsk_abcdefghijklmnopqrstuvwxyz12"),
    ).toEqual({});
  });

  it("maps formatChoice without inventing city from IP", () => {
    expect(formatPreferenceFromChoice("EDP")).toBe("liquid");
    const s = extractChatPrefSignals("woody sandalwood for office");
    expect(s.indiaCity).toBeUndefined();
    expect(s.scentFamiliesLiked).toContain("woody");
    expect(s.occasionDefaults).toContain("office");
  });

  it("merges several user turns", () => {
    const s = mergeSignalTexts(
      ["something pretty", "vetiver for Delhi dry heat", "office daily"],
      "EDP",
    );
    expect(s.formatPreference).toBe("liquid");
    expect(s.climateHint).toBe("hot_dry");
    expect(s.indiaCity).toBe("delhi");
  });
});
