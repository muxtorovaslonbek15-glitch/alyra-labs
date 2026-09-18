"use client";

import {
  marketBadgeFromIfra,
  type PublishedFormula,
  type PublishFormulaInput,
} from "@/domains/chemistry/market";
import { useAuthStore } from "@/store/authStore";
import { newLocalId, readCollection, writeCollection } from "./localStore";

/**
 * Ro'yxatdan o'tish olib tashlandi — nashr qilingan formulalar Firestore
 * o'rniga shu brauzerda saqlanadi. Eksport nomlari va tiplar o'zgarmadi.
 */
const FORMULAS_KEY = "alyra-local-formulas";

function authorName(): string {
  const { user, profile } = useAuthStore.getState();
  return (
    profile?.displayName?.trim() ||
    user?.displayName?.trim() ||
    "Lab chemist"
  );
}

function authorUid(): string {
  return useAuthStore.getState().user?.uid ?? "local";
}

function all(): Record<string, PublishedFormula> {
  return readCollection<PublishedFormula>(FORMULAS_KEY);
}

export async function getPublishedFormula(
  id: string,
): Promise<PublishedFormula | null> {
  return all()[id] ?? null;
}

export async function listPublishedFormulas(opts?: {
  search?: string;
  badge?: "screened" | "experimental" | "all";
  max?: number;
}): Promise<PublishedFormula[]> {
  let rows = Object.values(all()).sort((a, b) => b.createdAt - a.createdAt);
  if (opts?.badge && opts.badge !== "all") {
    rows = rows.filter((f) => f.badge === opts.badge);
  }
  const q = opts?.search?.trim().toLowerCase();
  if (q) {
    rows = rows.filter(
      (f) =>
        f.title.toLowerCase().includes(q) ||
        f.authorName.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        (f.scentVerdict ?? "").toLowerCase().includes(q),
    );
  }
  return rows.slice(0, opts?.max ?? 48);
}

export async function publishFormula(
  input: PublishFormulaInput,
): Promise<PublishedFormula> {
  const title = input.title.trim().slice(0, 80);
  if (!title) throw new Error("Title is required");
  if (!input.contents.length) throw new Error("Formula has no contents");

  const now = Date.now();
  const formula: PublishedFormula = {
    id: newLocalId("f"),
    title,
    description: (input.description ?? "").trim().slice(0, 280),
    authorUid: authorUid(),
    authorName: authorName(),
    contents: input.contents.map((c) => ({
      chemicalId: c.chemicalId,
      amountMl: c.amountMl,
    })),
    equipmentId: input.equipmentId || "beaker",
    scentVerdict: input.scentVerdict ?? undefined,
    scentSummary: input.scentSummary ?? undefined,
    bottleColor: input.bottleColor ?? undefined,
    ifra: {
      status: input.ifra.status,
      category: input.ifra.category,
      version: input.ifra.version,
      screened: input.ifra.screened,
    },
    badge: marketBadgeFromIfra(input.ifra.status),
    createdAt: now,
    updatedAt: now,
  };

  const rows = all();
  rows[formula.id] = formula;
  writeCollection(FORMULAS_KEY, rows);
  return formula;
}

export async function attachStudyToFormula(
  formulaId: string,
  studyId: string,
): Promise<void> {
  const rows = all();
  const formula = rows[formulaId];
  if (!formula) throw new Error("Formula not found");
  rows[formulaId] = { ...formula, studyId, updatedAt: Date.now() };
  writeCollection(FORMULAS_KEY, rows);
}
