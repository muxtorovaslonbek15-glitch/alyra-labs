import { describe, expect, it } from "vitest";
import {
  condensationCount,
  dendriteOpacity,
  frostStage,
  iceFilmOpacity,
  trayFrost,
} from "./frostVisual";

describe("frost visual stages", () => {
  it("does not show ice on chill-only attach", () => {
    expect(frostStage(0.62, 0)).toBe("rime");
    expect(iceFilmOpacity(0, false)).toBe(0);
    expect(dendriteOpacity(0)).toBe(0);
  });

  it("walks condensation → rime → dendrite → ice", () => {
    expect(frostStage(0.12, 0)).toBe("condensation");
    expect(frostStage(0.5, 0.05)).toBe("rime");
    expect(frostStage(0.7, 0.28)).toBe("dendrite");
    expect(frostStage(0.9, 0.7)).toBe("ice");
  });

  it("fades condensation beads as ice takes the surface", () => {
    const early = condensationCount(0.8, 0.05, false);
    const late = condensationCount(0.8, 0.9, false);
    expect(early).toBeGreaterThan(late);
    expect(condensationCount(0.8, 0.2, true)).toBe(0);
  });

  it("grows tray frost from live frost, not a cube pop", () => {
    const fresh = trayFrost(0.05);
    const frozen = trayFrost(0.85);
    expect(fresh.crystalOpacity).toBe(0);
    expect(frozen.crystalOpacity).toBeGreaterThan(0.5);
    expect(frozen.slushOpacity).toBeGreaterThan(fresh.slushOpacity);
    expect(frozen.waterOpacity).toBeLessThan(fresh.waterOpacity);
  });
});
