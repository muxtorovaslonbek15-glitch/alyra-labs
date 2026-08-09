import { describe, expect, it } from "vitest";
import { mapIngredientToLab, mapLabToPerfumer } from "@/perfumer/labIngredientMap";
import {
  buildChatBridgeFromDesk,
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

  it("reverse maps lab chemicals without inventing", () => {
    expect(mapLabToPerfumer("c2h5oh").perfumerIngredientId).toBe("ethanol");
    expect(mapLabToPerfumer("vanilla-extract").perfumerIngredientId).toBe(
      "vanilla-extract",
    );
    expect(mapLabToPerfumer("not-a-real-chem").mapStatus).toBe("unmapped");
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
    expect(bridge!.vessel.autoMix).toBe(true);
    expect(bridge!.mappingReport.unmappedIds).toContain(
      "unknown-luxury-oud-fraction",
    );
    const contents = deskContentsFromBridge(bridge!);
    expect(contents.length).toBeGreaterThanOrEqual(1);
    expect(contents.every((c) => c.chemicalId && c.amountMl > 0)).toBe(true);
  });

  it("round-trips desk contents back to FormulaCard-ready payload", () => {
    const outbound = buildLabBridgeFromStructured(structured)!;
    const desk = deskContentsFromBridge(outbound);
    // Simulate a pour adjust: boost rose (rose-oil)
    const adjusted = desk.map((c) =>
      c.chemicalId === "rose-oil"
        ? { ...c, amountMl: c.amountMl + 2 }
        : c,
    );
    const inbound = buildChatBridgeFromDesk({
      contents: adjusted.map((c) => ({
        chemicalId: c.chemicalId,
        amountMl: c.amountMl,
      })),
      sessionBridge: outbound,
      title: outbound.title,
    });
    expect("error" in inbound).toBe(false);
    if ("error" in inbound) return;
    expect(inbound.structured.formula?.formula?.length).toBeGreaterThan(0);
    expect(inbound.structured.lab_bridge?.lines.some((l) => l.labChemicalId)).toBe(
      true,
    );
    // Preserve Hedione id even though Lab shows jasmine-oil proxy
    const hedione = inbound.bridge.lines.find(
      (l) => l.perfumerIngredientId === "hedione",
    );
    expect(hedione?.labChemicalId).toBe("jasmine-oil");
    // Open in Lab still works on returned formula
    const again = deskContentsFromBridge(inbound.bridge);
    expect(again.some((c) => c.chemicalId === "jasmine-oil")).toBe(true);
    expect(again.some((c) => c.chemicalId === "rose-oil")).toBe(true);
  });

  it("refuses empty or unknown-only desks", () => {
    expect(
      buildChatBridgeFromDesk({ contents: [] }),
    ).toMatchObject({ error: expect.stringContaining("Nothing") });
    expect(
      buildChatBridgeFromDesk({
        contents: [{ chemicalId: "made-up-999", amountMl: 2 }],
      }),
    ).toMatchObject({ error: expect.stringContaining("not in the fragrance") });
  });

  it("emits schemaVersion 1 bridge shape for Open in Lab", () => {
    const bridge = buildLabBridgeFromStructured(structured)!;
    expect(bridge.schemaVersion).toBe(1);
    expect(["EDP", "Oil", "Solid"]).toContain(bridge.format);
    expect(bridge.vessel.equipmentId).toBe("beaker");
    expect(bridge.vessel.autoMix).toBe(true);
    expect(bridge.mappingReport.mappedCount).toBeGreaterThan(0);
    expect(bridge.disclaimer).toMatch(/Teaching desk/i);
    for (const line of bridge.lines) {
      expect(line.perfumerIngredientId).toBeTruthy();
      expect(line.name).toBeTruthy();
      expect(line.percent).toBeGreaterThan(0);
      expect(line.mapStatus).toMatch(/exact|alias|proxy|unmapped/);
    }
  });

  it("adds beeswax chassis for Solid format and places a tin", () => {
    const solid: StructuredPayload = {
      formula: {
        type: "Solid",
        vibe: "woody rose solid",
        formula: [
          { id: "rose-absolute", name: "Rose", percent: 20, role: "heart" },
          { id: "sandalwood-oil", name: "Sandalwood", percent: 30, role: "base" },
        ],
      },
    };
    const bridge = buildLabBridgeFromStructured(solid)!;
    expect(bridge.format).toBe("Solid");
    expect(bridge.vessel.equipmentId).toBe("tin");
    expect(bridge.solidChassis?.waxPercent).toBeGreaterThan(0);
    expect(bridge.lines.some((l) => l.labChemicalId === "beeswax")).toBe(true);
    const desk = deskContentsFromBridge(bridge);
    expect(desk.some((c) => c.chemicalId === "beeswax")).toBe(true);
  });

  it("preserves refine formulaDiff on structured payload for FormulaCard", () => {
    const withDiff: StructuredPayload = {
      ...structured,
      formulaDiff: {
        summary: "Softer opening",
        changes: [
          {
            id: "aldehydes",
            name: "Aldehydes",
            before: 4,
            after: 1.5,
            delta: -2.5,
          },
        ],
      },
    };
    expect(withDiff.formulaDiff?.changes[0].delta).toBe(-2.5);
    const bridge = buildLabBridgeFromStructured(withDiff);
    expect(bridge?.lines.length).toBeGreaterThan(0);
  });
});
