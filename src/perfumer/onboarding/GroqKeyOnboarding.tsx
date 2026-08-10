"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  deleteGroqKey,
  fetchGroqKeyStatus,
  saveGroqKey,
} from "@/perfumer/api";
import type { GroqKeyStatus, PerfumerApiError } from "@/perfumer/types";
import {
  GROQ_GUIDE_DISCLAIMER,
  stepsForMode,
  type GroqOnboardingMode,
} from "./groqSteps";

function formatOnboardError(err: PerfumerApiError): string {
  const msg = err.message?.trim();
  const action = err.actionable?.trim();
  if (msg && action && !msg.toLowerCase().includes(action.toLowerCase())) {
    return `${msg} ${action}`;
  }
  if (msg) return msg;
  return err.title?.trim() || "Could not save Groq key.";
}

export function GroqKeyOnboarding({
  open,
  mode = "onboard",
  onClose,
  onConfigured,
}: {
  open: boolean;
  mode?: GroqOnboardingMode;
  onClose?: () => void;
  onConfigured?: (status: GroqKeyStatus) => void;
}) {
  const steps = useMemo(() => stepsForMode(mode), [mode]);
  const [stepIdx, setStepIdx] = useState(0);
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);
  const errorRef = useRef<HTMLParagraphElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setStepIdx(0);
    setApiKey("");
    setError(null);
    setDeleted(false);
    setBusy(false);
    // Focus close so Escape / screen readers have a clear exit.
    requestAnimationFrame(() => closeBtnRef.current?.focus());
  }, [open, mode]);

  useEffect(() => {
    if (!error) return;
    errorRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [error]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const step = steps[stepIdx];
  const isLast = stepIdx >= steps.length - 1;
  const isDeleteStep = step.id === "delete";

  async function handleDelete() {
    setBusy(true);
    setError(null);
    try {
      const res = await deleteGroqKey();
      if (!res.ok) {
        setError(formatOnboardError(res.error));
        return;
      }
      setDeleted(true);
      setStepIdx((i) => Math.min(i + 1, steps.length - 1));
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    setBusy(true);
    setError(null);
    try {
      const res = await saveGroqKey(apiKey);
      if (!res.ok) {
        setError(formatOnboardError(res.error));
        return;
      }
      setApiKey("");
      onConfigured?.(res);
      onClose?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-lab-ink/70 p-3 backdrop-blur-[2px] sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="groq-onboard-title"
      onClick={() => onClose?.()}
    >
      {/*
        Flex column + explicit maxHeight: header/footer stay in viewport;
        body scrolls. Inline maxHeight covers Tailwind arbitrary-value gaps.
      */}
      <div
        className="flex max-h-[min(90dvh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border-2 border-lab-line bg-lab-panel shadow-[0_24px_64px_-12px_rgba(12,12,12,0.55)] ring-1 ring-lab-ink/10"
        style={{ maxHeight: "min(90dvh, 40rem)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="relative shrink-0 border-b border-lab-line bg-lab-panel px-4 py-3 pr-12">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-lab-muted">
            {mode === "rotate" ? "Rotate Groq key" : "Master Perfumer setup"}
          </p>
          <h2
            id="groq-onboard-title"
            className="mt-0.5 font-display text-xl text-lab-ink sm:text-2xl"
          >
            {step.title}
          </h2>
          <p className="mt-1 text-xs text-lab-muted">
            Step {stepIdx + 1} of {steps.length}
          </p>
          <button
            ref={closeBtnRef}
            type="button"
            aria-label="Close setup"
            onClick={() => onClose?.()}
            className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-lg text-lab-muted hover:bg-lab-wash hover:text-lab-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lab-teal"
          >
            <span aria-hidden className="text-xl leading-none">
              ×
            </span>
          </button>
        </header>

        <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <figure className="overflow-hidden rounded-xl border border-lab-line bg-lab-wash">
            <Image
              src={step.image}
              alt={step.imageAlt}
              width={1100}
              height={620}
              className="h-auto max-h-[min(28vh,12rem)] w-full object-cover object-top sm:max-h-[min(32vh,14rem)]"
              priority={stepIdx === 0}
            />
            <figcaption className="px-2.5 py-1.5 text-[10px] leading-snug text-lab-muted">
              {GROQ_GUIDE_DISCLAIMER}
            </figcaption>
          </figure>

          <p className="mt-3 text-sm leading-relaxed text-lab-ink/90">
            {step.body}
          </p>

          {isDeleteStep ? (
            <div className="mt-4">
              <button
                type="button"
                disabled={busy || deleted}
                onClick={() => void handleDelete()}
                className="min-h-11 w-full rounded-lg border border-lab-hazard/40 bg-lab-hazard/10 px-3 text-sm font-semibold text-lab-hazard hover:bg-lab-hazard/15 disabled:opacity-50"
              >
                {deleted ? "Key deleted" : busy ? "Deleting…" : "Delete old Groq key"}
              </button>
            </div>
          ) : null}

          {step.pasteForm ? (
            <form
              className="mt-4 space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                void handleSave();
              }}
            >
              <label className="block text-xs font-medium text-lab-muted">
                Groq API key
                <input
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="gsk_…"
                  className="mt-1 min-h-11 w-full rounded-lg border border-lab-line bg-white px-3 font-mono text-sm text-lab-ink outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lab-teal"
                />
              </label>
              <p className="text-[11px] text-lab-muted">
                Held in memory only until you save. Stored encrypted on the server.
              </p>
              {error ? (
                <p
                  ref={errorRef}
                  className="rounded-lg border border-lab-hazard/30 bg-lab-hazard/10 px-3 py-2 text-xs leading-snug text-lab-hazard"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={busy || apiKey.trim().length < 10}
                className="min-h-11 w-full rounded-lg bg-lab-ink px-3 text-sm font-semibold text-lab-foam hover:bg-black disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save key & continue"}
              </button>
            </form>
          ) : null}

          {!step.pasteForm && error ? (
            <p
              ref={errorRef}
              className="mt-3 rounded-lg border border-lab-hazard/30 bg-lab-hazard/10 px-3 py-2 text-xs leading-snug text-lab-hazard"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-lab-line bg-lab-panel px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => {
              if (stepIdx === 0) onClose?.();
              else setStepIdx((i) => i - 1);
            }}
            className="min-h-11 rounded-lg px-3 text-sm font-medium text-lab-muted hover:text-lab-ink"
          >
            {stepIdx === 0 ? "Skip for now" : "Back"}
          </button>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {stepIdx > 0 ? (
              <button
                type="button"
                onClick={() => onClose?.()}
                className="min-h-11 rounded-lg px-3 text-sm font-medium text-lab-muted hover:text-lab-ink"
              >
                Skip for now
              </button>
            ) : null}
            {step.href ? (
              <a
                href={step.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center rounded-lg border border-lab-line bg-white px-3 text-sm font-semibold text-lab-ink hover:bg-lab-wash"
              >
                {step.hrefLabel || "Open link"} ↗
              </a>
            ) : null}
            {!step.pasteForm && !isDeleteStep ? (
              <button
                type="button"
                onClick={() => setStepIdx((i) => Math.min(i + 1, steps.length - 1))}
                disabled={isLast}
                className="min-h-11 rounded-lg bg-lab-ink px-4 text-sm font-semibold text-lab-foam hover:bg-black disabled:opacity-40"
              >
                Next
              </button>
            ) : isDeleteStep ? (
              <button
                type="button"
                onClick={() => setStepIdx((i) => Math.min(i + 1, steps.length - 1))}
                disabled={!deleted}
                className="min-h-11 rounded-lg bg-lab-ink px-4 text-sm font-semibold text-lab-foam hover:bg-black disabled:opacity-40"
              >
                Next
              </button>
            ) : null}
          </div>
        </footer>
      </div>
    </div>
  );
}

/** Compact settings card for Chat chrome */
export function GroqKeySettingsCard({
  status,
  onRefresh,
  onOpenOnboarding,
  onOpenRotate,
}: {
  status: GroqKeyStatus | null;
  onRefresh: () => void;
  onOpenOnboarding: () => void;
  onOpenRotate: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleDelete() {
    if (
      !window.confirm(
        "Delete your saved Groq key? Chat will need a new key before the model can reply.",
      )
    ) {
      return;
    }
    setBusy(true);
    setMsg(null);
    const res = await deleteGroqKey();
    setBusy(false);
    if (!res.ok) {
      setMsg(res.error.message);
      return;
    }
    setMsg("Key deleted.");
    onRefresh();
  }

  return (
    <div className="rounded-xl border border-lab-line bg-lab-wash/60 px-3 py-2.5 text-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-lab-muted">
        Groq API key
      </p>
      {status?.configured ? (
        <>
          <p className="mt-1 font-mono text-xs text-lab-ink">
            Configured · {status.hint || "••••"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onOpenRotate}
              className="rounded-md bg-lab-ink px-2.5 py-1.5 text-[11px] font-semibold text-lab-foam"
            >
              Replace / rotate
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleDelete()}
              className="rounded-md border border-lab-line px-2.5 py-1.5 text-[11px] font-medium text-lab-muted hover:text-lab-hazard"
            >
              Delete
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-1 text-xs text-lab-muted">
            Not configured — required for Master Perfumer chat.
          </p>
          <button
            type="button"
            onClick={onOpenOnboarding}
            className="mt-2 rounded-md bg-lab-ink px-2.5 py-1.5 text-[11px] font-semibold text-lab-foam"
          >
            Add Groq key
          </button>
        </>
      )}
      {msg ? <p className="mt-1.5 text-[11px] text-lab-muted">{msg}</p> : null}
    </div>
  );
}

export async function loadGroqKeyStatusSafe(): Promise<GroqKeyStatus | null> {
  const res = await fetchGroqKeyStatus();
  if (!res.ok) return null;
  return res;
}
