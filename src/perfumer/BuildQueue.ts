import type { LabBridgeFormula } from "./types";
import { deskContentsFromBridge } from "./labBridge";
import { useDeskStore } from "@/store/deskStore";
import { assertLabActionAllowed, useAuthStore } from "@/store/authStore";
import { getChemical } from "@/domains/chemistry/data/chemicals";
import {
  buildStepDelayMs,
  buildUsesTin,
  isSolidBridge,
  resolveBuildEquipmentId,
  sleep,
  solidMeltDelayMs,
} from "@/animation/motion";
import { markSolidSession } from "./solidDetect";

export type BuildEventKind =
  | "propose_accord"
  | "place_vessel"
  | "add_chemical"
  | "set_amount"
  | "add_solvent"
  | "stir"
  | "mix"
  | "notes"
  | "mapping_gap"
  | "done";

export interface BuildStep {
  kind: BuildEventKind;
  narration: string;
  chemicalId?: string;
  amountMl?: number;
  name?: string;
  equipmentId?: string;
}

/**
 * Derive ordered BuildQueue steps from a LabBridgeFormula.
 * Unmapped lines become mapping_gap events — never invent Lab chemicals.
 * Solid / tin: melt → blend → cast language (vessel FX owned by solid track).
 */
export function deriveBuildSteps(bridge: LabBridgeFormula): BuildStep[] {
  const steps: BuildStep[] = [];
  const title = bridge.title?.trim() || "your formula";
  const format = bridge.format || "EDP";
  const solid = isSolidBridge(bridge);
  const equipmentId = resolveBuildEquipmentId(bridge);
  const tin = equipmentId === "tin";
  const vesselLabel = tin
    ? "tin"
    : equipmentId.replace(/-/g, " ");

  steps.push({
    kind: "propose_accord",
    narration: solid
      ? `Starting from ${title}: solid teaching scale.`
      : `Starting from ${title}: ${format} teaching scale.`,
  });

  steps.push({
    kind: "place_vessel",
    equipmentId,
    narration: tin
      ? "Placing a tin on the wood."
      : solid
        ? `Placing a ${vesselLabel} for the solid cast.`
        : `Placing a ${vesselLabel} on the wood.`,
  });

  const mapped = bridge.lines.filter((l) => l.labChemicalId);
  const unmapped = bridge.lines.filter((l) => !l.labChemicalId);

  for (const line of mapped) {
    const labId = line.labChemicalId!;
    const amountMl =
      typeof line.amountMl === "number" && line.amountMl > 0
        ? Math.round(line.amountMl * 10) / 10
        : 0.5;
    const role = line.role ? `, ${line.role}` : "";
    const isSolvent =
      line.role === "solvent" || labId === "c2h5oh" || labId === "cct";
    const isWax = line.role === "wax" || labId === "beeswax";
    const isCarrier = line.role === "carrier";

    if (solid && (isWax || isCarrier)) {
      steps.push({
        kind: isWax ? "add_chemical" : "add_solvent",
        chemicalId: labId,
        amountMl,
        name: line.name,
        narration: isWax
          ? `Melting ${line.name} into the chassis.`
          : `Folding in ${line.name} for slip and softness.`,
      });
    } else if (isSolvent && !solid) {
      steps.push({
        kind: "add_solvent",
        chemicalId: labId,
        amountMl,
        name: line.name,
        narration: `Cutting with ${line.name} for the teaching ${format}.`,
      });
    } else if (solid) {
      steps.push({
        kind: "add_chemical",
        chemicalId: labId,
        amountMl,
        name: line.name,
        narration: `Blending ${line.name}${role} into the melt, ~${amountMl} ml.`,
      });
    } else {
      steps.push({
        kind: "add_chemical",
        chemicalId: labId,
        amountMl,
        name: line.name,
        narration: `Pouring ${line.name}${role}, aiming ~${amountMl} ml.`,
      });
    }

    steps.push({
      kind: "set_amount",
      chemicalId: labId,
      amountMl,
      name: line.name,
      narration: solid
        ? `Setting ${line.name} on the teaching scale.`
        : `Setting ${line.name} to ~${amountMl} ml on the teaching scale.`,
    });
  }

  for (const line of unmapped) {
    steps.push({
      kind: "mapping_gap",
      name: line.name,
      narration: `Skipping ${line.name}: not in Lab inventory yet.`,
    });
  }

  if (mapped.length > 0) {
    steps.push({
      kind: "stir",
      narration: solid
        ? "Stirring the melt until the notes read even."
        : "Stirring to wet the oils.",
    });
    if (bridge.vessel?.autoMix !== false) {
      steps.push({
        kind: "mix",
        narration: solid
          ? tin
            ? "Casting the puck into the tin."
            : "Casting the balm — watching it set."
          : "Mixing. Watching the scent notes come up.",
      });
      steps.push({
        kind: "notes",
        narration: solid
          ? "Ready when the puck reads matte. Press, warm, wear."
          : "Heart and base should read on the tutor when Mix settles.",
      });
    }
  }

  steps.push({
    kind: "done",
    narration: solid
      ? "Build complete. Refine in chat or press the puck when it sets."
      : "Build complete. Tweak on the desk or refine in chat.",
  });

  return steps;
}

export type BuildQueueResult = "done" | "stopped" | "failed";

export interface RunBuildQueueOptions {
  bridge: LabBridgeFormula;
  /** Bulk hydrate via loadFormula — power-user / a11y path */
  instant?: boolean;
  signal?: AbortSignal;
  onStep?: (step: BuildStep, index: number, total: number) => void;
}

/**
 * Timed desk mutations from a Plan payload.
 * Guest rule: counts as one guest action (same as Open in Lab / loadFormula).
 */
export async function runBuildQueue(
  opts: RunBuildQueueOptions,
): Promise<BuildQueueResult> {
  const { bridge, instant = false, signal, onStep } = opts;
  const steps = deriveBuildSteps(bridge);
  const solid = isSolidBridge(bridge);
  const tin = buildUsesTin(bridge);
  const equipmentId = resolveBuildEquipmentId(bridge);

  // Same gate as loadFormula / Open in Lab — Build counts as one guest action.
  if (!assertLabActionAllowed()) return "failed";
  if (solid) markSolidSession();

  if (instant) {
    const contents = deskContentsFromBridge(bridge);
    if (!contents.length) {
      onStep?.(
        {
          kind: "mapping_gap",
          narration: "Nothing mapped: no materials to place.",
        },
        0,
        1,
      );
      return "failed";
    }
    const vesselId = useDeskStore.getState().loadFormula({
      equipmentId,
      contents,
      contentIds: contents.map((c) => c.chemicalId),
      autoMix: bridge.vessel?.autoMix !== false,
      heatAttached:
        Boolean(bridge.vessel?.heatAttached) || solid,
    });
    if (!vesselId) return "failed";
    if (tin && bridge.vessel?.autoMix !== false) {
      useDeskStore.setState((s) => ({
        vessels: s.vessels.map((v) =>
          v.instanceId === vesselId
            ? {
                ...v,
                fx: {
                  ...v.fx,
                  castRevealAt: Date.now(),
                  mixAt: v.fx.mixAt ?? Date.now(),
                },
              }
            : v,
        ),
      }));
    }
    const done = steps[steps.length - 1];
    onStep?.(done, steps.length - 1, steps.length);
    return "done";
  }

  // Clear desk for a clean Build theater
  useDeskStore.setState({
    vessels: [],
    activeVesselId: null,
    lastExplanationVesselId: null,
  });

  let vesselId: string | null = null;
  let poured = false;

  try {
    for (let i = 0; i < steps.length; i += 1) {
      if (signal?.aborted) return "stopped";
      const step = steps[i];
      onStep?.(step, i, steps.length);

      switch (step.kind) {
        case "propose_accord":
        case "mapping_gap":
        case "notes":
        case "done":
          break;
        case "place_vessel": {
          vesselId = useDeskStore.getState().placeEquipment(
            step.equipmentId || equipmentId,
            { x: 140, y: 100 },
          );
          if (!vesselId) return "failed";
          // Solid: warm the chassis before oils — heat FX lives on the vessel.
          if (solid) {
            useDeskStore.getState().attachHeat(vesselId);
            await sleep(solidMeltDelayMs(), signal);
          }
          break;
        }
        case "add_chemical":
        case "add_solvent": {
          if (!vesselId || !step.chemicalId) break;
          const ok = useDeskStore.getState().addChemicalToVessel(
            vesselId,
            step.chemicalId,
            step.amountMl,
            { consumeStock: false, bypassGuestLimit: true },
          );
          if (ok) poured = true;
          break;
        }
        case "set_amount": {
          if (!vesselId || !step.chemicalId || step.amountMl == null) break;
          useDeskStore
            .getState()
            .setChemicalAmount(vesselId, step.chemicalId, step.amountMl);
          break;
        }
        case "stir": {
          if (vesselId) useDeskStore.getState().stirVessel(vesselId, false);
          break;
        }
        case "mix": {
          if (vesselId) {
            // Solid cast: cool/set beat before Mix when heat was on.
            if (solid) {
              const v = useDeskStore
                .getState()
                .vessels.find((x) => x.instanceId === vesselId);
              if (v?.heatAttached) {
                useDeskStore.getState().toggleHeat(vesselId);
                useDeskStore.getState().attachCool(vesselId);
                await sleep(buildStepDelayMs("notes", { solid, tin }), signal);
              }
            }
            useDeskStore.getState().mixVessel(vesselId);
          }
          break;
        }
        default:
          break;
      }

      if (step.kind === "done") continue;

      // Skip long wait after set_amount when it immediately follows its pour.
      const prev = i > 0 ? steps[i - 1] : null;
      const settleOnly =
        step.kind === "set_amount" &&
        prev &&
        (prev.kind === "add_chemical" || prev.kind === "add_solvent") &&
        prev.chemicalId === step.chemicalId;

      const delay = settleOnly
        ? buildStepDelayMs("set_amount", { solid, tin })
        : buildStepDelayMs(step.kind, { solid, tin });

      // place_vessel already slept for solid melt — don't double-wait the full place delay.
      if (step.kind === "place_vessel" && solid) {
        await sleep(buildStepDelayMs("set_amount", { solid, tin }), signal);
      } else {
        await sleep(delay, signal);
      }
    }

    if (poured) {
      const auth = useAuthStore.getState();
      if (!auth.user) auth.recordGuestChemicalAdd();
    }

    return signal?.aborted ? "stopped" : "done";
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      if (poured) {
        const auth = useAuthStore.getState();
        if (!auth.user) auth.recordGuestChemicalAdd();
      }
      return "stopped";
    }
    return "failed";
  }
}

/** Human label for timeline HUD */
export function buildStepLabel(step: BuildStep): string {
  if (step.name) return step.name;
  if (step.chemicalId) {
    return getChemical(step.chemicalId)?.name || step.chemicalId;
  }
  return step.kind.replace(/_/g, " ");
}
