import { describe, expect, it } from "vitest";
import { CUP_WELL, cupFillPath, cupMeniscusStroke } from "./cupGeometry";

describe("cupFillPath", () => {
  it("returns empty when there is no fill", () => {
    expect(cupFillPath(CUP_WELL, 0, { meniscusAmp: 1.5, set01: 0 })).toBe("");
  });

  it("closes a well from a meniscus to the floor", () => {
    const d = cupFillPath(CUP_WELL, 0.6, { meniscusAmp: 1.6, set01: 0 });
    expect(d.startsWith("M")).toBe(true);
    expect(d.includes("Q")).toBe(true);
    expect(d.endsWith("Z")).toBe(true);
    const topY = CUP_WELL.y + CUP_WELL.height * 0.4;
    expect(d).toContain(String(CUP_WELL.y + CUP_WELL.height));
    expect(Number(d.split(" ")[1])).toBeLessThan(topY + 4);
  });

  it("domes upward when set (convex puck)", () => {
    const molten = cupFillPath(CUP_WELL, 1, { meniscusAmp: 1.8, set01: 0 });
    const set = cupFillPath(CUP_WELL, 1, { meniscusAmp: 0.22, set01: 1 });
    const qMolten = Number(molten.split("Q")[1]!.split(" ")[1]);
    const qSet = Number(set.split("Q")[1]!.split(" ")[1]);
    expect(qSet).toBeLessThan(qMolten);
  });
});

describe("cupMeniscusStroke", () => {
  it("is a quadratic stroke across the well", () => {
    const d = cupMeniscusStroke(CUP_WELL, 0.5, { meniscusAmp: 1, set01: 0 });
    expect(d.startsWith("M")).toBe(true);
    expect(d.includes("Q")).toBe(true);
    expect(d.endsWith("Z")).toBe(false);
  });
});
