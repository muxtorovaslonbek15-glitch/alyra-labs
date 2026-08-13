import { SOLID_PERFUME_FORMULAS } from "./formulas";
import type { SolidPerfumeFormula } from "./types";

export function listSolidPerfumeFormulas(): SolidPerfumeFormula[] {
  return SOLID_PERFUME_FORMULAS;
}

export function getSolidPerfumeFormula(
  id: string,
): SolidPerfumeFormula | undefined {
  return SOLID_PERFUME_FORMULAS.find((f) => f.id === id);
}

export function playableSolidPerfumeFormulas(): SolidPerfumeFormula[] {
  return SOLID_PERFUME_FORMULAS.filter((f) => f.playable && f.labChemicalIds.length >= 3);
}

export function indiaSolidPerfumeFormulas(): SolidPerfumeFormula[] {
  return SOLID_PERFUME_FORMULAS.filter((f) => f.region === "india");
}
