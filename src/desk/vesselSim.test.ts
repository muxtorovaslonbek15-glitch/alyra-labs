import { describe, expect, it } from "vitest";
import type { DeskVessel } from "@/types";
import {
  ICE_MS,
  MIX_RESOLVE_MS,
  SLUSH_MS,
  defaultVesselSim,
  materialProfile,
  tickVesselSim,
  volatilityOf,
} from "./vesselSim";

function vessel(partial: Partial<DeskVessel> = {}): DeskVessel {
  return {
    instanceId: "v-test",
    equipmentId: "beaker",
    contents: [{ chemicalId: "h2o", amountMl: 20 }],
    contentIds: ["h2o"],
    heatAttached: false,
    coolAttached: false,
    stirLevel: 0,
    position: { x: 0, y: 0 },
    fx: {},
    sim: defaultVesselSim(),
    ...partial,
  };
}

describe("volatilityOf", () => {
  it("ranks ethanol ≫ water ≫ oils ≫ wax", () => {
    expect(volatilityOf("c2h5oh")).toBeGreaterThan(volatilityOf("h2o"));
    expect(volatilityOf("h2o")).toBeGreaterThan(volatilityOf("limonene"));
    expect(volatilityOf("beeswax")).toBe(0);
  });
});

describe("tickVesselSim cool freeze path", () => {
  it("goes liquid → cold → slush → ice over elapsed cool time (not instant)", () => {
    let v = vessel({
      coolAttached: true,
      contents: [{ chemicalId: "h2o", amountMl: 25 }],
      contentIds: ["h2o"],
    });
    const t0 = 1_700_000_000_000;

    // Early cool — not ice yet
    let r = tickVesselSim(v, 1000, t0 + 1000);
    v = { ...v, sim: r.sim };
    expect(r.sim.phaseHint).not.toBe("ice");
    expect(r.sim.frost).toBeGreaterThan(0);

    // Advance to slush window
    r = tickVesselSim(
      { ...v, coolAttached: true },
      SLUSH_MS,
      t0 + SLUSH_MS + 500,
    );
    // Manually stamp cool elapsed as tick accumulates
    v = {
      ...v,
      coolAttached: true,
      sim: { ...r.sim, coolElapsedMs: SLUSH_MS + 500, frost: Math.max(r.sim.frost, 0.5) },
    };
    r = tickVesselSim(v, 500, t0 + SLUSH_MS + 1000);
    expect(["slush", "cold", "cooling", "ice"]).toContain(r.sim.phaseHint);
    expect(r.sim.phaseHint).not.toBe("ambient");

    // Full ice path
    v = {
      ...v,
      coolAttached: true,
      sim: {
        ...r.sim,
        coolElapsedMs: ICE_MS + 1000,
        frost: 0.9,
        temperature: 0.15,
      },
    };
    r = tickVesselSim(v, 500, t0 + ICE_MS + 2000);
    expect(r.sim.phaseHint).toBe("ice");
  });
});

describe("tickVesselSim heat evaporation", () => {
  it("reduces ethanol faster than water; wax/tin does not evaporate", () => {
    const t0 = 1_700_000_000_000;
    const eth = vessel({
      heatAttached: true,
      contents: [{ chemicalId: "c2h5oh", amountMl: 20 }],
      contentIds: ["c2h5oh"],
      sim: defaultVesselSim({ temperature: 0.85 }),
    });
    const water = vessel({
      heatAttached: true,
      contents: [{ chemicalId: "h2o", amountMl: 20 }],
      contentIds: ["h2o"],
      sim: defaultVesselSim({ temperature: 0.85 }),
    });
    const tin = vessel({
      equipmentId: "tin",
      heatAttached: true,
      contents: [
        { chemicalId: "beeswax", amountMl: 10 },
        { chemicalId: "limonene", amountMl: 5 },
      ],
      contentIds: ["beeswax", "limonene"],
      sim: defaultVesselSim({ temperature: 0.85 }),
    });

    const ethR = tickVesselSim(eth, 3000, t0 + 3000);
    const waterR = tickVesselSim(water, 3000, t0 + 3000);
    const tinR = tickVesselSim(tin, 3000, t0 + 3000);

    const ethLeft = ethR.contents?.[0]?.amountMl ?? 20;
    const waterLeft = waterR.contents?.[0]?.amountMl ?? 20;
    expect(ethLeft).toBeLessThan(20);
    expect(waterLeft).toBeLessThan(20);
    expect(ethLeft).toBeLessThan(waterLeft);

    // Tin: melt climbs, beeswax amount stays
    expect(tinR.sim.meltFraction).toBeGreaterThan(0);
    const wax = tinR.contents?.find((c) => c.chemicalId === "beeswax");
    expect(wax?.amountMl ?? 10).toBeGreaterThanOrEqual(9.5);
  });
});

describe("continuous agitation", () => {
  it("stays alive while stir on and eases out when shut off", () => {
    const t0 = 1_700_000_000_000;
    let v = vessel({
      sim: defaultVesselSim({
        stirActive: true,
        stirStartedAt: t0,
        agitation: 0,
      }),
    });
    let r = tickVesselSim(v, 400, t0 + 400);
    expect(r.sim.agitation).toBeGreaterThan(0.2);
    expect(r.fxPatch?.stirAt).toBeDefined();

    v = {
      ...v,
      sim: { ...r.sim, stirActive: false, stirStartedAt: undefined },
    };
    r = tickVesselSim(v, 600, t0 + 1000);
    expect(r.sim.agitation).toBeLessThan(0.25);
  });

  it("flags mix resolve after MIX_RESOLVE_MS", () => {
    const t0 = 1_700_000_000_000;
    const v = vessel({
      contents: [
        { chemicalId: "hcl", amountMl: 5 },
        { chemicalId: "naoh", amountMl: 5 },
      ],
      contentIds: ["hcl", "naoh"],
      sim: defaultVesselSim({
        mixActive: true,
        mixStartedAt: t0,
        mixResolved: false,
      }),
    });
    const early = tickVesselSim(v, 200, t0 + 200);
    expect(early.shouldResolveMix).toBeFalsy();
    const late = tickVesselSim(v, 200, t0 + MIX_RESOLVE_MS + 50);
    expect(late.shouldResolveMix).toBe(true);
  });
});

describe("materialProfile", () => {
  it("marks tin as solid chassis", () => {
    const p = materialProfile(
      [{ chemicalId: "beeswax", amountMl: 12 }],
      "tin",
    );
    expect(p.isSolidVessel).toBe(true);
    expect(p.volatility).toBeLessThan(0.2);
  });
});
