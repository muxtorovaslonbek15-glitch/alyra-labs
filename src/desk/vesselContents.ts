import type { DeskVessel, VesselContent } from "@/types";
import { EQUIPMENT_BY_ID } from "@/domains/chemistry/data/equipment";
import { getChemical } from "@/domains/chemistry/data/chemicals";

/** Slot-capacity → mL for glassware (teaching volumes). */
const CAPACITY_ML: Record<string, number> = {
  beaker: 50,
  flask: 50,
  "test-tube": 10,
  "graduated-cylinder": 25,
  /** Teaching pan volume for solid perfume tin */
  tin: 30,
};

/**
 * Past marked capacity the vessel spills / foams.
 * Soft ceiling keeps the desk teachable (no infinite pours).
 */
export const OVERFILL_MAX_FACTOR = 1.8;

export function capacityMlForEquipment(equipmentId: string): number {
  const mapped = CAPACITY_ML[equipmentId];
  if (mapped) return mapped;
  const eq = EQUIPMENT_BY_ID[equipmentId];
  // Legacy slot capacity → ~8 ml per slot
  return Math.max(10, (eq?.capacity ?? 3) * 8);
}

/** Hard stop for pours / transfers (capacity × overfill factor). */
export function softCapacityMl(capacityMl: number): number {
  return capacityMl * OVERFILL_MAX_FACTOR;
}

/** Default pour volume when dragging a chemical into a vessel. */
export function defaultPourMl(chemicalId: string): number {
  const c = getChemical(chemicalId);
  if (!c) return 2;
  if (c.subcategory === "fragrance" || c.tags.includes("perfume")) return 1;
  if (c.id === "c2h5oh" || c.id === "h2o") return 5;
  if (c.state === "aqueous") return 2;
  if (c.state === "liquid") return 2;
  if (c.state === "solid") return 1;
  if (c.state === "gas") return 1;
  return 2;
}

export function totalMl(contents: VesselContent[]): number {
  return contents.reduce((sum, c) => sum + Math.max(0, c.amountMl), 0);
}

export function overflowMl(
  contents: VesselContent[],
  capacityMl: number,
): number {
  return Math.max(0, totalMl(contents) - capacityMl);
}

export function isOverflowing(
  contents: VesselContent[],
  capacityMl: number,
): boolean {
  return overflowMl(contents, capacityMl) > 0.05;
}

export function contentIdsFrom(contents: VesselContent[]): string[] {
  return contents.map((c) => c.chemicalId);
}

export function amountsMap(contents: VesselContent[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of contents) {
    out[c.chemicalId] = (out[c.chemicalId] ?? 0) + c.amountMl;
  }
  return out;
}

export function getVesselContents(vessel: DeskVessel): VesselContent[] {
  if (vessel.contents?.length) return vessel.contents;
  // Legacy persist: presence-only ids
  if (vessel.contentIds?.length) {
    return vessel.contentIds.map((chemicalId) => ({
      chemicalId,
      amountMl: defaultPourMl(chemicalId),
    }));
  }
  return [];
}

export function syncVesselContents(
  contents: VesselContent[],
): Pick<DeskVessel, "contents" | "contentIds"> {
  const cleaned = contents
    .filter((c) => c.amountMl > 0.001)
    .map((c) => ({
      chemicalId: c.chemicalId,
      amountMl: Math.round(c.amountMl * 100) / 100,
    }));
  return {
    contents: cleaned,
    contentIds: contentIdsFrom(cleaned),
  };
}

/**
 * Add or increase amount. May exceed marked capacity (overflow / foam);
 * hard-stops at softCapacityMl. Returns null only when soft-full.
 */
export function pourIntoContents(
  contents: VesselContent[],
  chemicalId: string,
  amountMl: number,
  capacityMl: number,
): VesselContent[] | null {
  const used = totalMl(contents);
  const room = Math.max(0, softCapacityMl(capacityMl) - used);
  if (room < 0.05) return null;
  const add = Math.min(amountMl, room);
  if (add < 0.05) return null;

  const next = contents.map((c) => ({ ...c }));
  const idx = next.findIndex((c) => c.chemicalId === chemicalId);
  if (idx >= 0) {
    next[idx] = {
      chemicalId,
      amountMl: next[idx]!.amountMl + add,
    };
  } else {
    next.push({ chemicalId, amountMl: add });
  }
  return next;
}

/**
 * Transfer volume into target. May overfill past marked capacity
 * (spill / foam); hard-stops at softCapacityMl.
 */
export function transferContents(
  from: VesselContent[],
  to: VesselContent[],
  capacityMl: number,
): { from: VesselContent[]; to: VesselContent[]; movedMl: number } | null {
  const room = Math.max(0, softCapacityMl(capacityMl) - totalMl(to));
  if (room < 0.05 || from.length === 0) return null;

  let remainingRoom = room;
  let movedMl = 0;
  const nextFrom = from.map((c) => ({ ...c }));
  const nextTo = to.map((c) => ({ ...c }));

  for (let i = 0; i < nextFrom.length && remainingRoom > 0.05; i++) {
    const item = nextFrom[i]!;
    const take = Math.min(item.amountMl, remainingRoom);
    if (take < 0.05) continue;
    item.amountMl -= take;
    remainingRoom -= take;
    movedMl += take;
    const ti = nextTo.findIndex((c) => c.chemicalId === item.chemicalId);
    if (ti >= 0) {
      nextTo[ti] = {
        chemicalId: item.chemicalId,
        amountMl: nextTo[ti]!.amountMl + take,
      };
    } else {
      nextTo.push({ chemicalId: item.chemicalId, amountMl: take });
    }
  }

  if (movedMl < 0.05) return null;
  return {
    from: nextFrom.filter((c) => c.amountMl > 0.001),
    to: nextTo.filter((c) => c.amountMl > 0.001),
    movedMl,
  };
}

export function setContentAmount(
  contents: VesselContent[],
  chemicalId: string,
  amountMl: number,
  capacityMl: number,
): VesselContent[] {
  const others = contents.filter((c) => c.chemicalId !== chemicalId);
  const othersTotal = totalMl(others);
  const maxForThis = Math.max(0, softCapacityMl(capacityMl) - othersTotal);
  const clamped = Math.min(Math.max(0, amountMl), maxForThis);
  if (clamped < 0.05) return others;
  return [...others, { chemicalId, amountMl: clamped }];
}

/**
 * Visual fill %. Marked-full sits near the lip (~82); overfill climbs
 * past the rim so CSS overflow / foam can read.
 */
export function fillPctFromContents(
  contents: VesselContent[],
  equipmentId: string,
): number {
  const cap = capacityMlForEquipment(equipmentId);
  const used = totalMl(contents);
  if (used <= 0 || cap <= 0) return 0;
  const ratio = used / cap;
  if (ratio <= 1) {
    return 12 + ratio * 70;
  }
  return Math.min(112, 82 + (ratio - 1) * 55);
}

/** Volume-weighted blend of chemical colors (hex). */
export function blendFillColor(contents: VesselContent[]): string | undefined {
  if (contents.length === 0) return undefined;
  let r = 0;
  let g = 0;
  let b = 0;
  let w = 0;
  for (const c of contents) {
    const chem = getChemical(c.chemicalId);
    const hex = chem?.color;
    if (!hex || hex === "transparent") continue;
    const rgb = parseHex(hex);
    if (!rgb) continue;
    const weight = Math.max(0.05, c.amountMl);
    r += rgb.r * weight;
    g += rgb.g * weight;
    b += rgb.b * weight;
    w += weight;
  }
  if (w <= 0) return undefined;
  return `#${toHex(r / w)}${toHex(g / w)}${toHex(b / w)}`;
}

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const raw = hex.replace("#", "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : raw.slice(0, 6);
  if (full.length !== 6) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function toHex(n: number): string {
  return Math.round(Math.max(0, Math.min(255, n)))
    .toString(16)
    .padStart(2, "0");
}

/** Density-ordered immiscible layers (oil over water heuristic). */
export function layerColors(contents: VesselContent[]): string[] {
  if (contents.length < 2) return [];
  const aqueous = contents.filter((c) => {
    const chem = getChemical(c.chemicalId);
    return (
      chem?.state === "aqueous" ||
      chem?.id === "h2o" ||
      chem?.solubility === "soluble"
    );
  });
  const oils = contents.filter((c) => {
    const chem = getChemical(c.chemicalId);
    return (
      chem?.solubility === "insoluble" ||
      chem?.subcategory === "fragrance" ||
      chem?.tags.includes("perfume")
    );
  });
  if (aqueous.length === 0 || oils.length === 0) return [];
  const bottom = blendFillColor(aqueous);
  const top = blendFillColor(oils);
  return [bottom, top].filter(Boolean) as string[];
}
