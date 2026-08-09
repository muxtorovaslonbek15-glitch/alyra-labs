import { describe, expect, it } from "vitest";
import { livePreviewToFluidState } from "./livePreviewToFluidState";
import type { LiveVesselPreview } from "@/types";

function preview(
  partial: Partial<LiveVesselPreview> = {},
): LiveVesselPreview {
  return {
    fillPct: 40,
    ethanolPct: 50,
    oilLoadPct: 10,
    hazards: [],
    notes: [],
    effects: [],
    fillColor: "#3a9b8c",
    ...partial,
  };
}

describe("livePreviewToFluidState", () => {
  it("maps fill, color, and empty layers", () => {
    const state = livePreviewToFluidState(preview(), {
      fx: {},
      heatAttached: false,
      stirLevel: 0,
    });
    expect(state.fill).toBe(40);
    expect(state.fillColor).toBe("#3a9b8c");
    expect(state.layers).toHaveLength(1);
    expect(state.boil).toBe(false);
    expect(state.turbidity).toBe(0);
  });

  it("builds immiscible layer bands", () => {
    const state = livePreviewToFluidState(
      preview({ layerColors: ["#aa7744", "#2266aa", "#eedd88"] }),
      { fx: {}, heatAttached: false, stirLevel: 0 },
    );
    expect(state.layers).toHaveLength(3);
    expect(state.layers[0]!.fraction).toBeCloseTo(1 / 3);
    expect(state.layers[1]!.color).toBe("#2266aa");
  });

  it("sets turbidity / foam / boil from effects", () => {
    const state = livePreviewToFluidState(
      preview({
        effects: [
          { kind: "turbid", intensity: "high" },
          { kind: "foam", intensity: "medium" },
          { kind: "boil", intensity: "medium" },
        ],
      }),
      { fx: {}, heatAttached: true, stirLevel: 1 },
    );
    expect(state.turbidity).toBe(1);
    expect(state.foam).toBeGreaterThan(0.5);
    expect(state.boil).toBe(true);
    expect(state.bubble).toBe(true);
    expect(state.temperature).toBeGreaterThan(0.5);
  });

  it("emits pour / shake impulses from vessel fx", () => {
    const now = 1_700_000_000_000;
    const state = livePreviewToFluidState(preview(), {
      fx: { pourAt: now, shakeAt: now - 100 },
      heatAttached: false,
      stirLevel: 0,
    });
    expect(state.impulses.some((i) => i.kind === "pour")).toBe(true);
    expect(state.impulses.some((i) => i.kind === "shake")).toBe(true);
  });

  it("raises viscosity on solidify and lowers on melt", () => {
    const solid = livePreviewToFluidState(
      preview({ effects: [{ kind: "solidify", intensity: "high" }] }),
      { fx: {}, heatAttached: false, stirLevel: 0 },
    );
    const melt = livePreviewToFluidState(
      preview({ effects: [{ kind: "melt", intensity: "high" }] }),
      { fx: {}, heatAttached: false, stirLevel: 0 },
    );
    expect(solid.viscosity).toBeGreaterThan(melt.viscosity);
    expect(solid.solidify).toBe(1);
    expect(melt.melt).toBe(1);
  });

  it("maps stir level and overfill into agitation / overflow", () => {
    const stirred = livePreviewToFluidState(preview({ fillPct: 40 }), {
      fx: {},
      heatAttached: false,
      stirLevel: 3,
    });
    expect(stirred.agitation).toBeGreaterThan(0.4);

    const over = livePreviewToFluidState(preview({ fillPct: 108 }), {
      fx: {},
      heatAttached: false,
      stirLevel: 0,
    });
    expect(over.overflow).toBeGreaterThan(0.5);
    expect(over.foam).toBeGreaterThan(0.4);
  });

  it("treats gas effects as bubble emitters", () => {
    const state = livePreviewToFluidState(
      preview({ effects: [{ kind: "gas", intensity: "high" }] }),
      { fx: {}, heatAttached: false, stirLevel: 0 },
    );
    expect(state.bubble).toBe(true);
  });

  it("respects fill overrides when preview is missing", () => {
    const state = livePreviewToFluidState(undefined, {
      fx: {},
      heatAttached: false,
      stirLevel: 0,
      fillColorOverride: "#c4783a",
      fillPctOverride: 62,
      boiling: true,
    });
    expect(state.fill).toBe(62);
    expect(state.fillColor).toBe("#c4783a");
    expect(state.boil).toBe(true);
  });

  it("adds blast impulse from mix effects", () => {
    const mixAt = 1_700_000_000_500;
    const state = livePreviewToFluidState(
      preview({ effects: [{ kind: "blast", intensity: "high" }] }),
      { fx: { mixAt }, heatAttached: false, stirLevel: 0 },
    );
    const blast = state.impulses.find((i) => i.kind === "blast");
    expect(blast?.strength).toBe(1);
    expect(blast?.at).toBe(mixAt);
  });
});
