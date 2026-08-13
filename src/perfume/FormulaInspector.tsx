"use client";

import { useState } from "react";
import Link from "next/link";
import type { LiveVesselPreview } from "@/types";
import { useDeskStore } from "@/store/deskStore";
import { useAuthStore } from "@/store/authStore";
import { getVesselContents } from "@/desk/vesselContents";
import { publishFormula } from "@/lib/firebase/formulas";
import { createStudy } from "@/lib/firebase/studies";
import { showToast } from "@/gamification/ToastHost";
import { track } from "@/lib/analytics/track";
import type { StudyAggregate } from "@/domains/chemistry/market";
import type { IfraProductCategoryId } from "@/domains/chemistry/ifra";

const VERDICT_LABEL: Record<string, string> = {
  balanced: "Looks wearable",
  weak: "Too weak / alcoholic",
  oily: "Too oily",
  unbalanced: "Incomplete pyramid",
  harsh: "Would smell harsh",
  muddy: "Muddy blend",
  medicinal: "Medicinal / chemical",
  "lab-mix": "Lab mixture",
};

const IFRA_STATUS_LABEL: Record<string, string> = {
  pass: "IFRA screen: Pass",
  fail: "IFRA screen: Fail",
  unknown: "IFRA screen: Unknown",
};

function StudyStrip({ aggregate }: { aggregate: StudyAggregate }) {
  if (aggregate.count <= 0) {
    return (
      <p className="text-[9px] text-lab-muted">No panel ratings yet.</p>
    );
  }
  const rows: { key: keyof StudyAggregate; label: string }[] = [
    { key: "liking", label: "Liking" },
    { key: "harshness", label: "Harshness" },
    { key: "longevityGuess", label: "Longevity" },
    { key: "clarity", label: "Clarity" },
    { key: "uniqueness", label: "Unique" },
  ];
  return (
    <div className="space-y-1">
      <p className="text-[9px] text-lab-muted">
        Panel means · n={aggregate.count}
      </p>
      <div className="grid grid-cols-2 gap-1">
        {rows.map((r) => (
          <div
            key={r.key}
            className="rounded bg-white/70 px-1.5 py-0.5 text-[9px] text-lab-ink"
          >
            <span className="text-lab-muted">{r.label}</span>{" "}
            <span className="font-mono font-semibold">
              {(aggregate[r.key] as number).toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FormulaInspector({ preview }: { preview: LiveVesselPreview }) {
  const verdict = preview.scentVerdict
    ? VERDICT_LABEL[preview.scentVerdict] ?? preview.scentVerdict
    : null;
  const danger = preview.hazards.some((h) => h.level === "danger");
  const ifra = preview.ifra;

  const user = useAuthStore((s) => s.user);
  const openAuthGate = useAuthStore((s) => s.openAuthGate);
  const vessels = useDeskStore((s) => s.vessels);
  const activeVesselId = useDeskStore((s) => s.activeVesselId);
  const lastId = useDeskStore((s) => s.lastExplanationVesselId);
  const vessel =
    vessels.find((v) => v.instanceId === lastId) ??
    vessels.find((v) => v.instanceId === activeVesselId) ??
    vessels[0];

  const [publishing, setPublishing] = useState(false);
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [studyId, setStudyId] = useState<string | null>(null);
  const [studyAgg, setStudyAgg] = useState<StudyAggregate | null>(null);
  const [title, setTitle] = useState("");

  const hasOils = preview.notes.length > 0 || preview.oilLoadPct > 0;

  async function onPublish() {
    if (!user) {
      openAuthGate();
      showToast({
        title: "Sign in to publish",
        detail: "Marketplace formulas need an account.",
      });
      return;
    }
    if (!vessel) return;
    const contents = getVesselContents(vessel);
    if (!contents.length) {
      showToast({ title: "Empty vessel", detail: "Pour a formula first." });
      return;
    }
    setPublishing(true);
    try {
      const formula = await publishFormula({
        title: title.trim() || preview.scentVerdict || "Desk blend",
        description: preview.scentSummary ?? "",
        contents,
        equipmentId: vessel.equipmentId,
        scentVerdict: preview.scentVerdict,
        scentSummary: preview.scentSummary,
        bottleColor: preview.fillColor,
        ifra: ifra
          ? {
              status: ifra.status,
              category: ifra.category as IfraProductCategoryId,
              version: ifra.version,
              screened: ifra.screened,
            }
          : {
              status: "unknown",
              category: "cat4",
              version: "49th-Amendment-teaching",
              screened: false,
            },
      });
      setPublishedId(formula.id);
      track("formula_published", {
        formulaId: formula.id,
        badge: formula.badge,
        ifraStatus: formula.ifra.status,
      });
      showToast({
        title:
          formula.badge === "screened"
            ? "Published · Screened"
            : "Published · Experimental",
        detail: "Live on the Atelier Market.",
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

  async function onStartStudy(mode: "blind" | "labeled") {
    if (!publishedId) return;
    if (!user) {
      openAuthGate();
      return;
    }
    try {
      const study = await createStudy({ formulaId: publishedId, mode });
      setStudyId(study.id);
      setStudyAgg(study.aggregate);
      track("study_created", { studyId: study.id, mode });
      showToast({
        title: "Study started",
        detail: mode === "blind" ? "Blind panel link ready." : "Labeled panel link ready.",
      });
    } catch (e) {
      showToast({
        title: "Study failed",
        detail: e instanceof Error ? e.message : "Try again",
      });
    }
  }

  return (
    <div className="mb-2 space-y-1.5 rounded-lg border border-lab-line/50 bg-lab-wash/60 px-2 py-1.5">
      <p className="text-[9px] font-semibold uppercase tracking-label text-lab-muted">
        Formula inspector
      </p>

      {verdict ? (
        <p
          className={`rounded-md px-1.5 py-1 text-[11px] font-semibold ${
            preview.scentVerdict === "balanced"
              ? "bg-lab-teal/15 text-lab-teal"
              : danger
                ? "bg-lab-hazard/15 text-lab-hazard"
                : "bg-lab-amber/15 text-lab-amber"
          }`}
        >
          {verdict}
        </p>
      ) : null}

      {preview.scentSummary ? (
        <p className="text-[11px] leading-snug text-lab-ink/90">
          {preview.scentSummary}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-1 text-[9px] text-lab-muted">
        <span className="rounded bg-white/70 px-1.5 py-0.5">
          EtOH {preview.ethanolPct.toFixed(0)}%
        </span>
        <span className="rounded bg-white/70 px-1.5 py-0.5">
          Oils {preview.oilLoadPct.toFixed(1)}%
        </span>
        {preview.concentrationLabel ? (
          <span className="rounded bg-white/70 px-1.5 py-0.5">
            {preview.concentrationLabel}
          </span>
        ) : null}
      </div>

      {ifra ? (
        <div className="space-y-1 border-t border-lab-line/40 pt-1.5">
          <p
            className={`rounded-md px-1.5 py-1 text-[10px] font-semibold ${
              ifra.status === "pass"
                ? "bg-lab-teal/15 text-lab-teal"
                : ifra.status === "fail"
                  ? "bg-lab-hazard/15 text-lab-hazard"
                  : "bg-white/70 text-lab-muted"
            }`}
          >
            {IFRA_STATUS_LABEL[ifra.status] ?? ifra.status}
            {ifra.screened ? " · Screened" : ""}
          </p>
          <p className="text-[9px] text-lab-muted">
            {ifra.categoryLabel} · {ifra.version}
          </p>
          {ifra.ingredients.length > 0 ? (
            <ul className="space-y-0.5">
              {ifra.ingredients.map((ing) => (
                <li
                  key={ing.chemicalId}
                  className="flex justify-between gap-1 text-[9px]"
                >
                  <span className="truncate text-lab-ink">{ing.name}</span>
                  <span
                    className={`shrink-0 font-mono ${
                      ing.status === "fail"
                        ? "text-lab-hazard"
                        : ing.status === "pass"
                          ? "text-lab-teal"
                          : "text-lab-muted"
                    }`}
                  >
                    {ing.actualPct.toFixed(1)}%
                    {ing.maxPct !== undefined ? ` / ${ing.maxPct}%` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {preview.notes.length > 0 ? (
        <ul className="space-y-1">
          {preview.notes.map((n) => (
            <li key={`${n.role}-${n.name}`} className="text-[10px]">
              <div className="flex items-center justify-between gap-1">
                <span className="truncate text-lab-ink">
                  <span className="uppercase text-lab-muted">{n.role}</span>{" "}
                  {n.name}
                </span>
                <span className="shrink-0 font-mono text-lab-muted">
                  {n.amountMl.toFixed(1)} ml
                </span>
              </div>
              <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-lab-line/40">
                <div
                  className="h-full rounded-full bg-lab-teal/70"
                  style={{ width: `${Math.min(100, n.pct * 4)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {preview.hazards.length > 0 ? (
        <ul className="space-y-1 border-t border-lab-line/40 pt-1.5">
          {preview.hazards.map((h, i) => (
            <li
              key={`${h.message}-${i}`}
              className={`rounded-md px-1.5 py-1 text-[10px] leading-snug ${
                h.level === "danger"
                  ? "bg-lab-hazard/15 text-lab-hazard"
                  : h.level === "warn"
                    ? "bg-lab-amber/15 text-lab-amber"
                    : "bg-white/70 text-lab-muted"
              }`}
            >
              {h.level === "danger"
                ? "⚠ "
                : h.level === "warn"
                  ? "! "
                  : "· "}
              {h.message}
            </li>
          ))}
        </ul>
      ) : null}

      {hasOils ? (
        <div className="space-y-1.5 border-t border-lab-line/40 pt-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-label text-lab-muted">
            Market
          </p>
          {!publishedId ? (
            <>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Formula title"
                maxLength={80}
                className="w-full rounded-md border border-lab-line/60 bg-white/80 px-1.5 py-1 text-[11px] text-lab-ink placeholder:text-lab-muted"
              />
              <button
                type="button"
                disabled={publishing}
                onClick={() => void onPublish()}
                className="w-full rounded-md bg-lab-teal px-2 py-1 text-[10px] font-semibold text-white hover:bg-lab-teal/90 disabled:opacity-50"
              >
                {publishing
                  ? "Publishing…"
                  : ifra?.status === "pass"
                    ? "Publish · Screened badge"
                    : "Publish · Experimental"}
              </button>
            </>
          ) : (
            <div className="space-y-1">
              <p className="text-[10px] text-lab-teal">
                Live on Market.{" "}
                <Link
                  href={`/lab/formula/${publishedId}`}
                  className="underline"
                >
                  Open
                </Link>
                {" · "}
                <Link href="/market" className="underline">
                  Browse
                </Link>
              </p>
              {!studyId ? (
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => void onStartStudy("blind")}
                    className="flex-1 rounded-md border border-lab-line px-1.5 py-1 text-[9px] font-semibold text-lab-ink hover:bg-white/70"
                  >
                    Blind study
                  </button>
                  <button
                    type="button"
                    onClick={() => void onStartStudy("labeled")}
                    className="flex-1 rounded-md border border-lab-line px-1.5 py-1 text-[9px] font-semibold text-lab-ink hover:bg-white/70"
                  >
                    Labeled study
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <Link
                    href={`/study/${studyId}`}
                    className="block text-[10px] font-semibold text-lab-teal underline"
                  >
                    Panel study link
                  </Link>
                  {studyAgg ? <StudyStrip aggregate={studyAgg} /> : null}
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}

      <p className="text-[9px] leading-snug text-lab-muted">
        {ifra?.disclaimer ??
          "Educational screening — not a certified IFRA assessment."}
      </p>
    </div>
  );
}
