import type { LabBridgeFormula } from "./types";
import { deskContentsFromBridge } from "./labBridge";
import { useDeskStore } from "@/store/deskStore";
import { assertLabActionAllowed, useAuthStore } from "@/store/authStore";
import { getChemical } from "@/domains/chemistry/data/chemicals";

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

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function stepDelayMs(): number {
  if (prefersReducedMotion()) return 40;
  return 400 + Math.floor(Math.random() * 500);
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const t = window.setTimeout(resolve, ms);
    const onAbort = () => {
      window.clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Derive ordered BuildQueue steps from a LabBridgeFormula.
 * Unmapped lines become mapping_gap events — never invent Lab chemicals.
 */
export function deriveBuildSteps(bridge: LabBridgeFormula): BuildStep[] {
  const steps: BuildStep[] = [];
  const title = bridge.title?.trim() || "your formula";
  const format = bridge.format || "EDP";

  steps.push({
    kind: "propose_accord",
    narration: `Starting from ${title}: ${format} teaching scale.`,
  });

  const equipmentId = bridge.vessel?.equipmentId || "beaker";
  steps.push({
    kind: "place_vessel",
    equipmentId,
    narration: `Placing a ${equipmentId.replace(/-/g, " ")} on the wood.`,
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

    if (isSolvent) {
      steps.push({
        kind: "add_solvent",
        chemicalId: labId,
        amountMl,
        name: line.name,
        narration: `Cutting with ${line.name} for the teaching ${format}.`,
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
      narration: `Setting ${line.name} to ~${amountMl} ml on the teaching scale.`,
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
      narration: "Stirring to wet the oils.",
    });
    if (bridge.vessel?.autoMix !== false) {
      steps.push({
        kind: "mix",
        narration: "Mixing. Watching the scent notes come up.",
      });
      steps.push({
        kind: "notes",
        narration: "Heart and base should read on the tutor when Mix settles.",
      });
    }
  }

  steps.push({
    kind: "done",
    narration: "Build complete. Tweak on the desk or refine in chat.",
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

  // Same gate as loadFormula / Open in Lab — Build counts as one guest action.
  if (!assertLabActionAllowed()) return "failed";

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
      equipmentId: bridge.vessel?.equipmentId || "beaker",
      contents,
      contentIds: contents.map((c) => c.chemicalId),
      autoMix: bridge.vessel?.autoMix !== false,
      heatAttached: Boolean(bridge.vessel?.heatAttached),
    });
    if (!vesselId) return "failed";
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
            step.equipmentId || "beaker",
            { x: 140, y: 100 },
          );
          if (!vesselId) return "failed";
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
          if (vesselId) useDeskStore.getState().mixVessel(vesselId);
          break;
        }
        default:
          break;
      }

      if (step.kind !== "done") {
        await sleep(stepDelayMs(), signal);
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
