import type { FormulaLine, LabBridgeFormula, StructuredPayload } from "./types";
import {
  amountMlFromPercent,
  DEFAULT_TEACHING_BATCH_ML,
  mapIngredientToLab,
  normalizeIngredientId,
} from "./labIngredientMap";

export const LAB_BRIDGE_STORAGE_KEY = "alyra.labBridge.v1";

const DISCLAIMER =
  "Teaching desk demo: IFRA flags are indicative only. Proxy materials are Lab stand-ins, not identical aroma chemicals.";

function roleFromLine(line: FormulaLine): LabBridgeFormula["lines"][0]["role"] {
  const r = String(line.role || "").toLowerCase();
  if (
    ["solvent", "top", "heart", "base", "fixative", "wax", "carrier", "other"].includes(
      r,
    )
  ) {
    return r as LabBridgeFormula["lines"][0]["role"];
  }
  if (r === "middle") return "heart";
  return "other";
}

/** Build LabBridgeFormula from structured formula (client-side; preferred for Open in Lab). */
export function buildLabBridgeFromStructured(
  structured?: StructuredPayload | null,
  opts?: { title?: string; teachingBatchMl?: number },
): LabBridgeFormula | null {
  if (structured?.lab_bridge?.lines?.length) {
    return structured.lab_bridge;
  }

  const gen = structured?.formula;
  const rawLines: FormulaLine[] = gen?.formula || [];
  if (!rawLines.length) return null;

  const teachingBatchMl = opts?.teachingBatchMl || DEFAULT_TEACHING_BATCH_ML;
  const formatRaw = String(
    (gen as { type?: string } | null | undefined)?.type || "EDP",
  ).toUpperCase();
  const format: LabBridgeFormula["format"] =
    formatRaw === "SOLID" ? "Solid" : formatRaw === "OIL" ? "Oil" : "EDP";

  const title =
    (opts?.title ||
      (gen as { vibe?: string; family?: string } | null | undefined)?.vibe ||
      "Perfumer formula"
    )
      .toString()
      .slice(0, 120)
      .trim() || "Perfumer formula";

  const lines: LabBridgeFormula["lines"] = [];
  const seenLab = new Set<string>();

  for (const line of rawLines) {
    if (!(Number(line.percent) > 0)) continue;
    const perfumerIngredientId = normalizeIngredientId(line.id);
    const mapped = mapIngredientToLab(perfumerIngredientId);
    if (mapped.labChemicalId) seenLab.add(mapped.labChemicalId);
    lines.push({
      perfumerIngredientId,
      labChemicalId: mapped.labChemicalId,
      name: line.name || perfumerIngredientId,
      percent: Number(line.percent),
      role: roleFromLine(line),
      amountMl: amountMlFromPercent(line.percent, teachingBatchMl),
      mapStatus: mapped.mapStatus,
    });
  }

  if (format === "EDP" && !seenLab.has("c2h5oh")) {
    lines.unshift({
      perfumerIngredientId: "ethanol",
      labChemicalId: "c2h5oh",
      name: "Ethanol (carrier)",
      percent: 55,
      role: "solvent",
      amountMl: Math.max(8, teachingBatchMl * 0.55),
      mapStatus: "alias",
    });
  }

  if (format === "Solid" && !seenLab.has("beeswax")) {
    lines.push({
      perfumerIngredientId: "beeswax",
      labChemicalId: "beeswax",
      name: "Beeswax",
      percent: 50,
      role: "wax",
      amountMl: amountMlFromPercent(50, teachingBatchMl),
      mapStatus: "exact",
    });
  }

  const mappedCount = lines.filter((l) => l.labChemicalId).length;
  const unmappedIds = lines
    .filter((l) => !l.labChemicalId)
    .map((l) => l.perfumerIngredientId);

  const cost = structured?.cost || gen?.cost;
  const payload: LabBridgeFormula = {
    schemaVersion: 1,
    title,
    format,
    batchGrams: cost?.batchGrams || 100,
    vessel: { equipmentId: "beaker", autoMix: false, heatAttached: false },
    lines,
    mappingReport: {
      mappedCount,
      unmappedCount: unmappedIds.length,
      unmappedIds,
    },
    disclaimer: DISCLAIMER,
    indiaContext: {
      climateNote:
        "Built for Indian heat and humidity: expect softer projection on solids; boosters help EDP wear through sweat and fabric.",
      preferenceTags: ["india-heat", "humid-wear"],
    },
  };

  if (cost?.totalCostInr != null) {
    payload.costInr = {
      totalCostInr: cost.totalCostInr,
      batchGrams: cost.batchGrams || 100,
      summary: cost.summary,
    };
  }

  return payload;
}

/** Deduped contents for deskStore.loadFormula */
export function deskContentsFromBridge(bridge: LabBridgeFormula): Array<{
  chemicalId: string;
  amountMl: number;
}> {
  const byId = new Map<string, number>();
  for (const line of bridge.lines) {
    if (!line.labChemicalId) continue;
    const prev = byId.get(line.labChemicalId) || 0;
    byId.set(line.labChemicalId, prev + (line.amountMl || 0.5));
  }
  return [...byId.entries()].map(([chemicalId, amountMl]) => ({
    chemicalId,
    amountMl: Math.round(amountMl * 10) / 10,
  }));
}

export function storeLabBridge(bridge: LabBridgeFormula): void {
  try {
    sessionStorage.setItem(LAB_BRIDGE_STORAGE_KEY, JSON.stringify(bridge));
  } catch {
    /* quota / private mode */
  }
}

export function consumeLabBridge(): LabBridgeFormula | null {
  try {
    const raw = sessionStorage.getItem(LAB_BRIDGE_STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(LAB_BRIDGE_STORAGE_KEY);
    const parsed = JSON.parse(raw) as LabBridgeFormula;
    if (!parsed?.lines?.length || parsed.schemaVersion !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}
