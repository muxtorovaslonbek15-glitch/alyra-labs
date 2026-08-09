import { describe, expect, it } from "vitest";
import {
  chassisFromLines,
  isSolidIntent,
  vesselEquipmentForFormat,
} from "./solidDetect";
import type { LabBridgeFormula, StructuredPayload } from "./types";

describe("solidDetect", () => {
  it("maps Solid format to tin equipment", () => {
    expect(vesselEquipmentForFormat("Solid")).toBe("tin");
    expect(vesselEquipmentForFormat("EDP")).toBe("beaker");
  });

  it("detects solid from bridge format without a mode toggle", () => {
    const bridge = {
      format: "Solid",
      vessel: { equipmentId: "tin" },
    } as LabBridgeFormula;
    expect(isSolidIntent({ bridge })).toBe(true);
  });

  it("detects solid from formula type", () => {
    const structured: StructuredPayload = {
      formula: { type: "Solid", formula: [] },
    };
    expect(isSolidIntent({ structured })).toBe(true);
  });

  it("keeps liquid for EDP / spray language", () => {
    expect(
      isSolidIntent({
        structured: {
          formula: { type: "EDP", formula: [] },
          brief: { goal: "fresh citrus spray for office" },
        },
      }),
    ).toBe(false);
  });

  it("rolls chassis wax:oil:FO from roles", () => {
    const chassis = chassisFromLines([
      { id: "beeswax", name: "Beeswax", percent: 42, role: "wax" },
      { id: "cct", name: "CCT", percent: 38, role: "carrier" },
      { id: "rose", name: "Rose", percent: 20, role: "heart" },
    ]);
    expect(chassis).toEqual({
      waxPercent: 42,
      oilPercent: 38,
      fragranceLoadPercent: 20,
    });
  });
});
