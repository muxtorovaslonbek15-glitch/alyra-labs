/** Org-scoped lab content packs — which goals / atelier surfaces are available. */

export type ContentPackId =
  | "classic"
  | "products"
  | "perfume"
  | "advanced";

export interface ContentPack {
  id: ContentPackId;
  label: string;
  description: string;
  /** Product / classic goal ids (empty = none from PRODUCT_GOALS) */
  goalIds: string[] | "all-classic" | "all-product";
  /** Include perfume atelier recipes */
  perfumeAtelier: boolean;
  /** Include freeform perfume builder */
  freeformPerfume: boolean;
  /** Include OCR scan workbench */
  scan: boolean;
}

export const CONTENT_PACKS: Record<ContentPackId, ContentPack> = {
  classic: {
    id: "classic",
    label: "Classic lab",
    description: "Neutralization, precipitation, gases, redox demos",
    goalIds: "all-classic",
    perfumeAtelier: false,
    freeformPerfume: false,
    scan: true,
  },
  products: {
    id: "products",
    label: "Everyday products",
    description: "Soap, sanitizer, bath bombs, ink, balm, solid perfume tins, and kitchen chemistry",
    goalIds: "all-product",
    perfumeAtelier: false,
    freeformPerfume: false,
    scan: false,
  },
  perfume: {
    id: "perfume",
    label: "Perfume atelier",
    description: "Inspired scent recipes, freeform builder, inventions",
    goalIds: [],
    perfumeAtelier: true,
    freeformPerfume: true,
    scan: false,
  },
  advanced: {
    id: "advanced",
    label: "Advanced + scan",
    description: "Full classics plus OCR note scan and live tutor depth",
    goalIds: "all-classic",
    perfumeAtelier: false,
    freeformPerfume: false,
    scan: true,
  },
};

export const DEFAULT_CONTENT_PACKS: ContentPackId[] = [
  "classic",
  "products",
  "perfume",
  "advanced",
];

export function listContentPacks(): ContentPack[] {
  return Object.values(CONTENT_PACKS);
}

export function resolvePackFeatures(packIds: string[] | undefined | null) {
  const ids = (
    packIds?.length ? packIds : DEFAULT_CONTENT_PACKS
  ).filter((id): id is ContentPackId => id in CONTENT_PACKS);

  const packs = ids.map((id) => CONTENT_PACKS[id]);
  return {
    packIds: ids,
    perfumeAtelier: packs.some((p) => p.perfumeAtelier),
    freeformPerfume: packs.some((p) => p.freeformPerfume),
    scan: packs.some((p) => p.scan),
    includeAllClassic: packs.some((p) => p.goalIds === "all-classic"),
    includeAllProduct: packs.some((p) => p.goalIds === "all-product"),
    extraGoalIds: packs.flatMap((p) =>
      Array.isArray(p.goalIds) ? p.goalIds : [],
    ),
  };
}
