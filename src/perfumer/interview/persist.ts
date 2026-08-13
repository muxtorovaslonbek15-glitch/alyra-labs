import type { PerfumerProfile } from "@/perfumer/types";
import type { InterviewAnswers } from "./types";

export function canPutInterviewPrefs(
  profile: Pick<
    PerfumerProfile,
    "consentPersonalization" | "consentChatLearning"
  > | null,
): boolean {
  return Boolean(profile?.consentPersonalization && profile?.consentChatLearning);
}

export function answersToProfilePatch(answers: InterviewAnswers): Partial<PerfumerProfile> {
  const patch: Partial<PerfumerProfile> = {};
  if (answers.occasion) {
    const occ = answers.occasion === "skin" ? "daily" : answers.occasion;
    patch.occasionDefaults = [occ];
  }
  if (answers.indiaCity) {
    patch.indiaCity = answers.indiaCity;
    patch.locale = "en-IN";
  }
  if (answers.climateHint) patch.climateHint = answers.climateHint;
  if (answers.skinSensitivity && answers.skinSensitivity !== "unspecified") {
    patch.skinSensitivity = answers.skinSensitivity;
  }
  if (answers.intensityPreference && answers.intensityPreference !== "unspecified") {
    patch.intensityPreference = answers.intensityPreference;
  }
  if (answers.scentFamiliesLiked?.length) {
    patch.scentFamiliesLiked = answers.scentFamiliesLiked;
  }
  if (answers.scentFamiliesDisliked?.length) {
    patch.scentFamiliesDisliked = answers.scentFamiliesDisliked;
  }
  if (answers.notesMentioned?.length) {
    patch.notesMentioned = answers.notesMentioned;
  }
  if (answers.formatPreference && answers.formatPreference !== "unspecified") {
    patch.formatPreference = answers.formatPreference;
  }
  if (answers.timeOfDayDefaults?.length) {
    patch.timeOfDayDefaults = answers.timeOfDayDefaults;
  }
  if (answers.giftOccasion) {
    const occ = new Set(patch.occasionDefaults || []);
    occ.add("gifting");
    patch.occasionDefaults = [...occ];
  }
  return patch;
}
