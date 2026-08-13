"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { Invention } from "@/domains/chemistry/invention";
import { resolveScentProfile } from "@/domains/chemistry/perfume";
import { checkIfraCompliance } from "@/domains/chemistry/ifra";
import { defaultPourMl } from "@/desk/vesselContents";
import { publishFormula } from "@/lib/firebase/formulas";
import { useAuthStore } from "@/store/authStore";
import { track } from "@/lib/analytics/track";
import { showToast } from "@/gamification/ToastHost";

export function InventionShareCard({
  invention,
  onClose,
}: {
  invention: Invention;
  onClose: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((s) => s.user);
  const openAuthGate = useAuthStore((s) => s.openAuthGate);
  const [publishing, setPublishing] = useState(false);
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const latest = invention.versions[invention.versions.length - 1];
  const scent =
    invention.kind === "perfume"
      ? resolveScentProfile({
          goalId: invention.sourceGoalId,
          perfumeRecipeId: invention.perfumeRecipeId,
          contentIds: latest?.snapshot.contentIds,
          displayName: invention.name,
        })
      : null;

  async function copyShareText() {
    const text = `I made “${invention.name}” in Alyra Labs — score ${invention.bestScore}/100 (${latest?.tier ?? "make"}). Can you beat my formula?`;
    try {
      await navigator.clipboard.writeText(text);
      track("invention_shared", {
        inventionId: invention.id,
        method: "clipboard",
        score: invention.bestScore,
      });
      showToast({ title: "Copied", detail: "Paste it anywhere." });
    } catch {
      showToast({ title: "Copy failed", detail: text });
    }
  }

  async function nativeShare() {
    const text = `I made “${invention.name}” in Alyra Labs — score ${invention.bestScore}/100.`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: invention.name,
          text,
          url: typeof window !== "undefined" ? window.location.origin : undefined,
        });
        track("invention_shared", {
          inventionId: invention.id,
          method: "native",
          score: invention.bestScore,
        });
        return;
      } catch {
        /* fall through */
      }
    }
    await copyShareText();
  }

  async function publishToMarket() {
    if (!user) {
      openAuthGate();
      showToast({
        title: "Sign in to publish",
        detail: "Marketplace needs an account.",
      });
      return;
    }
    if (!latest) return;
    setPublishing(true);
    try {
      const contents =
        latest.snapshot.contents?.length
          ? latest.snapshot.contents.map((c) => ({
              chemicalId: c.chemicalId,
              amountMl: c.amountMl,
            }))
          : latest.snapshot.contentIds.map((chemicalId) => ({
              chemicalId,
              amountMl: defaultPourMl(chemicalId),
            }));
      const ifra = checkIfraCompliance({ contents, category: "cat4" });
      const formula = await publishFormula({
        title: invention.name,
        description: scent?.smellsLike ?? latest.notes[0] ?? "",
        contents,
        equipmentId: latest.snapshot.equipmentId,
        scentVerdict: invention.kind,
        scentSummary: scent?.smellsLike,
        bottleColor: undefined,
        ifra: {
          status: ifra.status,
          category: ifra.category,
          version: ifra.version,
          screened: ifra.screened,
        },
      });
      setPublishedId(formula.id);
      track("formula_published", {
        formulaId: formula.id,
        from: "share_card",
        badge: formula.badge,
      });
      showToast({
        title:
          formula.badge === "screened"
            ? "On Market · Screened"
            : "On Market · Experimental",
        detail: "Share the formula link with friends.",
      });
    } catch (e) {
      showToast({
        title: "Publish failed",
        detail: e instanceof Error ? e.message : "Try again",
      });
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-lab-ink/60 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Share creation"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-lab-line bg-lab-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          ref={cardRef}
          className="relative overflow-hidden bg-gradient-to-br from-lab-teal/20 via-lab-panel to-lab-amber/15 px-5 pb-5 pt-6"
        >
          <p className="text-[10px] font-semibold uppercase tracking-label text-lab-teal">
            Made in Alyra Labs
          </p>
          <h3 className="mt-2 font-display text-2xl leading-tight text-lab-ink">
            {invention.name}
          </h3>
          <p className="mt-1 text-[12px] text-lab-muted">
            {invention.kind} · v{latest?.version ?? 1} · {latest?.tier ?? "make"}
          </p>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="text-[9px] uppercase tracking-label text-lab-muted">
                Mastery score
              </p>
              <p className="font-display text-4xl text-lab-teal">
                {invention.bestScore}
              </p>
            </div>
            <div className="h-16 w-12 rounded-b-2xl rounded-t-md border border-lab-glass/50 bg-gradient-to-b from-white/80 to-lab-glass/40 shadow-md" />
          </div>
          {scent ? (
            <p className="mt-3 text-[11px] leading-snug text-lab-ink/80">
              <span className="font-semibold text-lab-teal">Smells like </span>
              {scent.smellsLike}
            </p>
          ) : latest?.notes?.[0] ? (
            <p className="mt-3 text-[11px] leading-snug text-lab-ink/80">
              {latest.notes[0]}
            </p>
          ) : null}
          {scent?.hasNotesOf.length ? (
            <p className="mt-1.5 text-[10px] leading-snug text-lab-muted">
              Notes of {scent.hasNotesOf.slice(0, 5).join(" · ")}
            </p>
          ) : null}
          {publishedId ? (
            <p className="mt-2 text-[11px] text-lab-teal">
              Published.{" "}
              <Link
                href={`/lab/formula/${publishedId}`}
                className="font-semibold underline"
              >
                Open formula
              </Link>
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2 border-t border-lab-line/50 px-4 py-3">
          <button
            type="button"
            className="rounded-lg border border-lab-line bg-white px-3 py-2 text-xs font-semibold text-lab-ink hover:bg-lab-wash"
            onClick={onClose}
          >
            Close
          </button>
          {!publishedId ? (
            <button
              type="button"
              disabled={publishing || !latest}
              className="rounded-lg border border-lab-teal/40 px-3 py-2 text-xs font-semibold text-lab-teal hover:bg-lab-teal/10 disabled:opacity-50"
              onClick={() => void publishToMarket()}
            >
              {publishing ? "…" : "Publish to Market"}
            </button>
          ) : null}
          <button
            type="button"
            className="flex-1 rounded-lg bg-lab-teal px-3 py-2 text-xs font-semibold text-white hover:bg-lab-teal/90"
            onClick={() => void nativeShare()}
          >
            Share pride card
          </button>
        </div>
      </div>
    </div>
  );
}
