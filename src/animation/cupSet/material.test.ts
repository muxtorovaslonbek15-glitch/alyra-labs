import { describe, expect, it } from "vitest";
import { cupSetMaterial } from "./material";

describe("cupSetMaterial", () => {
  it("starts molten: translucent, glossy, no grain", () => {
    const m = cupSetMaterial(0);
    expect(m.opacity).toBeLessThan(0.65);
    expect(m.gloss).toBeGreaterThan(0.45);
    expect(m.grain).toBeLessThan(0.08);
    expect(m.bloom).toBeLessThan(0.15);
    expect(m.meniscusAmp).toBeGreaterThan(1);
  });

  it("locks matte wax at set=1", () => {
    const m = cupSetMaterial(1);
    expect(m.opacity).toBeGreaterThan(0.88);
    expect(m.gloss).toBeLessThan(0.12);
    expect(m.grain).toBeGreaterThan(0.35);
    expect(m.bloom).toBeGreaterThan(0.35);
    expect(m.meniscusAmp).toBeLessThan(0.45);
    expect(m.specular).toBeLessThan(0.12);
  });

  it("progresses opacity and grain monotonically", () => {
    const a = cupSetMaterial(0.2);
    const b = cupSetMaterial(0.8);
    expect(b.opacity).toBeGreaterThan(a.opacity);
    expect(b.grain).toBeGreaterThan(a.grain);
    expect(b.gloss).toBeLessThan(a.gloss);
  });
});
