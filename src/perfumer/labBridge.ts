import type {
  FormulaLine,
  LabBridgeFormula,
  StructuredPayload,
} from "./types";
import {
  amountMlFromPercent,
  DEFAULT_TEACHING_BATCH_ML,
  LAB_CHEMICAL_IDS,
  mapIngredientToLab,
  mapLabToPerfumer,
  normalizeIngredientId,
} from "./labIngredientMap";

export const LAB_BRIDGE_STORAGE_KEY = "alyra.labBridge.v1";
export const LAB_SESSION_STORAGE_KEY = "alyra.labSession.v1";
export const CHAT_BRIDGE_STORAGE_KEY = "alyra.chatBridge.v1";

const DISCLAIMER =
  "Teaching desk demo: IFRA flags are indicative only. Proxy materials are Lab stand-ins, not identical aroma chemicals.";

const ASSISTANT_FROM_LAB =
  "Got your Lab blend. Say what to refine, longevity, projection, or occasion, and I will adjust from what is on the desk.";

export interface LabSessionMeta {
  schemaVersion: 1;
  bridge: LabBridgeFormula;
  appliedAt: string;
}

export interface ChatBridgePayload {
  schemaVersion: 1;
  source: "lab";
  title: string;
  bridge: LabBridgeFormula;
  structured: StructuredPayload;
  assistantMessage: string;
  /** Honest caveats when reverse map lost fidelity */
  honestNotes?: string[];
}

export interface DeskContentLine {
  chemicalId: string;
  amountMl: number;
  name?: string;
}

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

function roleFromLabChemical(
  labChemicalId: string,
): LabBridgeFormula["lines"][0]["role"] {
  if (labChemicalId === "c2h5oh") return "solvent";
  if (labChemicalId === "beeswax") return "wax";
  if (labChemicalId === "cct" || labChemicalId === "jojoba-oil") return "carrier";
  // Lazy role hints from common Lab fragrance tags (avoid circular imports).
  const tops = new Set([
    "limonene",
    "bergamot-oil",
    "grapefruit-oil",
    "orange-oil",
    "lemon-oil",
    "mint-oil",
    "aldehydes",
    "pink-pepper",
    "apple-note",
    "pineapple-note",
    "pear-note",
    "cardamom-oil",
    "marine-note",
  ]);
  const hearts = new Set([
    "lavender-oil",
    "jasmine-oil",
    "rose-oil",
    "lily-oil",
    "geranium-oil",
    "iris-note",
    "violet-note",
    "cinnamon-oil",
    "nutmeg-oil",
    "orange-blossom",
    "ylang-ylang",
    "peony-note",
    "tea-note",
    "ginger-oil",
    "honey-note",
    "coconut-note",
    "saffron-note",
  ]);
  const bases = new Set([
    "sandalwood-oil",
    "cedarwood-oil",
    "vetiver-oil",
    "patchouli-oil",
    "vanilla-extract",
    "tonka-bean",
    "amber-resin",
    "musk-synthetic",
    "oakmoss",
    "benzoin",
    "incense-note",
    "leather-note",
    "cocoa-note",
    "coffee-note",
    "tobacco-note",
    "oud-oil",
    "cashmere-wood",
    "iso-e-super",
    "ambergris-synth",
  ]);
  if (tops.has(labChemicalId)) return "top";
  if (hearts.has(labChemicalId)) return "heart";
  if (bases.has(labChemicalId)) return "base";
  return "other";
}

function detectFormat(
  chemicalIds: string[],
  session?: LabBridgeFormula | null,
): LabBridgeFormula["format"] {
  if (session?.format) return session.format;
  if (chemicalIds.includes("beeswax")) return "Solid";
  if (
    !chemicalIds.includes("c2h5oh") &&
    (chemicalIds.includes("cct") || chemicalIds.includes("jojoba-oil"))
  ) {
    return "Oil";
  }
  return "EDP";
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
    // autoMix so Lab scent notes / tutor dossier appear after Open in Lab
    vessel: { equipmentId: "beaker", autoMix: true, heatAttached: false },
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

/** Keep original Perfumer ids while the user plays on the desk (round-trip). */
export function storeLabSession(bridge: LabBridgeFormula): void {
  try {
    const meta: LabSessionMeta = {
      schemaVersion: 1,
      bridge,
      appliedAt: new Date().toISOString(),
    };
    sessionStorage.setItem(LAB_SESSION_STORAGE_KEY, JSON.stringify(meta));
  } catch {
    /* quota / private mode */
  }
}

export function peekLabSession(): LabSessionMeta | null {
  try {
    const raw = sessionStorage.getItem(LAB_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LabSessionMeta;
    if (!parsed?.bridge?.lines?.length || parsed.schemaVersion !== 1) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearLabSession(): void {
  try {
    sessionStorage.removeItem(LAB_SESSION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Serialize current desk vessel into Lab→Chat payload.
 * Preserves original Perfumer ids from lab session when labChemicalIds match.
 * Never invents chemicals outside Lab inventory.
 */
export function buildChatBridgeFromDesk(input: {
  contents: DeskContentLine[];
  equipmentId?: "beaker" | "flask" | "test-tube";
  heatAttached?: boolean;
  sessionBridge?: LabBridgeFormula | null;
  title?: string;
}): ChatBridgePayload | { error: string } {
  const contents = input.contents.filter(
    (c) => c.chemicalId && Number(c.amountMl) > 0,
  );
  if (!contents.length) {
    return { error: "Nothing on the desk to send. Pour materials first." };
  }

  const unknown = contents.filter((c) => !LAB_CHEMICAL_IDS.has(c.chemicalId));
  const known = contents.filter((c) => LAB_CHEMICAL_IDS.has(c.chemicalId));
  if (!known.length) {
    return {
      error:
        "Desk materials are not in the fragrance inventory we can send to chat.",
    };
  }

  const honestNotes: string[] = [];
  if (unknown.length) {
    honestNotes.push(
      `Skipped ${unknown.length} non-inventory material${unknown.length === 1 ? "" : "s"}: ${unknown
        .map((u) => u.name || u.chemicalId)
        .slice(0, 6)
        .join(", ")}.`,
    );
  }

  const totalMl = known.reduce((s, c) => s + c.amountMl, 0) || 1;
  const sessionByLab = new Map<string, LabBridgeFormula["lines"][0]>();
  for (const line of input.sessionBridge?.lines || []) {
    if (!line.labChemicalId) continue;
    // Prefer first original line for this Lab id (preserves hedione over jasmine-oil).
    if (!sessionByLab.has(line.labChemicalId)) {
      sessionByLab.set(line.labChemicalId, line);
    }
  }

  const lines: LabBridgeFormula["lines"] = [];
  const proxyOrAliasNames: string[] = [];

  for (const c of known) {
    const sessionLine = sessionByLab.get(c.chemicalId);
    const reverse = mapLabToPerfumer(c.chemicalId);
    const perfumerIngredientId =
      sessionLine?.perfumerIngredientId || reverse.perfumerIngredientId;
    const mapStatus = sessionLine?.mapStatus || reverse.mapStatus;
    const percent = Math.round((c.amountMl / totalMl) * 1000) / 10;
    const name =
      sessionLine?.name ||
      c.name ||
      reverse.perfumerIngredientId ||
      c.chemicalId;

    if (
      sessionLine &&
      sessionLine.perfumerIngredientId !== reverse.perfumerIngredientId &&
      (sessionLine.mapStatus === "proxy" || sessionLine.mapStatus === "alias")
    ) {
      // Kept original Perfumer id; Lab showed a stand-in.
      proxyOrAliasNames.push(`${sessionLine.name} as ${c.chemicalId}`);
    } else if (!sessionLine && (mapStatus === "proxy" || mapStatus === "alias")) {
      proxyOrAliasNames.push(name);
    }

    lines.push({
      perfumerIngredientId,
      labChemicalId: c.chemicalId,
      name,
      percent: Math.max(0.1, percent),
      role: sessionLine?.role || roleFromLabChemical(c.chemicalId),
      amountMl: Math.round(c.amountMl * 10) / 10,
      mapStatus,
    });
  }

  if (proxyOrAliasNames.length) {
    honestNotes.push(
      `Lab stand-ins kept for: ${proxyOrAliasNames.slice(0, 6).join(", ")}.`,
    );
  }

  // Carry originally unmapped Perfumer lines (never on desk; honest gap).
  for (const line of input.sessionBridge?.lines || []) {
    if (line.labChemicalId) continue;
    lines.push({
      ...line,
      amountMl: undefined,
    });
  }

  const mappedCount = lines.filter((l) => l.labChemicalId).length;
  const unmappedIds = lines
    .filter((l) => !l.labChemicalId)
    .map((l) => l.perfumerIngredientId);
  const format = detectFormat(
    known.map((c) => c.chemicalId),
    input.sessionBridge,
  );
  const title =
    (input.title || input.sessionBridge?.title || "Lab blend")
      .toString()
      .slice(0, 120)
      .trim() || "Lab blend";

  const bridge: LabBridgeFormula = {
    schemaVersion: 1,
    title,
    format,
    batchGrams: input.sessionBridge?.batchGrams || 100,
    vessel: {
      equipmentId: input.equipmentId || "beaker",
      autoMix: true,
      heatAttached: Boolean(input.heatAttached),
    },
    lines,
    mappingReport: {
      mappedCount,
      unmappedCount: unmappedIds.length,
      unmappedIds,
    },
    disclaimer: input.sessionBridge?.disclaimer || DISCLAIMER,
    indiaContext: input.sessionBridge?.indiaContext || {
      climateNote:
        "Built for Indian heat and humidity: expect softer projection on solids; boosters help EDP wear through sweat and fabric.",
      preferenceTags: ["india-heat", "humid-wear"],
    },
    costInr: input.sessionBridge?.costInr,
    solidChassis: input.sessionBridge?.solidChassis,
  };

  const formulaLines: FormulaLine[] = lines
    .filter((l) => l.percent > 0)
    .map((l) => ({
      id: l.perfumerIngredientId,
      name: l.name,
      percent: l.percent,
      role: l.role,
    }));

  const accord = {
    top: formulaLines.filter((l) => l.role === "top").map((l) => l.name),
    heart: formulaLines
      .filter((l) => l.role === "heart")
      .map((l) => l.name),
    base: formulaLines
      .filter((l) => l.role === "base" || l.role === "fixative")
      .map((l) => l.name),
  };

  const structured: StructuredPayload = {
    formula: {
      type: format,
      vibe: title,
      formula: formulaLines,
      accord:
        accord.top.length || accord.heart.length || accord.base.length
          ? accord
          : undefined,
      explanation:
        honestNotes.length > 0
          ? `Synced from Lab desk volumes. ${honestNotes.join(" ")}`
          : "Synced from Lab desk volumes (percent from pour amounts).",
      disclaimer: DISCLAIMER,
    },
    lab_bridge: bridge,
    brief: {
      name: title,
      type: format,
      goal: "Refine Lab blend",
      constraints: { india: true },
    },
  };

  return {
    schemaVersion: 1,
    source: "lab",
    title,
    bridge,
    structured,
    assistantMessage: ASSISTANT_FROM_LAB,
    honestNotes: honestNotes.length ? honestNotes : undefined,
  };
}

export function storeChatBridge(payload: ChatBridgePayload): void {
  try {
    sessionStorage.setItem(CHAT_BRIDGE_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function consumeChatBridge(): ChatBridgePayload | null {
  try {
    const raw = sessionStorage.getItem(CHAT_BRIDGE_STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(CHAT_BRIDGE_STORAGE_KEY);
    const parsed = JSON.parse(raw) as ChatBridgePayload;
    if (
      !parsed?.bridge?.lines?.length ||
      parsed.schemaVersion !== 1 ||
      parsed.source !== "lab"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
