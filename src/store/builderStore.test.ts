import { beforeEach, describe, expect, it } from "vitest";
import type { LabBridgeFormula } from "@/perfumer/types";
import { planBuildCta, useBuilderStore } from "./builderStore";

const bridge: LabBridgeFormula = {
  schemaVersion: 1,
  title: "Test plan",
  format: "EDP",
  vessel: { equipmentId: "beaker" },
  lines: [
    {
      name: "Bergamot",
      percent: 12,
      perfumerIngredientId: "bergamot",
      labChemicalId: "bergamot",
    },
  ],
  mappingReport: { mappedCount: 1, unmappedCount: 0, unmappedIds: [] },
};

beforeEach(() => {
  useBuilderStore.setState({
    mode: "idle",
    plan: null,
    structured: null,
    buildSteps: [],
    buildStepIndex: -1,
    deskSnapshot: null,
    abortController: null,
    narration: [],
  });
});

describe("plan lock vs Build", () => {
  it("drafts a plan as planning — Build stays hidden", () => {
    useBuilderStore.getState().setPlan(bridge);
    expect(useBuilderStore.getState().mode).toBe("planning");
    expect(planBuildCta("planning")).toBe("lock");
    expect(planBuildCta("idle")).toBeNull();
  });

  it("shows Build only after lockPlan", () => {
    useBuilderStore.getState().setPlanFromStructured(null, bridge);
    expect(useBuilderStore.getState().mode).toBe("planning");
    expect(useBuilderStore.getState().lockPlan()).toBe(true);
    expect(useBuilderStore.getState().mode).toBe("plan_ready");
    expect(planBuildCta("plan_ready")).toBe("build");
    expect(useBuilderStore.getState().lockPlan()).toBe(false);
  });

  it("re-drafting after lock hides Build until lock again", () => {
    useBuilderStore.getState().setPlan(bridge);
    useBuilderStore.getState().lockPlan();
    useBuilderStore.getState().setPlanFromStructured(null, {
      ...bridge,
      title: "Revised",
    });
    expect(useBuilderStore.getState().mode).toBe("planning");
    expect(planBuildCta(useBuilderStore.getState().mode)).toBe("lock");
  });

  it("Build stays the CTA after stop or complete; Stop while pouring", () => {
    expect(planBuildCta("building")).toBe("stop");
    expect(planBuildCta("stopped")).toBe("build");
    expect(planBuildCta("built")).toBe("build");
  });
});

describe("shared right rail width", () => {
  beforeEach(() => {
    useBuilderStore.setState({
      tab: "chat",
      rightSlot: "chat",
      rightWidth: 360,
    });
  });

  it("keeps rightWidth when switching Information and Chat", () => {
    useBuilderStore.getState().setRightWidth(412);
    useBuilderStore.getState().setTab("tutor");
    expect(useBuilderStore.getState().rightWidth).toBe(412);
    expect(useBuilderStore.getState().rightSlot).toBe("tutor");
    useBuilderStore.getState().setTab("chat");
    expect(useBuilderStore.getState().rightWidth).toBe(412);
    expect(useBuilderStore.getState().rightSlot).toBe("chat");
  });
});
