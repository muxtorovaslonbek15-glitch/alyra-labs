"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { NavChrome } from "@/components/auth/NavChrome";
import { useAuthStore } from "@/store/authStore";
import {
  getMyStudyRating,
  getStudy,
  submitStudyRating,
} from "@/lib/firebase/studies";
import type {
  Study,
  StudyAggregate,
  StudyRatingScores,
} from "@/domains/chemistry/market";
import { showToast } from "@/gamification/ToastHost";
import { track } from "@/lib/analytics/track";

const ATTRS: { key: keyof StudyRatingScores; label: string; hint: string }[] = [
  { key: "liking", label: "Liking", hint: "1 dislike → 7 love" },
  { key: "harshness", label: "Harshness", hint: "1 soft → 7 sharp" },
  { key: "longevityGuess", label: "Longevity guess", hint: "1 fleeting → 7 lasting" },
  { key: "clarity", label: "Clarity", hint: "1 muddy → 7 clear" },
  { key: "uniqueness", label: "Uniqueness", hint: "1 familiar → 7 novel" },
];

function AggregateStrip({ aggregate }: { aggregate: StudyAggregate }) {
  if (aggregate.count <= 0) {
    return <p className="text-sm text-lab-muted">No ratings yet — be first.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {ATTRS.map((a) => (
        <div
          key={a.key}
          className="rounded-lg border border-lab-line/50 bg-lab-panel/80 px-2.5 py-2"
        >
          <p className="text-[9px] uppercase tracking-label text-lab-muted">
            {a.label}
          </p>
          <p className="font-display text-xl text-lab-teal">
            {aggregate[a.key].toFixed(1)}
          </p>
        </div>
      ))}
      <div className="rounded-lg border border-lab-line/50 bg-lab-panel/80 px-2.5 py-2">
        <p className="text-[9px] uppercase tracking-label text-lab-muted">
          Panel size
        </p>
        <p className="font-display text-xl text-lab-ink">{aggregate.count}</p>
      </div>
    </div>
  );
}

export default function StudyPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const user = useAuthStore((s) => s.user);
  const authReady = useAuthStore((s) => s.authReady);

  const [study, setStudy] = useState<Study | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [alreadyRated, setAlreadyRated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [scores, setScores] = useState<StudyRatingScores>({
    liking: 4,
    harshness: 4,
    longevityGuess: 4,
    clarity: 4,
    uniqueness: 4,
  });

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    getStudy(id)
      .then(async (s) => {
        if (cancelled) return;
        if (!s) {
          setError("Study not found");
          return;
        }
        setStudy(s);
        const mine = await getMyStudyRating(id);
        if (!cancelled && mine) setAlreadyRated(true);
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

  async function onSubmit() {
    if (!user) {
      showToast({
        title: "Sign in to rate",
        detail: "Panel ratings need an account.",
      });
      return;
    }
    setSubmitting(true);
    try {
      const { aggregate } = await submitStudyRating(id, scores);
      setStudy((s) => (s ? { ...s, aggregate } : s));
      setAlreadyRated(true);
      track("study_rated", { studyId: id });
      showToast({ title: "Thanks", detail: "Your rating is in." });
    } catch (e) {
      showToast({
        title: "Could not rate",
        detail: e instanceof Error ? e.message : "Try again",
      });
    } finally {
      setSubmitting(false);
    }
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
            Loading study…
          </p>
        ) : error || !study ? (
          <div>
            <h1 className="font-display text-2xl text-lab-ink">Not found</h1>
            <p className="mt-1 text-sm text-lab-muted">{error}</p>
          </div>
        ) : (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-label text-lab-muted">
              Panel study · {study.mode}
            </p>
            <h1 className="mt-1 font-display text-3xl text-lab-ink">
              {study.title}
            </h1>
            <p className="mt-1 text-sm text-lab-muted">
              by {study.creatorName}
              {study.mode === "labeled" && study.formulaLabel
                ? ` · “${study.formulaLabel}”`
                : " · formula hidden (blind)"}
            </p>

            {study.mode === "blind" ? (
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-lab-line/50 bg-lab-panel/70 px-3 py-3">
                <div
                  className="h-14 w-9 rounded-b-xl rounded-t-md border border-lab-glass/40"
                  style={{
                    background: `linear-gradient(180deg, #fff8 0%, ${study.bottleColor ?? "#8fc0b5"} 100%)`,
                  }}
                />
                <p className="text-xs leading-snug text-lab-muted">
                  Smell with your eyes — rate attributes without seeing the
                  formula name or ingredients.
                </p>
              </div>
            ) : null}

            <div className="mt-6">
              <h2 className="font-display text-sm text-lab-ink">
                Aggregate scores
              </h2>
              <div className="mt-2">
                <AggregateStrip aggregate={study.aggregate} />
              </div>
            </div>

            <div className="mt-8">
              <h2 className="font-display text-sm text-lab-ink">Your rating</h2>
              {!authReady ? (
                <p className="mt-2 text-sm text-lab-muted">Checking session…</p>
              ) : !user ? (
                <p className="mt-2 text-sm text-lab-muted">
                  <Link href="/login" className="font-semibold text-lab-teal underline">
                    Sign in
                  </Link>{" "}
                  to submit one rating (1–7 per attribute).
                </p>
              ) : alreadyRated ? (
                <p className="mt-2 rounded-md bg-lab-teal/10 px-2 py-1.5 text-sm text-lab-teal">
                  You already rated this study. Thank you.
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {ATTRS.map((a) => (
                    <label key={a.key} className="block">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-semibold text-lab-ink">
                          {a.label}
                        </span>
                        <span className="font-mono text-lab-teal">
                          {scores[a.key]}
                        </span>
                      </div>
                      <p className="text-[9px] text-lab-muted">{a.hint}</p>
                      <input
                        type="range"
                        min={1}
                        max={7}
                        step={1}
                        value={scores[a.key]}
                        onChange={(e) =>
                          setScores((s) => ({
                            ...s,
                            [a.key]: Number(e.target.value),
                          }))
                        }
                        className="mt-1 w-full accent-lab-teal"
                      />
                    </label>
                  ))}
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void onSubmit()}
                    className="w-full rounded-lg bg-lab-teal px-3 py-2 text-sm font-semibold text-white hover:bg-lab-teal/90 disabled:opacity-50"
                  >
                    {submitting ? "Submitting…" : "Submit rating"}
                  </button>
                </div>
              )}
            </div>

            <p className="mt-6 text-[11px] text-lab-muted">
              <Link
                href={`/lab/formula/${study.formulaId}`}
                className="font-semibold text-lab-teal underline"
              >
                View formula
              </Link>
              {" · "}
              <Link href="/market" className="underline">
                Market
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
