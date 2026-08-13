import { describe, expect, it } from "vitest";
import { newlyCompletedSteps } from "@/goals/goalProgress";
import { getGoal } from "@/domains/chemistry/data/goals";
import { defaultPourMl } from "@/desk/vesselContents";
import { SOLID_PERFUME_GOALS } from "./solidPerfumeGoals";
import { getSolidFormulaGoal, allSolidFormulaGoals } from "./solidPerfumeGoalFactory";

function vessel(
  partial: Partial<{
    equipmentId: string;
    contentIds: string[];
    heatAttached: boolean;
    coolAttached: boolean;
    stirLevel: number;
    lastResult?: unknown;
  }>,
) {
  return {
    instanceId: "v1",
    equipmentId: partial.equipmentId ?? "tin",
    contentIds: partial.contentIds ?? [],
    contents: (partial.contentIds ?? []).map((chemicalId) => ({
      chemicalId,
      amountMl: defaultPourMl(chemicalId),
    })),
    heatAttached: partial.heatAttached ?? false,
    coolAttached: partial.coolAttached ?? false,
    position: { x: 0, y: 0 },
    stirLevel: partial.stirLevel ?? 0,
    fx: {},
    lastResult: partial.lastResult,
  };
}

describe("solid perfume flagship goal", () => {
  it("uses tin + melt + load + cast + set", () => {
    const g = SOLID_PERFUME_GOALS[0]!;
    expect(g.id).toBe("solid-perfume");
    expect(g.steps.length).toBeGreaterThanOrEqual(8);
    const titles = g.steps.map((s) => s.title.toLowerCase()).join(" ");
    expect(titles).toMatch(/tin/);
    expect(titles).toMatch(/wax/);
    expect(titles).toMatch(/melt/);
    expect(titles).toMatch(/load|rose/);
    expect(titles).toMatch(/cast|pour/);
    expect(titles).toMatch(/cool|set/);
  });

  it("cascades when the tin is complete", () => {
    const goal = getGoal("solid-perfume")!;
    const ids = ["beeswax", "jojoba-oil", "rose-oil"];
    const snap = {
      vessels: [
        vessel({
          equipmentId: "tin",
          contentIds: ids,
          heatAttached: true,
          coolAttached: true,
          stirLevel: 1,
          lastResult: {
            ok: true,
            products: [],
            effects: [],
            discoveryId: "x",
            explanationKey: "product-solid-perfume",
            label: "Solid perfume",
          },
        }),
      ],
      activeVesselId: "v1",
    };
    const fresh = newlyCompletedSteps("solid-perfume", [], snap as never);
    expect(fresh.length).toBe(goal.steps.length);
  });
});

describe("catalog formula goals", () => {
  it("builds playable tin tracks", () => {
    const goals = allSolidFormulaGoals();
    expect(goals.length).toBeGreaterThanOrEqual(24);
    const jasmine = getSolidFormulaGoal("solid-india-mogra");
    expect(jasmine?.steps.some((s) => s.id.includes("tin"))).toBe(true);
    expect(jasmine?.highlightItemIds).toContain("tin");
  });
});
