import { describe, expect, it } from "vitest";
import { viscousPourParams } from "./viscousPour";

describe("viscousPourParams", () => {
  it("keeps a watery ribbon at low viscosity", () => {
    const p = viscousPourParams(0.1);
    expect(p.strokeWidth).toBeLessThan(10);
    expect(p.dropletCount).toBeGreaterThanOrEqual(8);
    expect(p.bloom).toBeGreaterThan(0.7);
    expect(p.durationMs).toBeLessThan(1300);
    expect(p.elongate).toBe(false);
    expect(p.glow).toBe(true);
  });

  it("thickens and slows a wax pour", () => {
    const p = viscousPourParams(0.75);
    expect(p.strokeWidth).toBeGreaterThanOrEqual(14);
    expect(p.dropletCount).toBeLessThanOrEqual(5);
    expect(p.bloom).toBeLessThanOrEqual(0.3);
    expect(p.durationMs).toBeGreaterThanOrEqual(1450);
    expect(p.elongate).toBe(true);
    expect(p.glow).toBe(false);
  });

  it("clamps viscosity to 0–1", () => {
    expect(viscousPourParams(-1).strokeWidth).toBe(viscousPourParams(0).strokeWidth);
    expect(viscousPourParams(2).strokeWidth).toBe(viscousPourParams(1).strokeWidth);
  });
});
