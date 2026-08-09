import { describe, expect, it } from "vitest";
import { deriveBuildSteps } from "@/perfumer/BuildQueue";
import type { LabBridgeFormula } from "@/perfumer/types";

describe("deriveBuildSteps", () => {
  const bridge: LabBridgeFormula = {
    schemaVersion: 1,
    title: "Humid evening floral",
    format: "EDP",
    vessel: { equipmentId: "beaker", autoMix: true },
    lines: [
      {
        perfumerIngredientId: "bergamot-oil",
        labChemicalId: "bergamot-oil",
        name: "Bergamot",
        percent: 6,
        role: "top",
        amountMl: 1.2,
        mapStatus: "exact",
      },
      {
        perfumerIngredientId: "rose-absolute",
        labChemicalId: "rose-oil",
        name: "Rose",
        percent: 10,
        role: "heart",
        amountMl: 2,
        mapStatus: "alias",
      },
      {
        perfumerIngredientId: "vanillin-extra",
        labChemicalId: null,
        name: "Vanillin Extra",
        percent: 2,
        role: "base",
        mapStatus: "unmapped",
      },
      {
        perfumerIngredientId: "ethanol",
        labChemicalId: "c2h5oh",
        name: "Ethanol",
        percent: 55,
        role: "solvent",
        amountMl: 11,
        mapStatus: "alias",
      },
    ],
    mappingReport: {
      mappedCount: 3,
      unmappedCount: 1,
      unmappedIds: ["vanillin-extra"],
    },
  };

  it("orders propose → place → pours → gaps → stir → mix → done", () => {
    const steps = deriveBuildSteps(bridge);
    const kinds = steps.map((s) => s.kind);
    expect(kinds[0]).toBe("propose_accord");
    expect(kinds[1]).toBe("place_vessel");
    expect(kinds).toContain("add_chemical");
    expect(kinds).toContain("add_solvent");
    expect(kinds).toContain("mapping_gap");
    expect(kinds).toContain("stir");
    expect(kinds).toContain("mix");
    expect(kinds[kinds.length - 1]).toBe("done");
  });

  it("never invents lab chemicals for unmapped lines", () => {
    const steps = deriveBuildSteps(bridge);
    const gaps = steps.filter((s) => s.kind === "mapping_gap");
    expect(gaps).toHaveLength(1);
    expect(gaps[0].name).toBe("Vanillin Extra");
    expect(gaps[0].chemicalId).toBeUndefined();
  });

  it("includes set_amount for each mapped pour", () => {
    const steps = deriveBuildSteps(bridge);
    const amounts = steps.filter((s) => s.kind === "set_amount");
    expect(amounts.length).toBe(3);
  });
});
