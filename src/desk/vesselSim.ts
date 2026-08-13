/**
 * Physics-ish teaching sim for desk Heat / Cool / Stir / Shake / Mix.
 * Not CFD — material-aware timers + amount evaporation + phase hints.
 * Solids/tin: melt/set (no water-like evaporation).
 */

import type {
  DeskVessel,
  VesselContent,
  VesselPhaseHint,
  VesselSim,
} from "@/types";
import { getChemical } from "@/domains/chemistry/data/chemicals";
import { getVesselContents, syncVesselContents } from "@/desk/vesselContents";

export const SIM_TICK_MS = 250;
export const AMBIENT_TEMP = 0.5;
/** Legacy one-shot shake window (continuous shake ignores this). */
export const SHAKE_MS = 2400;
/** Cool path: water → slush → ice (full motion). */
export const SLUSH_MS = 8_000;
export const ICE_MS = 18_000;
/** Continuous mix auto-resolves chemistry after this. */
export const MIX_RESOLVE_MS = 1_800;
/** Agitation ease-out time constant (ms). */
export const AGITATION_EASE_MS = 550;

export function defaultVesselSim(
  partial?: Partial<VesselSim>,
): VesselSim {
  return {
    temperature: AMBIENT_TEMP,
    phaseHint: "ambient",
    heatElapsedMs: 0,
    coolElapsedMs: 0,
    stirActive: false,
    shakeActive: false,
    mixActive: false,
    agitation: 0,
    mixBlend: 0,
    frost: 0,
    viscosity: 0.16,
    meltFraction: 0,
    ...partial,
  };
}

export function ensureSim(vessel: DeskVessel): VesselSim {
  return vessel.sim ? { ...defaultVesselSim(), ...vessel.sim } : defaultVesselSim();
}

export type MaterialProfile = {
  /** Mass-weighted volatility 0–1 (ethanol high, wax ~0). */
  volatility: number;
  aqueousFrac: number;
  ethanolFrac: number;
  oilFrac: number;
  waxFrac: number;
  isSolidVessel: boolean;
};

/** Per-species teaching volatility 0–1. */
export function volatilityOf(chemicalId: string): number {
  const id = chemicalId.toLowerCase();
  if (id === "c2h5oh" || id === "ethanol") return 1;
  if (id === "h2o" || id === "water") return 0.45;
  if (id === "h2o2") return 0.3;
  if (id === "beeswax" || id.includes("wax")) return 0;
  const chem = getChemical(chemicalId);
  if (!chem) return 0.2;
  if (chem.state === "solid") return 0;
  if (chem.subcategory === "wax" || chem.tags?.includes("balm")) return 0;
  if (
    chem.subcategory === "fragrance" ||
    chem.tags?.includes("perfume") ||
    chem.solubility === "insoluble"
  ) {
    return 0.08;
  }
  if (chem.state === "aqueous") return 0.4;
  if (chem.isFuel) return 0.85;
  if (chem.state === "liquid") return 0.22;
  return 0.2;
}

/** Classify contents for heat/cool behavior. */
export function materialProfile(
  contents: VesselContent[],
  equipmentId: string,
): MaterialProfile {
  const isSolidVessel = equipmentId === "tin";
  const total = contents.reduce((s, c) => s + Math.max(0, c.amountMl), 0);
  if (total <= 0) {
    return {
      volatility: 0,
      aqueousFrac: 0,
      ethanolFrac: 0,
      oilFrac: 0,
      waxFrac: isSolidVessel ? 1 : 0,
      isSolidVessel,
    };
  }

  let aqueous = 0;
  let ethanol = 0;
  let oil = 0;
  let wax = 0;
  let volAcc = 0;

  for (const c of contents) {
    const chem = getChemical(c.chemicalId);
    const w = Math.max(0, c.amountMl) / total;
    const id = c.chemicalId;
    const tags = chem?.tags ?? [];
    const isWax =
      id === "beeswax" ||
      tags.includes("wax") ||
      chem?.subcategory === "wax";
    const isEthanol = id === "c2h5oh";
    const isWater =
      id === "h2o" || chem?.state === "aqueous" || id === "hcl" || id === "naoh";
    const isOil =
      !isWax &&
      !isEthanol &&
      (chem?.subcategory === "oil" ||
        tags.includes("fragrance") ||
        tags.includes("oil") ||
        Boolean(chem?.flashPointC != null && !isWater));

    if (isWax) {
      wax += w;
      volAcc += w * 0.02;
    } else if (isEthanol) {
      ethanol += w;
      volAcc += w * 1;
    } else if (isWater) {
      aqueous += w;
      volAcc += w * 0.45;
    } else if (isOil) {
      oil += w;
      volAcc += w * 0.12;
    } else {
      aqueous += w * 0.5;
      volAcc += w * volatilityOf(id);
    }
  }

  return {
    volatility: Math.min(1, volAcc),
    aqueousFrac: aqueous,
    ethanolFrac: ethanol,
    oilFrac: oil,
    waxFrac: wax,
    isSolidVessel,
  };
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function easeToward(current: number, target: number, ratePerSec: number, dtSec: number) {
  if (dtSec <= 0) return current;
  const t = 1 - Math.exp(-ratePerSec * dtSec);
  return current + (target - current) * t;
}

function phaseFromState(args: {
  temp: number;
  frost: number;
  coolOn: boolean;
  heatOn: boolean;
  coolElapsedMs: number;
  aqueousFrac: number;
  solid: boolean;
  melt: number;
}): VesselPhaseHint {
  const {
    temp,
    frost,
    coolOn,
    heatOn,
    coolElapsedMs,
    aqueousFrac,
    solid,
    melt,
  } = args;

  if (solid) {
    if (heatOn || melt > 0.55) return melt > 0.85 ? "molten" : "melting";
    if (coolOn || melt < 0.35) return melt < 0.15 ? "set" : "setting";
    return melt > 0.5 ? "molten" : "set";
  }

  if (heatOn || temp > AMBIENT_TEMP + 0.04) {
    if (temp >= 0.92) return "vapor";
    if (temp >= 0.72) return "simmer";
    if (temp >= 0.6) return "hot";
    return "warming";
  }

  if (coolOn || frost > 0.08 || temp < AMBIENT_TEMP - 0.04) {
    const aqueous = aqueousFrac >= 0.25;
    // Gradual freeze — timers first, frost as secondary gate (never instant ice)
    if (aqueous && coolElapsedMs >= ICE_MS && (frost > 0.7 || temp < 0.22)) {
      return "ice";
    }
    if (aqueous && coolElapsedMs >= SLUSH_MS && (frost > 0.4 || temp < 0.35)) {
      return "slush";
    }
    if (temp < 0.35 || frost > 0.4) return "cold";
    return "cooling";
  }

  return "ambient";
}

export type SimTickResult = {
  sim: VesselSim;
  contents?: VesselContent[];
  stirLevel?: number;
  fxPatch?: { stirAt?: number; shakeAt?: number; mixAt?: number };
  /** Fire mixVessel once after continuous mix engagement. */
  shouldResolveMix?: boolean;
};

export type TickVesselSimOpts = {
  reducedMotion?: boolean;
};

/**
 * Advance one vessel by dtMs. Pure — deskStore applies the patch.
 */
export function tickVesselSim(
  vessel: DeskVessel,
  dtMs: number,
  now: number,
  opts: TickVesselSimOpts = {},
): SimTickResult {
  const reduced = Boolean(opts.reducedMotion);
  const speed = reduced ? 3.2 : 1;
  const dt = (Math.max(0, Math.min(2000, dtMs)) / 1000) * speed;
  const rawDtMs = Math.max(0, Math.min(2000, dtMs)) * speed;
  const contents = getVesselContents(vessel);
  const mat = materialProfile(contents, vessel.equipmentId);
  const sim = ensureSim(vessel);
  const heatOn = vessel.heatAttached;
  const coolOn = vessel.coolAttached;
  const solid = mat.isSolidVessel || mat.waxFrac > 0.35;

  let temperature = sim.temperature;
  let frost = sim.frost;
  let viscosity = sim.viscosity;
  let meltFraction = sim.meltFraction;
  let heatElapsedMs = sim.heatElapsedMs;
  let coolElapsedMs = sim.coolElapsedMs;
  let mixBlend = sim.mixBlend;
  let stirActive = sim.stirActive;
  let shakeActive = sim.shakeActive;
  let mixActive = sim.mixActive;
  let mixResolved = Boolean(sim.mixResolved);
  let shakeUntil = sim.shakeUntil;
  let processStartedAt = sim.processStartedAt;
  let stirStartedAt = sim.stirStartedAt;
  let shakeStartedAt = sim.shakeStartedAt;
  let mixStartedAt = sim.mixStartedAt;
  let stirLevel = vessel.stirLevel;
  let agitation = sim.agitation;
  let nextContents: VesselContent[] | undefined;
  const fxPatch: { stirAt?: number; shakeAt?: number; mixAt?: number } = {};

  if (heatOn) {
    heatElapsedMs += rawDtMs;
    coolElapsedMs = 0;
    // Thermal mass: aqueous warms slower so convection reads before simmer.
    const rise = solid
      ? 0.1 + mat.waxFrac * 0.03
      : 0.055 + mat.ethanolFrac * 0.048 + mat.aqueousFrac * 0.022;
    temperature = clamp01(temperature + rise * dt);
    frost = clamp01(frost - 0.35 * dt);
    if (solid) {
      // Melt after softening — never evaporate wax like water
      if (temperature > 0.56) {
        const meltRate = 0.08 + (temperature - 0.56) * 0.32;
        meltFraction = clamp01(meltFraction + meltRate * dt);
      }
      viscosity = clamp01(0.55 - meltFraction * 0.4);
    } else {
      viscosity = clamp01(viscosity - 0.12 * dt);
    }
  } else if (coolOn) {
    coolElapsedMs += rawDtMs;
    heatElapsedMs = 0;
    const fall = solid ? 0.1 : 0.055 + mat.aqueousFrac * 0.028;
    temperature = clamp01(temperature - fall * dt);
    // Condensation first, then frost, then ice — ease toward time-gated targets (no pop).
    const condProgress = clamp01(coolElapsedMs / 2_800);
    const slushProgress = clamp01(coolElapsedMs / SLUSH_MS);
    const freezeProgress = clamp01(coolElapsedMs / ICE_MS);
    const aqueousGate = 0.35 + mat.aqueousFrac * 0.65;
    const frostTarget = clamp01(
      condProgress * 0.22 +
        Math.max(0, slushProgress - 0.22) * 0.4 +
        Math.max(0, freezeProgress - SLUSH_MS / ICE_MS) * 0.52 * aqueousGate,
    );
    frost = easeToward(frost, frostTarget, reduced ? 2.6 : 0.78, dt);
    if (solid) {
      meltFraction = clamp01(meltFraction - (0.12 + frost * 0.08) * dt);
      viscosity = clamp01(0.35 + (1 - meltFraction) * 0.5);
    } else {
      const viscTarget = clamp01(
        0.16 +
          condProgress * 0.08 +
          slushProgress * 0.22 * mat.aqueousFrac +
          freezeProgress * 0.54 * mat.aqueousFrac +
          frost * 0.1,
      );
      viscosity = easeToward(viscosity, viscTarget, reduced ? 2.2 : 0.82, dt);
    }
  } else {
    const toward = AMBIENT_TEMP - temperature;
    temperature = clamp01(temperature + toward * 0.045 * dt);
    frost = clamp01(frost - 0.04 * dt);
    if (solid) {
      if (meltFraction > 0.2 && meltFraction < 0.95) {
        meltFraction = clamp01(meltFraction - 0.02 * dt);
      }
      viscosity = clamp01(0.4 + (1 - meltFraction) * 0.4);
    } else {
      viscosity = clamp01(viscosity + (0.16 - viscosity) * 0.05 * dt);
    }
    if (!stirActive && !shakeActive && !mixActive) {
      heatElapsedMs = heatElapsedMs > 0 ? Math.max(0, heatElapsedMs - rawDtMs * 0.25) : 0;
      coolElapsedMs = coolElapsedMs > 0 ? Math.max(0, coolElapsedMs - rawDtMs * 0.15) : 0;
    }
  }

  // Evaporation — liquids only; never wax/solid chassis. Amount reduces by volatility.
  if (
    heatOn &&
    !solid &&
    contents.length > 0 &&
    temperature >= 0.62 &&
    mat.volatility > 0.05
  ) {
    const boilFactor = clamp01((temperature - 0.62) / 0.38);
    // Simmer kick: vapor loss climbs once nucleation starts
    const simmerKick = temperature >= 0.72 ? 1.18 : 0.82;
    const phaseFactor =
      frost > 0.85 ? 0.08 : frost > 0.5 ? 0.35 : 1;
    // Prefer species-weighted loss so ethanol drains faster than water than oils
    const next = contents.map((c) => {
      const vol = volatilityOf(c.chemicalId);
      if (vol < 0.01) return { ...c };
      const rate = vol * 0.42 * boilFactor * simmerKick * phaseFactor;
      const loss = rate * dt;
      return {
        chemicalId: c.chemicalId,
        amountMl: Math.round(Math.max(0, c.amountMl - loss) * 100) / 100,
      };
    });
    let filtered = next.filter((c) => c.amountMl >= 0.05);
    if (filtered.length === 0 && contents.length > 0) {
      const last = contents[contents.length - 1]!;
      filtered = [{ chemicalId: last.chemicalId, amountMl: 0.05 }];
    }
    nextContents = filtered;
  }

  // Continuous agitation target + ease-out when shut off
  const agTarget = clamp01(
    (stirActive ? 0.55 : 0) +
      (shakeActive ? 0.85 : 0) +
      (mixActive ? 0.95 : 0),
  );
  if (agTarget > agitation) {
    agitation = easeToward(agitation, agTarget, 5.5, dt);
  } else {
    const easeRate = reduced ? 8 : 1000 / AGITATION_EASE_MS;
    agitation = easeToward(agitation, agTarget, easeRate, dt);
    if (agitation < 0.02) agitation = 0;
  }

  // Continuous stir — pulse FX so visuals stay alive
  if (stirActive) {
    if (!stirStartedAt) stirStartedAt = now;
    fxPatch.stirAt = now;
    stirLevel = Math.min(3, stirLevel + 0.45 * dt);
    mixBlend = clamp01(mixBlend + 0.08 * dt);
    viscosity = clamp01(viscosity - 0.03 * dt);
  } else {
    stirStartedAt = undefined;
  }

  // Continuous shake (toggle) — ignore legacy shakeUntil auto-stop when toggling
  if (shakeActive) {
    if (shakeUntil != null && now >= shakeUntil && !sim.shakeStartedAt) {
      // legacy one-shot path
      shakeActive = false;
      shakeUntil = undefined;
      shakeStartedAt = undefined;
    } else {
      if (!shakeStartedAt) shakeStartedAt = now;
      fxPatch.shakeAt = now;
      mixBlend = clamp01(mixBlend + 0.12 * dt);
      stirLevel = Math.min(3, stirLevel + 0.6 * dt);
    }
  } else {
    shakeStartedAt = undefined;
    shakeUntil = undefined;
  }

  // Continuous mix / cast blend
  let shouldResolveMix = false;
  if (mixActive) {
    if (!mixStartedAt) mixStartedAt = now;
    fxPatch.mixAt = now;
    fxPatch.stirAt = now;
    mixBlend = clamp01(mixBlend + 0.35 * dt);
    stirLevel = Math.min(3, Math.max(stirLevel, 1) + 0.4 * dt);
    const resolveMs = reduced ? MIX_RESOLVE_MS / 2.5 : MIX_RESOLVE_MS;
    if (!mixResolved && now - mixStartedAt >= resolveMs) {
      shouldResolveMix = true;
      mixResolved = true;
    }
  } else {
    mixStartedAt = undefined;
    mixResolved = false;
  }

  // Mix blend eases toward 1 after Mix flash, then holds
  if (vessel.fx.mixAt && now - vessel.fx.mixAt < 2200) {
    mixBlend = clamp01(mixBlend + 0.55 * dt);
  }

  // Process timer anchor for HUD
  if (heatOn || coolOn) {
    if (processStartedAt == null) {
      processStartedAt = now - (heatOn ? heatElapsedMs : coolElapsedMs);
    }
  } else if (mixActive) {
    processStartedAt = mixStartedAt ?? now;
  } else if (stirActive) {
    processStartedAt = stirStartedAt ?? now;
  } else if (shakeActive) {
    processStartedAt = shakeStartedAt ?? now;
  } else if (agitation < 0.05) {
    processStartedAt = undefined;
  }

  const phaseHint = phaseFromState({
    temp: temperature,
    frost,
    coolOn,
    heatOn,
    coolElapsedMs,
    aqueousFrac: mat.aqueousFrac + mat.ethanolFrac * 0.3,
    solid,
    melt: meltFraction,
  });

  return {
    sim: {
      temperature,
      phaseHint,
      processStartedAt,
      heatElapsedMs,
      coolElapsedMs,
      stirActive,
      stirStartedAt,
      shakeActive,
      shakeStartedAt,
      shakeUntil,
      mixActive,
      mixStartedAt,
      mixResolved,
      agitation,
      mixBlend,
      frost,
      viscosity,
      meltFraction,
    },
    contents: nextContents
      ? syncVesselContents(nextContents).contents
      : undefined,
    stirLevel:
      Math.round(stirLevel * 100) / 100 !== vessel.stirLevel
        ? Math.round(stirLevel * 100) / 100
        : undefined,
    fxPatch:
      fxPatch.stirAt != null || fxPatch.shakeAt != null || fxPatch.mixAt != null
        ? fxPatch
        : undefined,
    shouldResolveMix,
  };
}

export function formatSimElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m <= 0) return `${r}s`;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function phaseLabel(
  phase: VesselPhaseHint,
  solid: boolean,
): string {
  if (solid) {
    switch (phase) {
      case "melting":
        return "Melting";
      case "molten":
        return "Molten";
      case "setting":
        return "Setting";
      case "set":
        return "Set";
      default:
        return "Chassis";
    }
  }
  switch (phase) {
    case "warming":
      return "Warming";
    case "hot":
      return "Hot";
    case "simmer":
      return "Simmer";
    case "vapor":
      return "Vapor";
    case "cooling":
      return "Cooling";
    case "cold":
      return "Cold";
    case "slush":
      return "Slush";
    case "ice":
      return "Ice";
    default:
      return "Ambient";
  }
}

/** Toolbar chip: which process is live + elapsed. */
export function primarySimHud(
  vessel: DeskVessel,
  now: number,
): { label: string; elapsedMs: number; phase: string } | null {
  const sim = ensureSim(vessel);
  const solid = vessel.equipmentId === "tin";
  if (vessel.heatAttached) {
    return {
      label: solid ? "Melt" : "Heat",
      elapsedMs: sim.heatElapsedMs || (sim.processStartedAt ? now - sim.processStartedAt : 0),
      phase: phaseLabel(sim.phaseHint, solid),
    };
  }
  if (vessel.coolAttached) {
    return {
      label: solid ? "Set" : "Cool",
      elapsedMs: sim.coolElapsedMs || (sim.processStartedAt ? now - sim.processStartedAt : 0),
      phase: phaseLabel(sim.phaseHint, solid),
    };
  }
  if (sim.mixActive && sim.mixStartedAt) {
    return {
      label: solid ? "Cast" : "Mix",
      elapsedMs: now - sim.mixStartedAt,
      phase: phaseLabel(sim.phaseHint, solid),
    };
  }
  if (sim.shakeActive && sim.shakeStartedAt) {
    return {
      label: "Shake",
      elapsedMs: now - sim.shakeStartedAt,
      phase: phaseLabel(sim.phaseHint, solid),
    };
  }
  if (sim.stirActive && sim.stirStartedAt) {
    return {
      label: "Stir",
      elapsedMs: now - sim.stirStartedAt,
      phase: phaseLabel(sim.phaseHint, solid),
    };
  }
  if (sim.phaseHint !== "ambient" && (sim.frost > 0.15 || sim.meltFraction > 0.15)) {
    return {
      label: phaseLabel(sim.phaseHint, solid),
      elapsedMs: 0,
      phase: phaseLabel(sim.phaseHint, solid),
    };
  }
  return null;
}

export function simNeedsTick(vessel: DeskVessel): boolean {
  const sim = ensureSim(vessel);
  if (vessel.heatAttached || vessel.coolAttached) return true;
  if (sim.stirActive || sim.shakeActive || sim.mixActive) return true;
  if (sim.agitation > 0.02) return true;
  if (Math.abs(sim.temperature - AMBIENT_TEMP) > 0.02) return true;
  if (sim.frost > 0.02) return true;
  if (sim.mixBlend > 0 && sim.mixBlend < 0.98 && vessel.fx.mixAt) return true;
  if (sim.meltFraction > 0.02 && sim.meltFraction < 0.98) return true;
  return false;
}
