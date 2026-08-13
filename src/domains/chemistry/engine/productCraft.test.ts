import { describe, expect, it } from "vitest";
import { tryProductCraft } from "@/domains/chemistry/engine/productCraft";
import { resolveChemistry } from "@/domains/chemistry/engine/resolve";
import { getChemical } from "@/domains/chemistry/data/chemicals";
import { PRODUCT_GOALS } from "@/domains/chemistry/data/goals";

function chem(...ids: string[]) {
  return ids.map((id) => {
    const c = getChemical(id);
    if (!c) throw new Error(`missing ${id}`);
    return c;
  });
}

describe("productCraft expansions", () => {
  it("makes sanitizer from ethanol + glycerol", () => {
    const r = tryProductCraft(chem("c2h5oh", "glycerol"));
    expect(r?.ok).toBe(true);
    expect(r?.explanationKey).toBe("product-sanitizer");
    expect(r?.products.some((p) => p.id === "sanitizer")).toBe(true);
  });

  it("makes bath bomb with CO2 from citric acid + NaHCO3", () => {
    const r = tryProductCraft(chem("citric-acid", "nahco3"));
    expect(r?.ok).toBe(true);
    expect(r?.explanationKey).toBe("product-bath-bomb");
    expect(r?.gasReleased).toBe(true);
  });

  it("makes oxygen via H2O2 + MnO2", () => {
    const r = tryProductCraft(chem("h2o2", "mno2"));
    expect(r?.ok).toBe(true);
    expect(r?.explanationKey).toBe("product-oxygen");
    expect(r?.gasReleased).toBe(true);
  });

  it("requires heat for balm", () => {
    const cold = tryProductCraft(chem("plant-oil", "beeswax"));
    expect(cold?.ok).toBe(false);
    expect(cold?.explanationKey).toBe("product-balm-needs-heat");
    const hot = tryProductCraft(chem("plant-oil", "beeswax"), { hasHeat: true });
    expect(hot?.ok).toBe(true);
    expect(hot?.explanationKey).toBe("product-balm");
  });

  it("casts solid perfume from wax + jojoba + fragrance under heat", () => {
    const cold = tryProductCraft(chem("beeswax", "jojoba-oil", "rose-oil"));
    expect(cold?.ok).toBe(false);
    expect(cold?.explanationKey).toBe("product-solid-perfume-needs-heat");
    const hot = tryProductCraft(chem("beeswax", "jojoba-oil", "rose-oil"), {
      hasHeat: true,
    });
    expect(hot?.ok).toBe(true);
    expect(hot?.explanationKey).toBe("product-solid-perfume");
    expect(hot?.products.some((p) => p.id === "solid-perfume")).toBe(true);
  });

  it("limewater craft: CO2 + Ca(OH)2 → CaCO3", () => {
    const r = resolveChemistry(chem("co2", "caoh2"));
    expect(r.ok).toBe(true);
    expect(r.explanationKey).toBe("product-limewater");
    expect(r.precipitateFormed).toBe(true);
  });

  it("slime from PVA + borax", () => {
    const r = resolveChemistry(chem("pva", "borax"));
    expect(r.ok).toBe(true);
    expect(r.explanationKey).toBe("product-slime");
  });
});

describe("goal catalog", () => {
  it("has ~22 goals with category and visualKind", () => {
    expect(PRODUCT_GOALS.length).toBeGreaterThanOrEqual(20);
    expect(PRODUCT_GOALS.length).toBeLessThanOrEqual(25);
    for (const g of PRODUCT_GOALS) {
      expect(g.category === "product" || g.category === "classic").toBe(true);
      expect(g.visualKind).toBeTruthy();
      expect(g.steps.length).toBeGreaterThanOrEqual(3);
      expect(g.badgeId).toBeTruthy();
    }
  });

  it("includes both product and classic categories", () => {
    expect(PRODUCT_GOALS.some((g) => g.category === "product")).toBe(true);
    expect(PRODUCT_GOALS.some((g) => g.category === "classic")).toBe(true);
  });
});
