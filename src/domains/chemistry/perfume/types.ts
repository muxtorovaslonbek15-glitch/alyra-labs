/** Perfume atelier + stars economy contracts */

export type NoteRole = "solvent" | "top" | "heart" | "base" | "fixative";

export type ScentFamily =
  | "citrus"
  | "floral"
  | "oriental"
  | "woody"
  | "aromatic"
  | "gourmand"
  | "fresh"
  | "chypre"
  | "fougere"
  | "leather"
  | "aquatic";

export type PerfumeConcentration = "edt" | "edp" | "parfum" | "cologne";

/** Guided goal difficulty — step budgets: easy 6–9, medium 10–14, hard 15–20, very-hard 21–30 */
export type GoalDifficulty = "easy" | "medium" | "hard" | "very-hard";

export const DIFFICULTY_REWARDS: Record<
  GoalDifficulty,
  { xp: number; stars: number; label: string }
> = {
  easy: { xp: 50, stars: 1, label: "Easy" },
  medium: { xp: 100, stars: 1, label: "Medium" },
  hard: { xp: 150, stars: 2, label: "Hard" },
  "very-hard": { xp: 200, stars: 3, label: "Very hard" },
};

export function difficultyFromSteps(stepCount: number): GoalDifficulty {
  if (stepCount <= 9) return "easy";
  if (stepCount <= 14) return "medium";
  if (stepCount <= 20) return "hard";
  return "very-hard";
}

export interface FragranceNote {
  id: string;
  /** Links to Chemical.id in the inventory */
  chemicalId: string;
  name: string;
  role: NoteRole;
  family: ScentFamily;
  blurb: string;
}

export interface PerfumeNotePyramid {
  top: string[];
  heart: string[];
  base: string[];
  /** Optional fixative chemical ids */
  fixative?: string[];
}

export interface PerfumeRecipe {
  id: string;
  displayName: string;
  /** e.g. "Inspired by Paco Rabanne" */
  brandLabel: string;
  family: ScentFamily;
  blurb: string;
  /** Plain-language “smells like…” line for reward / shelf dossiers */
  smellsLike?: string;
  /** Short note bullets (“has notes of…”) — defaults from pyramid */
  hasNotesOf?: string[];
  concentration: PerfumeConcentration;
  /** Note pyramid using FragranceNote.id (not chemical id) */
  notes: PerfumeNotePyramid;
  /**
   * Chemical ids that must all be present to craft this recipe.
   * Always includes ethanol (c2h5oh) plus signature notes.
   */
  requiredChemicalIds: string[];
  /** Teaching volumes (ml) for each required chemical — ethanol larger, oils ~1 ml. */
  targetContents: import("@/types").VesselContent[];
  difficulty: GoalDifficulty;
  xpReward: number;
  /** First clear only */
  starReward: number;
  badgeId: string;
  icon: string;
  bottleColor: string;
}

export type StarShopCategory =
  | "bottle-skin"
  | "desk-theme"
  | "rare-note"
  | "spray-fx";

export interface StarShopItem {
  id: string;
  title: string;
  description: string;
  /** Price in stars; catalog spans 20–150 */
  price: number;
  category: StarShopCategory;
  icon: string;
}

/** Client ↔ API contracts for stars economy */

export interface DailyStarClaimRequest {
  /** Client may send local clock; server uses its own time */
  clientNow?: number;
}

export interface DailyStarClaimResponse {
  granted: boolean;
  stars: number;
  lastDailyStarAt: number;
  /** ms until next IST calendar day (0 if grantable now) */
  nextClaimInMs: number;
  message: string;
}

export interface StarUnlockRequest {
  itemId: string;
}

export interface StarUnlockResponse {
  ok: boolean;
  stars: number;
  unlockedShopItemIds: string[];
  itemId?: string;
  error?: string;
}

export interface ProgressSyncExtended {
  xp: number;
  discoveredIds: string[];
  badgeIds: string[];
  /** First-clear perfume recipe ids to merge server-side */
  completedPerfumeIds?: string[];
  /** Stars earned client-side for perfume clears (server validates & caps) */
  starsDelta?: number;
}
