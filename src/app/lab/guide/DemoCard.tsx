"use client";

import { useRef, useState } from "react";
import { storeGuidePrompt } from "@/perfumer/labBridge";
import type { GuideDemo, SampleOutput } from "./demos";

const LEVEL_STYLE: Record<GuideDemo["level"], string> = {
  Tiny: "border-lab-line bg-lab-wash text-lab-muted",
  Bigger: "border-lab-glass/50 bg-lab-foam text-lab-ink",
  "Full atelier": "border-lab-ink/20 bg-lab-ink text-lab-foam",
};

async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText =
      "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function SampleBlock({ sample }: { sample: SampleOutput }) {
  if (sample.kind === "formula") {
    const sum = sample.rows.reduce((a, r) => a + r.percent, 0);
    return (
      <div className="space-y-4">
        <div>
          <p className="font-display text-xl text-lab-ink">{sample.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-lab-muted">
            {sample.vibe}
          </p>
        </div>
        <div className="overflow-hidden rounded-xl border border-lab-line bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-lab-line/70 bg-lab-wash/60 text-[10px] font-semibold uppercase tracking-[0.14em] text-lab-muted">
                <th className="px-3 py-2.5 font-semibold">Material</th>
                <th className="px-3 py-2.5 font-semibold">Role</th>
                <th className="px-3 py-2.5 text-right font-semibold">%</th>
              </tr>
            </thead>
            <tbody>
              {sample.rows.map((row) => (
                <tr
                  key={row.name}
                  className="border-b border-lab-line/50 last:border-0"
                >
                  <td className="px-3 py-2.5 font-mono text-[12px] text-lab-ink">
                    {row.name}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-lab-muted">
                    {row.note ?? ""}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-[12px] text-lab-ink">
                    {row.percent}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-lab-muted">
          <p>
            <span className="font-semibold text-lab-ink">Cost </span>
            {sample.costInr}
          </p>
          <p>
            <span className="font-semibold text-lab-ink">Mapped </span>
            {sample.mapped}/{sample.rows.length} Lab oils
          </p>
          <p>
            <span className="font-semibold text-lab-ink">Sum </span>
            {sum}%
          </p>
        </div>
        {sample.unmapped?.length ? (
          <p className="rounded-lg bg-lab-wash px-3 py-2 text-xs leading-relaxed text-lab-muted">
            <span className="font-semibold text-lab-ink">Unmapped: </span>
            {sample.unmapped.join(" · ")}
          </p>
        ) : null}
        {sample.footer ? (
          <p className="text-sm leading-relaxed text-lab-ink">{sample.footer}</p>
        ) : null}
      </div>
    );
  }

  if (sample.kind === "build") {
    return (
      <div className="space-y-4">
        <p className="font-display text-xl text-lab-ink">{sample.title}</p>
        <ol className="space-y-2">
          {sample.steps.map((step, i) => (
            <li
              key={step}
              className="flex gap-3 rounded-xl border border-lab-line bg-white px-3 py-2.5 text-sm text-lab-ink"
            >
              <span className="font-mono text-[11px] font-semibold text-lab-muted">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <p className="rounded-xl bg-lab-ink px-4 py-3 text-sm leading-relaxed text-lab-foam">
          {sample.result}
        </p>
      </div>
    );
  }

  if (sample.kind === "refine") {
    return (
      <div className="space-y-4">
        <p className="font-display text-xl text-lab-ink">{sample.title}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-lab-line bg-white px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-lab-muted">
              Before
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-lab-muted">
              {sample.before.map((line) => (
                <li key={line} className="font-mono text-[12px]">
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-lab-ink/20 bg-lab-wash px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-lab-ink">
              After
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-lab-ink">
              {sample.after.map((line) => (
                <li key={line} className="font-mono text-[12px]">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-lab-ink">{sample.delta}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="font-display text-xl text-lab-ink">{sample.title}</p>
      <p className="text-sm leading-relaxed text-lab-muted">{sample.problem}</p>
      <ol className="space-y-2">
        {sample.onDesk.map((step, i) => (
          <li
            key={step}
            className="flex gap-3 rounded-xl border border-lab-line bg-white px-3 py-2.5 text-sm text-lab-ink"
          >
            <span className="font-mono text-[11px] font-semibold text-lab-muted">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <p className="rounded-xl bg-lab-ink px-4 py-3 text-sm leading-relaxed text-lab-foam">
        {sample.result}
      </p>
    </div>
  );
}

export function DemoCard({ demo }: { demo: GuideDemo }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [tryStatus, setTryStatus] = useState<"idle" | "opening">("idle");
  const resetRef = useRef<number | null>(null);

  async function onCopy() {
    const ok = await copyText(demo.prompt);
    if (resetRef.current) window.clearTimeout(resetRef.current);
    setStatus(ok ? "copied" : "failed");
    resetRef.current = window.setTimeout(() => setStatus("idle"), 1800);
  }

  async function onTryInChat() {
    setTryStatus("opening");
    storeGuidePrompt(demo.prompt);
    await copyText(demo.prompt);
    window.open("/lab?tab=chat", "_blank", "noopener,noreferrer");
    window.setTimeout(() => setTryStatus("idle"), 1200);
  }

  const buttonLabel =
    status === "copied" ? "Copied" : status === "failed" ? "Retry" : "Copy here";

  return (
    <article className="overflow-hidden rounded-2xl border border-lab-line bg-lab-panel shadow-[0_1px_0_rgba(12,12,12,0.04)]">
      <div className="border-b border-lab-line/70 px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${LEVEL_STYLE[demo.level]}`}
          >
            {demo.level}
          </span>
          <h3 className="text-lg font-semibold tracking-tight text-lab-ink">
            {demo.title}
          </h3>
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-lab-muted">
          <span className="font-semibold text-lab-ink">The win: </span>
          {demo.win}
        </p>
      </div>

      <div className="grid gap-0 lg:grid-cols-2">
        <div className="border-b border-lab-line/70 px-4 py-5 sm:px-6 lg:border-b-0 lg:border-r">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-lab-muted">
              Paste this into Chat
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onCopy}
                aria-live="polite"
                aria-label={
                  status === "copied"
                    ? `Copied “${demo.title}”`
                    : `Copy “${demo.title}” to paste into Chat`
                }
                className={`inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl px-4 text-sm font-semibold transition duration-200 ${
                  status === "copied"
                    ? "bg-lab-ink text-lab-foam"
                    : status === "failed"
                      ? "border border-lab-hazard/40 bg-white text-lab-hazard"
                      : "border border-lab-line bg-white text-lab-ink hover:border-lab-ink/35 hover:bg-lab-wash active:scale-[0.98]"
                }`}
              >
                {buttonLabel}
              </button>
              <button
                type="button"
                onClick={onTryInChat}
                aria-label={`Try “${demo.title}” in Chat (opens Lab in a new tab)`}
                className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl bg-lab-ink px-4 text-sm font-semibold text-lab-foam transition duration-200 hover:bg-black active:scale-[0.98]"
              >
                {tryStatus === "opening" ? "Opening…" : "Try in chat"}
              </button>
            </div>
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-lab-wash/70 px-4 py-3 font-mono text-[12px] leading-relaxed text-lab-ink sm:text-[13px]">
            {demo.prompt}
          </pre>
        </div>

        <div className="bg-lab-wash/35 px-4 py-5 sm:px-6">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-lab-muted">
            Here&apos;s the kind of win you get
          </p>
          <SampleBlock sample={demo.sample} />
        </div>
      </div>
    </article>
  );
}
