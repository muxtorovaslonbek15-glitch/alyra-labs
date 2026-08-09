"use client";

import { useState } from "react";

export type SnippetDifficulty = "Starter" | "Intermediate" | "Advanced";

export type GuideSnippet = {
  id: string;
  label: string;
  difficulty?: SnippetDifficulty;
  outcome?: string;
  text: string;
};

export function CopySnippet({ snippet }: { snippet: GuideSnippet }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(snippet.text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <article className="overflow-hidden rounded-xl border border-lab-line bg-lab-panel">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-lab-line/70 px-3.5 py-2.5 sm:px-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {snippet.difficulty ? (
              <span className="rounded-md border border-lab-line bg-lab-wash px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-lab-muted">
                {snippet.difficulty}
              </span>
            ) : null}
            <h3 className="text-sm font-semibold text-lab-ink">{snippet.label}</h3>
          </div>
          {snippet.outcome ? (
            <p className="mt-1 text-xs leading-relaxed text-lab-muted">
              What you&apos;ll get: {snippet.outcome}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onCopy}
          aria-label={copied ? "Copied" : `Copy “${snippet.label}”`}
          className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
            copied
              ? "border-lab-ink bg-lab-ink text-lab-foam"
              : "border-lab-line bg-white text-lab-ink hover:border-lab-ink/40 hover:bg-lab-wash"
          }`}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap break-words px-3.5 py-3 font-mono text-[11px] leading-relaxed text-lab-ink/90 sm:px-4 sm:text-xs">
        {snippet.text}
      </pre>
    </article>
  );
}

export function SnippetStack({
  snippets,
  title,
  intro,
}: {
  snippets: GuideSnippet[];
  title: string;
  intro?: string;
}) {
  return (
    <div>
      <h3 className="font-display text-xl text-lab-ink">{title}</h3>
      {intro ? (
        <p className="mt-1.5 text-sm leading-relaxed text-lab-muted">{intro}</p>
      ) : null}
      <div className="mt-4 space-y-3">
        {snippets.map((s) => (
          <CopySnippet key={s.id} snippet={s} />
        ))}
      </div>
    </div>
  );
}
