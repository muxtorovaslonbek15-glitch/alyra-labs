import { describe, expect, it } from "vitest";
import {
  SOLID_PERFUME_FORMULAS,
  SOLID_PERFUME_DISCLAIMER,
  playableSolidPerfumeFormulas,
  getSolidPerfumeFormula,
  indiaSolidPerfumeFormulas,
} from "./index";

describe("solid perfume teaching catalog", () => {
  it("seeds dozens of sourced formulas", () => {
    expect(SOLID_PERFUME_FORMULAS.length).toBeGreaterThanOrEqual(36);
    expect(playableSolidPerfumeFormulas().length).toBeGreaterThanOrEqual(24);
    expect(indiaSolidPerfumeFormulas().length).toBeGreaterThanOrEqual(8);
  });

  it("cites sources and carries the shared disclaimer", () => {
    for (const f of SOLID_PERFUME_FORMULAS) {
      expect(f.sources.length).toBeGreaterThan(0);
      expect(f.sources.every((s) => s.url.startsWith("http"))).toBe(true);
      expect(f.disclaimer).toContain("Not medical");
      expect(f.disclaimer).toContain("Not an Alyra SKU");
      expect(f.steps.length).toBeGreaterThanOrEqual(4);
      expect(f.chassis.waxPercent + f.chassis.oilPercent + f.chassis.fragranceLoadPercent).toBeGreaterThan(
        90,
      );
    }
    expect(SOLID_PERFUME_DISCLAIMER).toMatch(/IFRA/);
  });

  it("does not invent Alyra compact SKUs as formula ids", () => {
    const blob = SOLID_PERFUME_FORMULAS.map((f) => f.id + f.title).join(" ");
    expect(blob.toLowerCase()).not.toMatch(/fruit-d.?amour|riva-azul|ecos-de-lisboa/);
    expect(getSolidPerfumeFormula("solid-gilbert-classic")?.playable).toBe(true);
  });
});
