"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { NavChrome } from "@/components/auth/NavChrome";
import { getPublishedFormula } from "@/lib/firebase/formulas";
import type { PublishedFormula } from "@/domains/chemistry/market";
import { useDeskStore } from "@/store/deskStore";
import { getChemical } from "@/domains/chemistry/data/chemicals";
import { showToast } from "@/gamification/ToastHost";
import { track } from "@/lib/analytics/track";

export default function FormulaDeepLinkPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const loadFormula = useDeskStore((s) => s.loadFormula);
  const [formula, setFormula] = useState<PublishedFormula | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    getPublishedFormula(id)
      .then((f) => {
        if (cancelled) return;
        if (!f) setError("Formula not found");
        else setFormula(f);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  function remix() {
    if (!formula) return;
    const vesselId = loadFormula({
      equipmentId: formula.equipmentId,
      contentIds: formula.contents.map((c) => c.chemicalId),
      contents: formula.contents,
    });
    if (!vesselId) {
      showToast({
        title: "Could not load",
        detail: "Sign in or finish the guest gate to remix.",
      });
      return;
    }
    track("market_remix", { formulaId: formula.id, from: "deep_link" });
    showToast({ title: "On your desk", detail: formula.title });
    router.push("/lab");
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-lab-wash via-[#e4efe9] to-lab-wash px-4 py-8">
      <div className="mx-auto flex max-w-lg items-center justify-between">
        <Link href="/lab" className="font-display text-2xl text-lab-ink">
          Alyra Labs
        </Link>
        <NavChrome />
      </div>
      <div className="mx-auto mt-10 max-w-lg">
        {loading ? (
          <p className="text-sm text-lab-muted motion-safe:animate-pulse">
            Loading formula…
          </p>
        ) : error || !formula ? (
          <div>
            <h1 className="font-display text-2xl text-lab-ink">Not found</h1>
            <p className="mt-1 text-sm text-lab-muted">{error}</p>
            <Link
              href="/market"
              className="mt-4 inline-block text-sm font-semibold text-lab-teal underline"
            >
              Back to Market
            </Link>
          </div>
        ) : (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-label text-lab-muted">
              Shared formula
            </p>
            <div className="mt-2 flex items-start gap-3">
              <div
                className="h-20 w-12 shrink-0 rounded-b-2xl rounded-t-md border border-lab-glass/50 shadow-md"
                style={{
                  background: `linear-gradient(180deg, #fff9 0%, ${formula.bottleColor ?? "#8fc0b5"} 100%)`,
                }}
              />
              <div>
                <h1 className="font-display text-3xl leading-tight text-lab-ink">
                  {formula.title}
                </h1>
                <p className="mt-1 text-sm text-lab-muted">
                  by {formula.authorName}
                </p>
                <span
                  className={`mt-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-label ${
                    formula.badge === "screened"
                      ? "bg-lab-teal/15 text-lab-teal"
                      : "bg-lab-amber/15 text-lab-amber"
                  }`}
                >
                  {formula.badge}
                </span>
              </div>
            </div>
            {formula.scentSummary ? (
              <p className="mt-4 text-sm leading-snug text-lab-ink/90">
                {formula.scentSummary}
              </p>
            ) : null}
            <p className="mt-3 text-[11px] text-lab-muted">
              IFRA {formula.ifra.status} · {formula.ifra.category} ·{" "}
              {formula.ifra.version}
            </p>
            <ul className="mt-4 space-y-1 rounded-lg border border-lab-line/50 bg-lab-panel/80 px-3 py-2">
              {formula.contents.map((c) => (
                <li
                  key={c.chemicalId}
                  className="flex justify-between text-xs text-lab-ink"
                >
                  <span>{getChemical(c.chemicalId)?.name ?? c.chemicalId}</span>
                  <span className="font-mono text-lab-muted">
                    {c.amountMl.toFixed(1)} ml
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={remix}
                className="rounded-lg bg-lab-teal px-4 py-2 text-sm font-semibold text-white hover:bg-lab-teal/90"
              >
                Remix on desk
              </button>
              <Link
                href="/market"
                className="rounded-lg border border-lab-line px-4 py-2 text-sm font-semibold text-lab-ink hover:bg-lab-wash"
              >
                Market
              </Link>
              {formula.studyId ? (
                <Link
                  href={`/study/${formula.studyId}`}
                  className="rounded-lg border border-lab-line px-4 py-2 text-sm font-semibold text-lab-ink hover:bg-lab-wash"
                >
                  Rate in study
                </Link>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
