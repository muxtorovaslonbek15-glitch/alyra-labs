/** Teaching solid-perfume catalog — sourced public DIY / academic notes, not brand SKUs. */

export interface SolidPerfumeSource {
  title: string;
  url: string;
}

export interface SolidPerfumeChassis {
  waxPercent: number;
  oilPercent: number;
  fragranceLoadPercent: number;
  /** Desk chemical when playable; otherwise a teaching label. */
  waxId: string;
  carrierId: string;
}

export interface SolidPerfumeFormula {
  id: string;
  title: string;
  tagline: string;
  family: string;
  /** India-climate / attar-adjacent teaching, not a claim of origin. */
  region: "india" | "global";
  chassis: SolidPerfumeChassis;
  /** Scent notes (common names). */
  notes: string[];
  /** Short making steps. */
  steps: string[];
  climateNote: string;
  disclaimer: string;
  sources: SolidPerfumeSource[];
  /** When true, desk chemicals exist for a guided goal. */
  playable: boolean;
  labChemicalIds: string[];
}

export const SOLID_PERFUME_DISCLAIMER =
  "Teaching reconstruction from public DIY and academic sources. Not medical advice. Not IFRA-certified compliance. Not an Alyra SKU or secret formula. Check IFRA / supplier limits before any real-skin use. India heat: a firmer wax ratio helps the tin hold.";
