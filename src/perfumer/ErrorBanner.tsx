"use client";

import { useEffect, useState } from "react";
import type { PerfumerApiError } from "./types";

const CODE_HINTS: Record<string, string> = {
  missing_env: "A server key is missing.",
  missing_api_key: "Add your own Groq API key.",
  byok_misconfigured: "Key storage isn't configured on the server.",
  groq_down: "The model is briefly unavailable.",
  rate_limited: "Free-tier limit — rotate your Groq key.",
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
  onRotateKey,
  onAddKey,
}: {
  error: PerfumerApiError;
  onDismiss?: () => void;
  /** Opens delete → new Groq key → paste flow */
  onRotateKey?: () => void;
  /** Opens first-run BYOK onboarding */
  onAddKey?: () => void;
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

  const needsKey =
    error.code === "missing_api_key" || error.code === "byok_misconfigured";
  const showRotate =
    Boolean(onRotateKey) &&
    (error.rotateKey || error.code === "rate_limited") &&
    !needsKey;

  const title = needsKey
    ? "Add your Groq key"
    : error.code === "rate_limited"
      ? "Rate limit — rotate key"
      : error.title || "Something went wrong";
  const message = needsKey
    ? "Master Perfumer is open source — we don't ship a shared Groq key. Add your free key to continue."
    : error.code === "rate_limited"
      ? "Your Groq free-tier key hit a limit. Limits are per key: delete the old one, create a new key at console.groq.com, and paste it here."
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
          {left > 0 && error.code === "rate_limited" ? (
            <p className="mt-1.5 text-xs font-medium text-lab-muted">
              Optional wait {left}s — or rotate key now
            </p>
          ) : error.actionable ? (
            <p className="mt-1.5 text-xs text-lab-muted">{error.actionable}</p>
          ) : null}
          {(showRotate || (needsKey && onAddKey)) && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {needsKey && onAddKey ? (
                <button
                  type="button"
                  onClick={onAddKey}
                  className="rounded-lg bg-lab-ink px-3 py-1.5 text-xs font-semibold text-lab-foam hover:bg-black"
                >
                  Add Groq key
                </button>
              ) : null}
              {showRotate ? (
                <button
                  type="button"
                  onClick={onRotateKey}
                  className="rounded-lg bg-lab-ink px-3 py-1.5 text-xs font-semibold text-lab-foam hover:bg-black"
                >
                  Rotate Groq key
                </button>
              ) : null}
            </div>
          )}
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
