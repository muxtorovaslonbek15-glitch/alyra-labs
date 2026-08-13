/**
 * Solid perfume intent — deterministic detection for desk vessel morph.
 * No user-facing "solid mode" toggle; structured fields win.
 */

import type {
  FormulaLine,
  LabBridgeFormula,
  StructuredPayload,
} from "./types";

export const SOLID_SESSION_KEY = "alyra.solidSession.v1";

export interface SolidChassisRatios {
  waxPercent: number;
  oilPercent: number;
  fragranceLoadPercent: number;
}

export const SOLID_BRIEF_RE =
  /\b(solid|balm|wax|tin|compact|puck|beeswax|candelilla|press[- ]to[- ]skin|alcohol[- ]free)\b/i;
export const LIQUID_BRIEF_RE =
  /\b(edp|eau\b|spray|mist|ethanol|alcohol\s+spray|juice|parfum\b|edt\b)\b/i;

const ALYRA_SOLID_SKUS = new Set([
  "fruit-damour",
  "fruit-d-amour",
  "fruitdamour",
  "riva-azul",
  "rivaazul",
  "ecos-de-lisboa",
  "ecosdelisboa",
]);

export function isTinEquipment(equipmentId: string | undefined | null): boolean {
  return equipmentId === "tin";
}

export function markSolidSession(): void {
  try {
    sessionStorage.setItem(SOLID_SESSION_KEY, "1");
    localStorage.setItem(SOLID_SESSION_KEY, "1");
  } catch {
    /* private mode */
  }
}

export function hadSolidSession(): boolean {
  try {
    if (sessionStorage.getItem(SOLID_SESSION_KEY) === "1") return true;
  } catch {
    /* ignore */
  }
  try {
    return localStorage.getItem(SOLID_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

/** Prefer explicit chassis; else roll up formula lines by role. */
export function chassisFromLines(
  lines: FormulaLine[] | LabBridgeFormula["lines"] | undefined,
  fallback?: LabBridgeFormula["solidChassis"] | null,
): SolidChassisRatios | null {
  if (
    fallback &&
    (fallback.waxPercent != null ||
      fallback.oilPercent != null ||
      fallback.fragranceLoadPercent != null)
  ) {
    const wax = Math.round(Number(fallback.waxPercent) || 0);
    const oil = Math.round(Number(fallback.oilPercent) || 0);
    const fo = Math.round(Number(fallback.fragranceLoadPercent) || 0);
    if (wax + oil + fo > 0) {
      return {
        waxPercent: wax,
        oilPercent: oil,
        fragranceLoadPercent: fo,
      };
    }
  }
  if (!lines?.length) return null;

  let wax = 0;
  let oil = 0;
  let fo = 0;
  for (const line of lines) {
    const pct = Number(line.percent) || 0;
    if (!(pct > 0)) continue;
    const role = String(line.role || "").toLowerCase();
    const id = String(
      "labChemicalId" in line
        ? line.labChemicalId || line.perfumerIngredientId
        : line.id || "",
    ).toLowerCase();
    const name = String(line.name || "").toLowerCase();
    if (
      role === "wax" ||
      id.includes("wax") ||
      id === "beeswax" ||
      name.includes("wax")
    ) {
      wax += pct;
    } else if (
      role === "carrier" ||
      role === "solvent" ||
      id === "cct" ||
      id === "jojoba-oil" ||
      id.includes("jojoba") ||
      name.includes("carrier")
    ) {
      oil += pct;
    } else {
      fo += pct;
    }
  }
  const sum = wax + oil + fo;
  if (!(sum > 0)) return null;
  // Normalize soft if over 100 from overlapping roles
  if (sum > 105) {
    return {
      waxPercent: Math.round((wax / sum) * 100),
      oilPercent: Math.round((oil / sum) * 100),
      fragranceLoadPercent: Math.round((fo / sum) * 100),
    };
  }
  return {
    waxPercent: Math.round(wax),
    oilPercent: Math.round(oil),
    fragranceLoadPercent: Math.round(fo),
  };
}

export function chassisFromStructured(
  structured?: StructuredPayload | null,
): SolidChassisRatios | null {
  if (!structured) return null;
  const bridge = structured.lab_bridge;
  if (bridge?.format === "Solid" || bridge?.solidChassis) {
    return chassisFromLines(bridge.lines, bridge.solidChassis);
  }
  const gen = structured.formula;
  const solidBlock = structured.solid ?? gen?.solid;
  if (solidBlock && typeof solidBlock === "object") {
    const s = solidBlock as Record<string, unknown>;
    const wax =
      Number(s.waxPercent ?? s.waxPct ?? s.wax) ||
      Number((s.chassis as Record<string, unknown> | undefined)?.wax) ||
      0;
    const oil =
      Number(s.oilPercent ?? s.oilPct ?? s.oil) ||
      Number((s.chassis as Record<string, unknown> | undefined)?.oil) ||
      0;
    const fo =
      Number(s.fragranceLoadPercent ?? s.foPct ?? s.fo) ||
      Number((s.chassis as Record<string, unknown> | undefined)?.fo) ||
      0;
    if (wax + oil + fo > 0) {
      return {
        waxPercent: Math.round(wax),
        oilPercent: Math.round(oil),
        fragranceLoadPercent: Math.round(fo),
      };
    }
  }
  const type = String(gen?.type || structured.brief?.type || "").toLowerCase();
  if (type.includes("solid") || type.includes("balm")) {
    return chassisFromLines(gen?.formula);
  }
  return null;
}

function catalogLooksSolid(structured?: StructuredPayload | null): boolean {
  if (!structured) return false;
  const blob = JSON.stringify({
    brief: structured.brief,
    india: structured.indiaContext,
    formula: structured.formula
      ? { vibe: structured.formula.vibe, family: structured.formula.family }
      : null,
  }).toLowerCase();
  for (const sku of ALYRA_SOLID_SKUS) {
    if (blob.includes(sku.replace(/-/g, "")) || blob.includes(sku)) return true;
  }
  if (
    /\b(fruit\s*d['']?amour|riva\s*azul|ecos\s*de\s*lisboa)\b/i.test(blob)
  ) {
    return true;
  }
  return false;
}

/**
 * Preference order (highest wins):
 * 1. Lab bridge / Build payload format or vessel tin
 * 2. Alyra catalog solid SKU
 * 3. FormulaCard / agent type Solid
 * 4. Chassis block present
 * 5. Brief language (weak)
 * 6. Default liquid
 */
export function isSolidIntent(input: {
  bridge?: LabBridgeFormula | null;
  structured?: StructuredPayload | null;
  equipmentId?: string | null;
  contentIds?: string[];
  briefText?: string | null;
}): boolean {
  const { bridge, structured, equipmentId, contentIds, briefText } = input;

  if (isTinEquipment(equipmentId) || isTinEquipment(bridge?.vessel?.equipmentId)) {
    return true;
  }
  if (bridge?.format === "Solid") return true;
  if (bridge?.solidChassis) return true;

  if (catalogLooksSolid(structured)) return true;

  const typeRaw = String(
    structured?.formula?.type ||
      structured?.brief?.type ||
      bridge?.format ||
      "",
  ).toLowerCase();
  if (
    typeRaw.includes("solid") ||
    typeRaw.includes("balm") ||
    typeRaw === "wax"
  ) {
    return true;
  }
  if (
    typeRaw.includes("edp") ||
    typeRaw.includes("spray") ||
    typeRaw === "oil" ||
    typeRaw.includes("eau")
  ) {
    // Explicit liquid/oil wins over weak brief fluff unless chassis says solid
    if (!chassisFromStructured(structured) && !contentIds?.includes("beeswax")) {
      return false;
    }
  }

  if (chassisFromStructured(structured)) return true;
  if (contentIds?.includes("beeswax")) return true;

  const text = [
    briefText,
    structured?.brief?.goal,
    structured?.brief?.vibe,
    structured?.formula?.vibe,
    structured?.formula?.explanation,
  ]
    .filter(Boolean)
    .join(" ");
  if (LIQUID_BRIEF_RE.test(text)) return false;
  if (SOLID_BRIEF_RE.test(text)) return true;

  return false;
}

/** Vessel equipment for Lab bridge hydrate. */
export function vesselEquipmentForFormat(
  format: LabBridgeFormula["format"],
): LabBridgeFormula["vessel"]["equipmentId"] {
  return format === "Solid" ? "tin" : "beaker";
}
