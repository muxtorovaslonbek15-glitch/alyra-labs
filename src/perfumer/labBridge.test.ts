import { describe, expect, it } from "vitest";
import { mapIngredientToLab } from "@/perfumer/labIngredientMap";
import {
  buildLabBridgeFromStructured,
  deskContentsFromBridge,
} from "@/perfumer/labBridge";
import type { StructuredPayload } from "@/perfumer/types";

describe("labIngredientMap", () => {
  it("maps exact and alias ids", () => {
    expect(mapIngredientToLab("limonene").mapStatus).toBe("exact");
    expect(mapIngredientToLab("vanillin").labChemicalId).toBe("vanilla-extract");
    expect(mapIngredientToLab("iso-e-super").labChemicalId).toBe("iso-e-super");
  });

  it("maps CCT / MCT carrier aliases", () => {
    expect(mapIngredientToLab("caprylic-capric-triglyceride").labChemicalId).toBe(
      "cct",
    );
    expect(mapIngredientToLab("fractionated-coconut").mapStatus).toBe("alias");
    expect(mapIngredientToLab("cct").mapStatus).toBe("exact");
    expect(mapIngredientToLab("jojoba-oil").labChemicalId).toBe("jojoba-oil");
  });

  it("does not invent lab chemicals", () => {
    expect(mapIngredientToLab("made-up-aroma-999").mapStatus).toBe("unmapped");
    expect(mapIngredientToLab("made-up-aroma-999").labChemicalId).toBeNull();
  });
});

describe("labBridge", () => {
  const structured: StructuredPayload = {
    formula: {
      type: "EDP",
      vibe: "woody rose",
      formula: [
        { id: "bergamot-oil", name: "Bergamot", percent: 6, role: "top" },
        { id: "hedione", name: "Hedione", percent: 20, role: "heart" },
        { id: "rose-absolute", name: "Rose", percent: 10, role: "heart" },
        { id: "iso-e-super", name: "Iso E Super", percent: 14, role: "heart" },
        { id: "ambroxan", name: "Ambroxan", percent: 5, role: "base" },
        { id: "galaxolide", name: "Galaxolide", percent: 16, role: "base" },
        { id: "unknown-luxury-oud-fraction", name: "Mystery", percent: 2, role: "base" },
      ],
    },
  };

  it("builds bridge with ethanol and honest unmapped", () => {
    const bridge = buildLabBridgeFromStructured(structured);
    expect(bridge).not.toBeNull();
    expect(bridge!.lines.some((l) => l.labChemicalId === "c2h5oh")).toBe(true);
    expect(bridge!.mappingReport.unmappedIds).toContain(
      "unknown-luxury-oud-fraction",
    );
    const contents = deskContentsFromBridge(bridge!);
    expect(contents.length).toBeGreaterThanOrEqual(1);
    expect(contents.every((c) => c.chemicalId && c.amountMl > 0)).toBe(true);
  });
});
