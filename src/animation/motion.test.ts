import { describe, expect, it } from "vitest";
import {
  buildStepDelayMs,
  INVENTORY_SHEET_EASE,
  isSolidBridge,
  LAB_EASE,
  LAB_EASE_EXIT,
  MOTION_MS,
  PHONE_DOCK_EASE,
  resolveBuildEquipmentId,
} from "@/animation/motion";
import { CUP_SET_WINDOW_MS } from "@/animation/cupSet/timeline";
import { MIX_WINDOW_MS, POUR_WINDOW_MS } from "@/animation/fxIntensity";
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

  it("holds solid mix for the cup-set window", () => {
    const mix = buildStepDelayMs("mix", { solid: true, tin: true });
    expect(mix === CUP_SET_WINDOW_MS + 120 || mix === 40).toBe(true);
  });

  it("holds liquid mix for the bloom window", () => {
    const mix = buildStepDelayMs("mix", { solid: false });
    expect(mix === MIX_WINDOW_MS + 80 || mix === 40).toBe(true);
  });

  it("holds stir long enough for two rod arcs", () => {
    const liquid = buildStepDelayMs("stir", { solid: false });
    const solid = buildStepDelayMs("stir", { solid: true });
    expect(liquid === 1780 || liquid === 40).toBe(true);
    expect(solid === 1680 || solid === 40).toBe(true);
  });

  it("check-in popover stays in the quiet 160-200ms window", () => {
    expect(MOTION_MS.checkIn).toBeGreaterThanOrEqual(160);
    expect(MOTION_MS.checkIn).toBeLessThanOrEqual(200);
  });

  it("locks phone inventory sheet at 200ms with reverse easing", () => {
    expect(MOTION_MS.chrome).toBe(200);
    expect(INVENTORY_SHEET_EASE.enter).toBe("cubic-bezier(0.22, 1, 0.36, 1)");
    expect(INVENTORY_SHEET_EASE.exit).toBe("cubic-bezier(0.64, 0, 0.78, 0)");
  });

  it("shares one decelerate family across chrome, dock, and costume", () => {
    expect(LAB_EASE).toBe("cubic-bezier(0.22, 1, 0.36, 1)");
    expect(PHONE_DOCK_EASE).toBe(LAB_EASE);
    expect(INVENTORY_SHEET_EASE.enter).toBe(LAB_EASE);
    expect(INVENTORY_SHEET_EASE.exit).toBe(LAB_EASE_EXIT);
    expect(MOTION_MS.crossfade).toBe(220);
    expect(MOTION_MS.phoneDock).toBe(240);
    expect(MOTION_MS.checkIn).toBe(180);
    expect(MOTION_MS.reduced).toBe(40);
  });
});
