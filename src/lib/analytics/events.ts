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
  | "star_milestone_mailto"
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
  | "builder_history_close"
  | "builder_chat_achievement"
  | "profile_prefs_saved"
  | "consent_personalization_changed"
  | "consent_chat_learning_changed"
  | "groq_key_configured"
  | "groq_key_removed"
  | "perfumer_chat_sent"
  | "format_choice"
  | "groq_key_saved"
  | "groq_key_deleted"
  | "consent_updated"
  | "session_start"
  | "audience_choose"
  | "wear_chip"
  | "perfumer_format_choice"
  | "interview_slot_answered";

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
  "star_milestone_mailto",
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
  "builder_chat_achievement",
  "profile_prefs_saved",
  "consent_personalization_changed",
  "consent_chat_learning_changed",
  "groq_key_configured",
  "groq_key_removed",
  "perfumer_chat_sent",
  "format_choice",
  "groq_key_saved",
  "groq_key_deleted",
  "consent_updated",
  "session_start",
  "audience_choose",
  "wear_chip",
  "perfumer_format_choice",
  "interview_slot_answered",
]);
