"use client";

import {
  EMPTY_STUDY_AGGREGATE,
  type Study,
  type StudyAggregate,
  type StudyMode,
  type StudyRating,
  type StudyRatingScores,
} from "@/domains/chemistry/market";
import { useAuthStore } from "@/store/authStore";
import { attachStudyToFormula, getPublishedFormula } from "./formulas";
import { newLocalId, readCollection, writeCollection } from "./localStore";

/**
 * Ro'yxatdan o'tish olib tashlandi — panel-study va baholar Firestore
 * o'rniga shu brauzerda saqlanadi. Eksport nomlari va tiplar o'zgarmadi.
 */
const STUDIES_KEY = "alyra-local-studies";
const RATINGS_KEY = "alyra-local-study-ratings";

function raterUid(): string {
  return useAuthStore.getState().user?.uid ?? "local";
}

function allStudies(): Record<string, Study> {
  return readCollection<Study>(STUDIES_KEY);
}

function allRatings(): Record<string, StudyRating> {
  return readCollection<StudyRating>(RATINGS_KEY);
}

function clampScore(n: unknown): number | null {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  const v = Math.round(n);
  if (v < 1 || v > 7) return null;
  return v;
}

function recomputeAggregate(ratings: StudyRatingScores[]): StudyAggregate {
  if (ratings.length === 0) return { ...EMPTY_STUDY_AGGREGATE };
  const sum = {
    liking: 0,
    harshness: 0,
    longevityGuess: 0,
    clarity: 0,
    uniqueness: 0,
  };
  for (const r of ratings) {
    sum.liking += r.liking;
    sum.harshness += r.harshness;
    sum.longevityGuess += r.longevityGuess;
    sum.clarity += r.clarity;
    sum.uniqueness += r.uniqueness;
  }
  const n = ratings.length;
  return {
    count: n,
    liking: sum.liking / n,
    harshness: sum.harshness / n,
    longevityGuess: sum.longevityGuess / n,
    clarity: sum.clarity / n,
    uniqueness: sum.uniqueness / n,
  };
}

export async function getStudy(id: string): Promise<Study | null> {
  return allStudies()[id] ?? null;
}

export async function listStudiesForFormula(
  formulaId: string,
): Promise<Study[]> {
  return Object.values(allStudies())
    .filter((s) => s.formulaId === formulaId)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 12);
}

export async function createStudy(input: {
  formulaId: string;
  mode: StudyMode;
  title?: string;
}): Promise<Study> {
  const formula = await getPublishedFormula(input.formulaId);
  if (!formula) throw new Error("Formula not found");

  const now = Date.now();
  const study: Study = {
    id: newLocalId("s"),
    formulaId: formula.id,
    creatorUid: raterUid(),
    creatorName: formula.authorName,
    mode: input.mode,
    title: (input.title?.trim() || `Panel — ${formula.title}`).slice(0, 80),
    formulaLabel: input.mode === "labeled" ? formula.title : undefined,
    bottleColor: formula.bottleColor,
    contents: formula.contents,
    createdAt: now,
    updatedAt: now,
    aggregate: { ...EMPTY_STUDY_AGGREGATE },
  };

  const rows = allStudies();
  rows[study.id] = study;
  writeCollection(STUDIES_KEY, rows);
  await attachStudyToFormula(formula.id, study.id);
  return study;
}

export async function getMyStudyRating(
  studyId: string,
): Promise<StudyRating | null> {
  return allRatings()[`${studyId}_${raterUid()}`] ?? null;
}

export async function submitStudyRating(
  studyId: string,
  scores: StudyRatingScores,
): Promise<{ rating: StudyRating; aggregate: StudyAggregate }> {
  const liking = clampScore(scores.liking);
  const harshness = clampScore(scores.harshness);
  const longevityGuess = clampScore(scores.longevityGuess);
  const clarity = clampScore(scores.clarity);
  const uniqueness = clampScore(scores.uniqueness);
  if (
    liking === null ||
    harshness === null ||
    longevityGuess === null ||
    clarity === null ||
    uniqueness === null
  ) {
    throw new Error("All ratings must be integers from 1 to 7");
  }

  const studies = allStudies();
  const study = studies[studyId];
  if (!study) throw new Error("Study not found");

  const ratingId = `${studyId}_${raterUid()}`;
  const ratings = allRatings();
  if (ratings[ratingId]) {
    throw new Error("You already rated this study");
  }

  const rating: StudyRating = {
    id: ratingId,
    studyId,
    raterUid: raterUid(),
    liking,
    harshness,
    longevityGuess,
    clarity,
    uniqueness,
    createdAt: Date.now(),
  };
  ratings[ratingId] = rating;
  writeCollection(RATINGS_KEY, ratings);

  const aggregate = recomputeAggregate(
    Object.values(ratings).filter((r) => r.studyId === studyId),
  );
  studies[studyId] = { ...study, aggregate, updatedAt: Date.now() };
  writeCollection(STUDIES_KEY, studies);

  return { rating, aggregate };
}

export async function listRatingsForStudy(
  studyId: string,
): Promise<StudyRating[]> {
  return Object.values(allRatings()).filter((r) => r.studyId === studyId);
}
