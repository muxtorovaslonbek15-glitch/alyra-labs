import type { Chemical, ReactionResult } from "../types";
import { findOrCreateProduct, getChemical } from "../data/chemicals";

function hasIds(inputs: Chemical[], ids: string[]) {
  const set = new Set(inputs.map((c) => c.id));
  return ids.every((id) => set.has(id));
}

/**
 * Simplified “make a product” crafts for Goals mode.
 * Teaching-honest stand-ins, not industrial processes.
 */
export function tryProductCraft(
  chemicals: Chemical[],
  opts: { hasHeat?: boolean; hasCool?: boolean } = {},
): ReactionResult | null {
  // Perfume / cologne: ethanol + citrus oil (± ester)
  if (
    hasIds(chemicals, ["c2h5oh", "limonene"]) ||
    hasIds(chemicals, ["c2h5oh", "ethyl-acetate"])
  ) {
    const cologne = getChemical("cologne")!;
    const scent = chemicals.find(
      (c) => c.id === "limonene" || c.id === "ethyl-acetate",
    );
    return {
      ok: true,
      products: [cologne],
      balancedEquation: `C2H5OH + ${scent?.formula ?? "scent"} → citrus cologne`,
      colorChange: "#ffe082",
      explanationKey: "product-perfume",
      reactionType: "product-craft",
    };
  }

  // Soap: fat + NaOH, needs heat
  if (hasIds(chemicals, ["plant-oil", "naoh"])) {
    if (!opts.hasHeat) {
      return {
        ok: false,
        products: [],
        balancedEquation: "fat + NaOH → needs heat (saponification)",
        explanationKey: "product-soap-needs-heat",
        reactionType: "product-craft",
      };
    }
    const soap = getChemical("soap")!;
    return {
      ok: true,
      products: [soap],
      balancedEquation: "fat + NaOH → soap + glycerol",
      colorChange: "#f5f5f5",
      heatReleased: "exo",
      explanationKey: "product-soap",
      reactionType: "product-craft",
    };
  }

  // Rust remover: acid + rust oxide
  if (hasIds(chemicals, ["hcl", "fe2o3"])) {
    const fecl3 = findOrCreateProduct("FeCl3", {
      name: "Iron(III) Chloride",
      category: "salt",
      state: "aqueous",
      color: "#ffe0b2",
      solubility: "soluble",
      hazardLevel: 2,
    });
    return {
      ok: true,
      products: [fecl3, getChemical("h2o")!],
      balancedEquation: "Fe2O3 + 6HCl → 2FeCl3 + 3H2O",
      colorChange: "#ffe0b2",
      explanationKey: "product-rust",
      reactionType: "single-displacement",
    };
  }

  // Hand sanitizer: ethanol + glycerol
  if (hasIds(chemicals, ["c2h5oh", "glycerol"])) {
    return {
      ok: true,
      products: [getChemical("sanitizer")!],
      balancedEquation: "C2H5OH + glycerol → hand sanitizer gel",
      colorChange: "#e0f2f1",
      explanationKey: "product-sanitizer",
      reactionType: "product-craft",
    };
  }

  // Bath bomb: citric acid + baking soda → fizz
  if (hasIds(chemicals, ["citric-acid", "nahco3"])) {
    return {
      ok: true,
      products: [getChemical("bath-bomb")!, getChemical("co2")!, getChemical("h2o")!],
      balancedEquation: "C6H8O7 + 3NaHCO3 → bath bomb fizz + 3CO2 + 3H2O",
      colorChange: "#f8bbd0",
      gasReleased: true,
      explanationKey: "product-bath-bomb",
      reactionType: "gas-forming",
    };
  }

  // Oxygen demo: H2O2 + MnO2 (catalyst)
  if (hasIds(chemicals, ["h2o2", "mno2"])) {
    return {
      ok: true,
      products: [getChemical("o2")!, getChemical("h2o")!],
      balancedEquation: "2H2O2 --(MnO2)→ 2H2O + O2",
      colorChange: "#e3f2fd",
      gasReleased: true,
      explanationKey: "product-oxygen",
      reactionType: "gas-forming",
    };
  }

  // Lime putty / slake quicklime: CaO + H2O
  if (hasIds(chemicals, ["cao", "h2o"])) {
    return {
      ok: true,
      products: [getChemical("lime-putty")!],
      balancedEquation: "CaO + H2O → Ca(OH)2 (lime putty)",
      colorChange: "#f5f5f5",
      heatReleased: "exo",
      explanationKey: "product-lime-putty",
      reactionType: "product-craft",
    };
  }

  // Vinegar–salt brass/copper cleaner stand-in
  if (hasIds(chemicals, ["ch3cooh", "nacl"])) {
    return {
      ok: true,
      products: [getChemical("brass-cleaner")!],
      balancedEquation: "CH3COOH + NaCl → vinegar–salt cleaner",
      colorChange: "#fff8e1",
      explanationKey: "product-brass-cleaner",
      reactionType: "product-craft",
    };
  }

  // Solid perfume tin: wax + carrier + fragrance oil, needs heat to melt
  const hasWax = chemicals.some((c) => c.id === "beeswax");
  const hasCarrier = chemicals.some(
    (c) => c.id === "jojoba-oil" || c.id === "cct" || c.id === "plant-oil",
  );
  const hasFragranceOil = chemicals.some((c) => c.subcategory === "fragrance");
  if (hasWax && hasCarrier && hasFragranceOil) {
    if (!opts.hasHeat) {
      return {
        ok: false,
        products: [],
        balancedEquation:
          "beeswax + carrier + fragrance → needs heat to melt into solid perfume",
        explanationKey: "product-solid-perfume-needs-heat",
        reactionType: "product-craft",
      };
    }
    const solid = getChemical("solid-perfume")!;
    return {
      ok: true,
      products: [solid],
      balancedEquation: "beeswax + carrier + fragrance oil → solid perfume balm",
      colorChange: "#e8d5b5",
      explanationKey: "product-solid-perfume",
      reactionType: "product-craft",
    };
  }

  // Menthol-style balm: oil + beeswax, needs heat to melt/blend
  if (hasIds(chemicals, ["plant-oil", "beeswax"])) {
    if (!opts.hasHeat) {
      return {
        ok: false,
        products: [],
        balancedEquation: "oil + beeswax → needs heat to melt into balm",
        explanationKey: "product-balm-needs-heat",
        reactionType: "product-craft",
      };
    }
    return {
      ok: true,
      products: [getChemical("balm")!],
      balancedEquation: "plant oil + beeswax → oil balm",
      colorChange: "#ffe0b2",
      explanationKey: "product-balm",
      reactionType: "product-craft",
    };
  }

  // Invisible ink: citric acid + water, heat “reveals” / finishes
  if (hasIds(chemicals, ["citric-acid", "h2o"])) {
    if (!opts.hasHeat) {
      return {
        ok: false,
        products: [],
        balancedEquation: "citric acid + H2O → heat to finish invisible ink",
        explanationKey: "product-invisible-ink-needs-heat",
        reactionType: "product-craft",
      };
    }
    return {
      ok: true,
      products: [getChemical("invisible-ink")!],
      balancedEquation: "C6H8O7(aq) → invisible ink (heat-reveal stand-in)",
      colorChange: "#f5f5f5",
      explanationKey: "product-invisible-ink",
      reactionType: "product-craft",
    };
  }

  // Slime: PVA + borax cross-link
  if (hasIds(chemicals, ["pva", "borax"])) {
    return {
      ok: true,
      products: [getChemical("slime")!],
      balancedEquation: "PVA + borax → cross-linked slime",
      colorChange: "#69f0ae",
      explanationKey: "product-slime",
      reactionType: "product-craft",
    };
  }

  // Limewater test: CO2 + Ca(OH)2 → milky CaCO3
  if (hasIds(chemicals, ["co2", "caoh2"])) {
    const chalk = getChemical("caco3")!;
    return {
      ok: true,
      products: [chalk, getChemical("h2o")!],
      balancedEquation: "CO2 + Ca(OH)2 → CaCO3 + H2O",
      colorChange: "#fafafa",
      precipitateFormed: true,
      explanationKey: "product-limewater",
      reactionType: "precipitation",
    };
  }

  return null;
}
