import { describe, expect, it } from "vitest";
import {
  buildStepDelayMs,
  isSolidBridge,
  resolveBuildEquipmentId,
} from "@/animation/motion";
import { POUR_WINDOW_MS } from "@/animation/fxIntensity";
import type { LabBridgeFormula } from "@/perfumer/types";

const base: LabBridgeFormula = {
  schemaVersion: 1,
  title: "Test",
  format: "EDP",
  vessel: { equipmentId: "beaker" },
  lines: [],
  mappingReport: { mappedCount: 0, unmappedCount: 0 },
};

describe("motion build helpers", () => {
  it("detects solid bridges", () => {
    expect(isSolidBridge(base)).toBe(false);
    expect(isSolidBridge({ ...base, format: "Solid" })).toBe(true);
  });

  it("resolves tin for Solid when equipment exists", () => {
    expect(
      resolveBuildEquipmentId({ ...base, format: "Solid" }),
    ).toBe("tin");
    expect(resolveBuildEquipmentId(base)).toBe("beaker");
    expect(
      resolveBuildEquipmentId({
        ...base,
        vessel: { equipmentId: "flask" },
      }),
    ).toBe("flask");
  });

  it("times liquid pours to the FX window", () => {
    const pour = buildStepDelayMs("add_chemical", { solid: false });
    // When reduced-motion is off in test env, expect full pour window.
    expect(pour === POUR_WINDOW_MS + 100 || pour === 40).toBe(true);
  });

  it("uses quieter solid pour timing", () => {
    const pour = buildStepDelayMs("add_chemical", { solid: true, tin: true });
    expect(pour === 980 || pour === 40).toBe(true);
  });
});
