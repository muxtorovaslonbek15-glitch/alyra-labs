/** Domain-agnostic base types. Shared desk/drag/animation/gamification use only these. */

export type DomainId = string;

export interface Item {
  id: string;
  name: string;
  domain: DomainId;
  category: string;
  subcategory: string;
  tags: string[];
  icon: string;
}

export type EngineEffectKind =
  | "color"
  | "gas"
  | "precipitate"
  | "heat"
  | "hazard"
  | "smoke"
  | "blast"
  | "burst"
  | "boil"
  | "melt"
  | "foam"
  | "glow"
  | "sparkle"
  | "bubble"
  | "solidify"
  | "dirty"
  | "layer"
  | "flash"
  | "steam"
  | "crystal"
  | "turbid"
  | "overflow";

export interface EngineEffect {
  kind: EngineEffectKind;
  /** CSS color for color/heat glow, or descriptive token */
  value?: string;
  /** exo | endo for heat; severity for hazard */
  intensity?: "low" | "medium" | "high" | "exo" | "endo";
  messageKey?: string;
}

export interface EngineInput {
  itemIds: string[];
  /** Optional volume map chemicalId → mL */
  amounts?: Record<string, number>;
  /** Equipment function present (e.g. heat-source) */
  equipmentFunctions?: string[];
}

/** One chemical species in a vessel with a teaching volume. */
export interface VesselContent {
  chemicalId: string;
  amountMl: number;
}

export interface EngineResult {
  ok: boolean;
  products: Item[];
  label?: string;
  effects: EngineEffect[];
  explanationKey?: string;
  discoveryId: string;
  /** Post-mix vessel contents after teaching stoichiometry (when applied). */
  nextContents?: VesselContent[];
  /** chemicalId that limited reaction extent */
  limitingReagentId?: string;
}

export interface DomainModule {
  id: DomainId;
  label: string;
  getItems: () => Item[];
  getEquipment: () => Item[];
  resolve: (input: EngineInput) => EngineResult;
}

/** Teaching phase for live heat/cool sim (not full CFD). */
export type VesselPhaseHint =
  | "ambient"
  | "warming"
  | "hot"
  | "simmer"
  | "vapor"
  | "cooling"
  | "cold"
  | "slush"
  | "ice"
  | "melting"
  | "molten"
  | "setting"
  | "set";

/**
 * Always-alive process state on a vessel.
 * Temperature is a 0–1 proxy (0 = ice, 0.5 = room, 1 = hard boil / full melt).
 */
export interface VesselSim {
  temperature: number;
  phaseHint: VesselPhaseHint;
  /** Wall ms when current heat/cool/stir engagement began (for HUD elapsed). */
  processStartedAt?: number;
  heatElapsedMs: number;
  coolElapsedMs: number;
  stirActive: boolean;
  stirStartedAt?: number;
  shakeActive: boolean;
  shakeStartedAt?: number;
  /** @deprecated Prefer continuous shakeActive toggle; kept for migrate. */
  shakeUntil?: number;
  mixActive: boolean;
  mixStartedAt?: number;
  /** Chemistry already resolved for this mix engagement. */
  mixResolved?: boolean;
  /** 0–1 continuous agitation (eases out when stir/shake/mix shut off). */
  agitation: number;
  /** 0–1 blend toward mixed appearance after Mix/Cast. */
  mixBlend: number;
  /** 0–1 frost rim / ice bath residue (persists partially when cool off). */
  frost: number;
  /** 0–1 viscosity proxy (higher = thicker / frozen). */
  viscosity: number;
  /** 0–1 solid chassis melt (tin); wax does not evaporate. */
  meltFraction: number;
}

/** Ephemeral bench FX timestamps (ms) — drive CSS one-shots */
export interface VesselFx {
  pourAt?: number;
  stirAt?: number;
  shakeAt?: number;
  mixAt?: number;
  heatFlashAt?: number;
  coolFlashAt?: number;
  /** Last poured chemical color for splash tint */
  pourColor?: string;
  /** Optional desk-local origin of a pour stream (lip at transfer start) */
  pourFrom?: { x: number; y: number };
  /** Source fill % stamped at transfer start (drain animation while store is empty) */
  sourceFillPct?: number;
  /** Vessel→vessel transfer window */
  transferAt?: number;
  transferFromId?: string;
  transferToId?: string;
  /** Role during an active transfer */
  transferRole?: "source" | "target";
  /** Solid cast reveal storyboard start (ms) — tin only */
  castRevealAt?: number;
}

/** Compact IFRA teaching screen attached to live preview. */
export interface LiveIfraSummary {
  status: "pass" | "fail" | "unknown";
  category: string;
  categoryLabel: string;
  version: string;
  screened: boolean;
  failCount: number;
  unknownCount: number;
  ingredients: {
    chemicalId: string;
    name: string;
    actualPct: number;
    maxPct?: number;
    status: "pass" | "fail" | "unknown";
  }[];
  disclaimer: string;
}

/** Live formula preview attached while pouring (before Mix). */
export interface LiveVesselPreview {
  fillColor?: string;
  layerColors?: string[];
  fillPct: number;
  ethanolPct: number;
  oilLoadPct: number;
  concentrationLabel?: string;
  scentVerdict?: string;
  scentSummary?: string;
  hazards: { level: "info" | "warn" | "danger"; message: string; effect?: EngineEffectKind }[];
  notes: { role: string; name: string; amountMl: number; pct: number }[];
  effects: EngineEffect[];
  /** IFRA Standards–aligned teaching screen (Category 4 default). */
  ifra?: LiveIfraSummary;
}

/** Instance of equipment placed on the desk */
export interface DeskVessel {
  instanceId: string;
  equipmentId: string;
  /** Volumetric contents (source of truth). */
  contents: VesselContent[];
  /**
   * Unique chemical ids present — kept in sync with `contents` for goals / legacy.
   */
  contentIds: string[];
  /** Heat source attached to this vessel */
  heatAttached: boolean;
  /** Cold source (ice bath) attached to this vessel */
  coolAttached: boolean;
  /** How vigorously the liquid has been stirred (0–3) */
  stirLevel: number;
  lastResult?: EngineResult;
  /** Live preview while adjusting amounts (perfume / hazards). */
  livePreview?: LiveVesselPreview;
  position: { x: number; y: number };
  fx: VesselFx;
  /** Live heat/cool/stir process sim (optional on legacy persist). */
  sim?: VesselSim;
}
