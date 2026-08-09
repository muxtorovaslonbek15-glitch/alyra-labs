"use client";

import { useEffect, useState } from "react";
import type { PerfumerApiError } from "./types";

const CODE_HINTS: Record<string, string> = {
  missing_env: "A server key is missing.",
  groq_down: "The model is briefly unavailable.",
  rate_limited: "Busy / rate limited. Try again in a moment.",
  timeout: "That took too long.",
  tool_use_failed: "A formulation step misfired.",
  invalid_formula: "Formula materials look off.",
  ifra_warning: "IFRA caution on a material.",
  search_failure: "Live research unavailable.",
  bad_request: "Something in the request looked incomplete.",
  network: "Connection problem.",
  not_found: "That chat was not found.",
  internal: "Unexpected server issue.",
};

export function ErrorBanner({
  error,
  onDismiss,
}: {
  error: PerfumerApiError;
  onDismiss?: () => void;
}) {
  const initial =
    error.retryAfterSec && error.retryAfterSec > 0
      ? Math.ceil(error.retryAfterSec)
      : error.code === "rate_limited"
        ? 30
        : 0;
  const [left, setLeft] = useState(initial);

  useEffect(() => {
    setLeft(initial);
    if (initial <= 0) return;
    const id = window.setInterval(() => {
      setLeft((n) => (n <= 1 ? 0 : n - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [error.code, error.message, initial]);

  const title =
    error.code === "rate_limited"
      ? "Model is busy"
      : error.title || "Something went wrong";
  const message =
    error.code === "rate_limited"
      ? "The perfume model is rate-limited right now. Your brief is saved. Try again shortly."
      : error.message;

  return (
    <div
      role="alert"
      className="rounded-xl border border-lab-line bg-lab-wash/80 px-3.5 py-3 text-sm text-lab-ink"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-[15px] text-lab-ink">{title}</p>
          <p className="mt-0.5 text-xs text-lab-muted">
            {CODE_HINTS[error.code] || error.code}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-lab-ink/90">
            {message}
          </p>
          {left > 0 ? (
            <p className="mt-1.5 text-xs font-medium text-lab-muted">
              Retry in {left}s
            </p>
          ) : error.actionable ? (
            <p className="mt-1.5 text-xs text-lab-muted">{error.actionable}</p>
          ) : null}
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 rounded-md px-2 py-1 text-xs text-lab-muted hover:text-lab-ink"
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
    <div className="rounded-xl border border-lab-line/80 bg-lab-wash/50 px-3.5 py-2.5 text-sm">
      <p className="text-[13px] font-medium text-lab-ink">{title}</p>
      <p className="mt-0.5 text-xs leading-relaxed text-lab-muted">{message}</p>
    </div>
  );
}
