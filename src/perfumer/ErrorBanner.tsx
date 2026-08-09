"use client";

import type { PerfumerApiError } from "./types";

const CODE_HINTS: Record<string, string> = {
  missing_env: "A server API key is missing (GROQ / Tavily).",
  groq_down: "The AI backend is unreachable or Groq failed.",
  rate_limited: "Slow down — rate limit.",
  invalid_formula: "Formula materials or percentages look invalid.",
  ifra_warning: "IFRA safety caution on one or more materials.",
  search_failure: "Web search provider failed.",
  bad_request: "Check your brief and try again.",
};

export function ErrorBanner({
  error,
  onDismiss,
}: {
  error: PerfumerApiError;
  onDismiss?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-lab-hazard/40 bg-[#fdf2f1] px-3 py-2.5 text-sm text-lab-ink"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-base text-lab-hazard">{error.title}</p>
          <p className="mt-0.5 text-xs text-lab-muted">
            {CODE_HINTS[error.code] || error.code}
          </p>
          <p className="mt-1.5 text-sm leading-snug">{error.message}</p>
          {error.actionable ? (
            <p className="mt-1.5 font-mono text-[11px] text-lab-ink/80">
              → {error.actionable}
            </p>
          ) : null}
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-lab-muted hover:bg-white/60 hover:text-lab-ink"
          >
            Dismiss
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function WarningBanner({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="rounded-lg border border-lab-amber/50 bg-[#faf6ef] px-3 py-2 text-sm">
      <p className="font-semibold text-lab-ink">{title}</p>
      <p className="mt-0.5 text-xs leading-snug text-lab-muted">{message}</p>
    </div>
  );
}
