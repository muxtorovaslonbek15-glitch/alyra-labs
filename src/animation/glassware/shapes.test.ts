import { describe, expect, it } from "vitest";
import {
  GLASS_SHAPES,
  pathToUnitBox,
  resolveGlassShape,
  type GlassShapeId,
} from "./shapes";

const IDS: GlassShapeId[] = [
  "beaker",
  "flask",
  "test-tube",
  "graduated-cylinder",
  "cup",
];

describe("resolveGlassShape", () => {
  it("returns beaker for unknown equipment", () => {
    expect(resolveGlassShape("tin").id).toBe("beaker");
    expect(resolveGlassShape("nope").id).toBe("beaker");
  });

  it("keeps every well inside the outline thickness", () => {
    for (const id of IDS) {
      const g = GLASS_SHAPES[id];
      expect(g.outline.endsWith("Z")).toBe(true);
      expect(g.well.endsWith("Z")).toBe(true);
      expect(g.wellBounds.width).toBeGreaterThan(8);
      expect(g.wellBounds.height).toBeGreaterThan(20);
      expect(g.wellBounds.x).toBeGreaterThanOrEqual(0);
      expect(g.wellBounds.y + g.wellBounds.height).toBeLessThanOrEqual(140);
    }
  });

  it("gives the cup a punched well (transparent walls)", () => {
    const cup = resolveGlassShape("cup");
    expect(cup.id).toBe("cup");
    expect(cup.wellBounds.x).toBeGreaterThan(cup.mouth.x - cup.mouthRx);
    expect(cup.wellBounds.width).toBeLessThan(cup.mouthRx * 2);
  });
});

describe("pathToUnitBox", () => {
  it("maps the viewBox corners to 0–1", () => {
    expect(pathToUnitBox("M0 0 L100 140 Z")).toBe(
      "M 0.0000 0.0000 L 1.0000 1.0000 Z",
    );
  });
});
