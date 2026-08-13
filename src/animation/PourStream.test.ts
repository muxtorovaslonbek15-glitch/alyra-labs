import { describe, expect, it } from "vitest";
import { POUR_TIMELINE } from "./fxIntensity";
import { pourRibbonTiming, pourSurfaceLocalY } from "./PourStream";

describe("pour ribbon timing", () => {
  it("finishes the draw during stream and fades only after", () => {
    const streamMs = POUR_TIMELINE.streamEnd - POUR_TIMELINE.holdEnd;
    const watery = pourRibbonTiming(0.18);
    const thick = pourRibbonTiming(0.8);
    expect(watery.drawMs).toBeLessThan(streamMs);
    expect(thick.drawMs).toBeLessThan(streamMs);
    expect(watery.fadeBeginMs).toBe(streamMs);
    expect(thick.fadeBeginMs).toBe(streamMs);
  });
});

describe("pourSurfaceLocalY", () => {
  const well = { y: 34, height: 88 };

  it("aims empty pours at the well floor, not the rim", () => {
    const empty = pourSurfaceLocalY(0, well);
    const full = pourSurfaceLocalY(70, well);
    expect(empty).toBeGreaterThan(full);
    expect(empty).toBeCloseTo(well.y + well.height, 5);
  });
});
