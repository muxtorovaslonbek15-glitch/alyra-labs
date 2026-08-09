export type AnalyticsEventName =
  | "page_view"
  | "desk_place_equipment"
  | "desk_add_chemical"
  | "desk_mix"
  | "goal_start"
  | "goal_complete"
  | "auth_gate_shown"
  | "signup_complete"
  | "scan_upload"
  | "tutor_open"
  | "perfume_start"
  | "perfume_complete"
  | "perfume_atelier_open"
  | "daily_star_claim"
  | "star_unlock"
  | "invention_named"
  | "invention_improved"
  | "invention_shared"
  | "shelf_open"
  | "shelf_remix"
  | "market_remix"
  | "market_open"
  | "formula_published"
  | "study_created"
  | "study_rated"
  | "perfumer_lab_bridge"
  | "perfumer_chat_bridge"
  | "builder_plan_ready"
  | "builder_build_start"
  | "builder_build_complete"
  | "builder_stop"
  | "builder_chat_mode"
  | "builder_history_open"
  | "builder_history_select"
  | "builder_history_new"
  | "builder_history_close";

export const ANALYTICS_EVENT_NAMES = new Set<string>([
  "page_view",
  "desk_place_equipment",
  "desk_add_chemical",
  "desk_mix",
  "goal_start",
  "goal_complete",
  "auth_gate_shown",
  "signup_complete",
  "scan_upload",
  "tutor_open",
  "perfume_start",
  "perfume_complete",
  "perfume_atelier_open",
  "daily_star_claim",
  "star_unlock",
  "invention_named",
  "invention_improved",
  "invention_shared",
  "shelf_open",
  "shelf_remix",
  "market_remix",
  "market_open",
  "formula_published",
  "study_created",
  "study_rated",
  "perfumer_lab_bridge",
  "perfumer_chat_bridge",
  "builder_plan_ready",
  "builder_build_start",
  "builder_build_complete",
  "builder_stop",
  "builder_chat_mode",
  "builder_history_open",
  "builder_history_select",
  "builder_history_new",
  "builder_history_close",
]);
