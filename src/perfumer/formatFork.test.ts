import { describe, expect, it } from "vitest";
import {
  inferFormatFromText,
  shouldAskFormatFork,
} from "./formatFork";

describe("format fork", () => {
  it("infers solid from balm / tin language", () => {
    expect(inferFormatFromText("I want a solid perfume for monsoon")).toBe("Solid");
    expect(inferFormatFromText("alcohol-free balm in a tin")).toBe("Solid");
  });

  it("infers liquid from EDP / spray", () => {
    expect(inferFormatFromText("make me an EDP for the office")).toBe("EDP");
    expect(inferFormatFromText("a citrus spray")).toBe("EDP");
  });

  it("asks once until answered, not every turn", () => {
    expect(
      shouldAskFormatFork({ formatChoice: null, userTexts: [] }),
    ).toBe(false);
    expect(
      shouldAskFormatFork({
        formatChoice: null,
        userTexts: ["something pretty for evenings"],
      }),
    ).toBe(true);
    expect(
      shouldAskFormatFork({
        formatChoice: "Solid",
        userTexts: ["something pretty", "warmer woods"],
      }),
    ).toBe(false);
    expect(
      shouldAskFormatFork({
        formatChoice: null,
        userTexts: ["solid perfume please"],
      }),
    ).toBe(false);
  });
});
