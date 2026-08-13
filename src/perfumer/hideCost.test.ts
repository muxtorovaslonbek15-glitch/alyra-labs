import { describe, expect, it } from "vitest";
import { looksLikeCostCopy, stripCostCopy } from "./hideCost";

describe("hideCost", () => {
  it("flags rupee, INR, and per-gram batch lines", () => {
    expect(looksLikeCostCopy("₹2,815")).toBe(true);
    expect(looksLikeCostCopy("totalCostInr 2815")).toBe(true);
    expect(looksLikeCostCopy("₹2,815 / 100g batch")).toBe(true);
    expect(looksLikeCostCopy("cost per gram")).toBe(true);
    expect(looksLikeCostCopy("Cost")).toBe(true);
    expect(looksLikeCostCopy("Cost estimate")).toBe(true);
    expect(looksLikeCostCopy("Bergamot 12% · heart")).toBe(false);
  });

  it("strips cost lines and keeps the rest", () => {
    expect(stripCostCopy("₹2,815 / 100g batch")).toBeNull();
    expect(
      stripCostCopy("Bergamot 12%\n₹420 trial\nJasmine 8%"),
    ).toBe("Bergamot 12%\nJasmine 8%");
    expect(
      stripCostCopy("Humid wedding floral. Trial ~ ₹420."),
    ).toBe("Humid wedding floral.");
  });
});
