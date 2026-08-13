/** Shared interview brain types — spec 2026-08-13-alyra-interview-chat.md */

export type InterviewSlot =
  | "occasion"
  | "climate_city"
  | "skin"
  | "intensity"
  | "likes"
  | "dislikes"
  | "format"
  | "time_of_day";

export type InterviewAct =
  | "idle"
  | "welcome"
  | "interview"
  | "compose"
  | "reveal"
  | "follow-up";

export type InterviewSurface = "wear" | "compose";

export type ClimateHint = "hot_humid" | "hot_dry" | "temperate" | "unknown";

export type IntensityPreference = "close" | "moderate" | "presence" | "unspecified";

export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

export type FormatPreference =
  | "solid"
  | "liquid"
  | "oil"
  | "press_tin"
  | "spray"
  | "unspecified";

export type SkinSensitivity = "none" | "mild" | "high" | "unspecified";

export interface InterviewChip {
  id: string;
  label: string;
}

export interface InterviewTurn {
  act: "interview";
  slot: InterviewSlot;
  prompt: string;
  chips?: InterviewChip[];
  echo?: string;
}

export interface RevealCardPayload {
  name: string;
  notes: { brightness: string[]; heart: string[]; skin: string[] };
  vibe: string;
  feel: string;
}

export interface InterviewAnswers {
  occasion?: string;
  indiaCity?: string | null;
  climateHint?: ClimateHint;
  skinSensitivity?: SkinSensitivity;
  /** Session-only until a profile field exists. */
  skinTypeSession?: "dry" | "oily";
  intensityPreference?: IntensityPreference;
  scentFamiliesLiked?: string[];
  scentFamiliesDisliked?: string[];
  notesMentioned?: string[];
  formatPreference?: FormatPreference;
  timeOfDayDefaults?: TimeOfDay[];
  giftOccasion?: boolean;
}

export interface InterviewMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  act?: InterviewAct;
  slot?: InterviewSlot;
  chips?: InterviewChip[];
  reveal?: RevealCardPayload;
  source?: "chip" | "typed" | "desk";
}

export interface InterviewProfileSlice {
  consentPersonalization?: boolean;
  consentChatLearning?: boolean;
  indiaCity?: string | null;
  climateHint?: string | null;
  occasionDefaults?: string[];
  skinSensitivity?: string | null;
  intensityPreference?: string | null;
  scentFamiliesLiked?: string[];
  scentFamiliesDisliked?: string[];
  notesMentioned?: string[];
  formatPreference?: string | null;
  timeOfDayDefaults?: string[];
}

export interface StartInterviewOpts {
  surface: InterviewSurface;
  skuId?: string | null;
  uid?: string | null;
  profile?: InterviewProfileSlice | null;
  now?: Date;
}
