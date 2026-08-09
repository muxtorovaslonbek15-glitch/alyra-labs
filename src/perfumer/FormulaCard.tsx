"use client";

import type { CostBreakdown, FormulaLine, StructuredPayload } from "./types";

function AccordionRow({
  label,
  notes,
}: {
  label: string;
  notes?: string[];
}) {
  if (!notes?.length) return null;
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-lab-muted">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-[12px] text-lab-ink/90">
        {notes.join(" · ")}
      </p>
    </div>
  );
}

export function FormulaCard({
  structured,
  sections,
}: {
  structured?: StructuredPayload;
  sections?: { accord?: string; formula?: string; explanation?: string; improvements?: string };
}) {
  const gen = structured?.formula;
  const lines: FormulaLine[] = gen?.formula || [];
  const accord = gen?.accord;
  const cost: CostBreakdown | null | undefined = structured?.cost || gen?.cost;
  const dupe = structured?.dupe;

  if (!lines.length && !sections?.formula && !sections?.accord) {
    return null;
  }

  return (
    <div className="space-y-3 rounded-xl border border-lab-line bg-lab-panel/95 p-4 shadow-[0_8px_24px_-20px_rgba(12,12,12,0.4)]">
      <p className="font-display text-lg text-lab-ink">Formula</p>

      {dupe?.disclaimer ? (
        <p className="rounded-md border border-lab-line/80 bg-lab-wash/80 px-2.5 py-2 text-[11px] leading-snug text-lab-muted">
          {dupe.disclaimer}
        </p>
      ) : null}

      {accord ? (
        <div className="space-y-2 border-b border-lab-line/70 pb-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-lab-muted">
            Accord
          </p>
          <AccordionRow label="Top" notes={accord.top} />
          <AccordionRow label="Heart" notes={accord.heart} />
          <AccordionRow label="Base" notes={accord.base} />
        </div>
      ) : sections?.accord ? (
        <Section title="Accord" body={sections.accord} />
      ) : null}

      {lines.length ? (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-lab-muted">
            Formula
          </p>
          <ul className="mt-1.5 divide-y divide-lab-line/60">
            {lines.map((line) => (
              <li
                key={`${line.id}-${line.percent}`}
                className="flex items-baseline justify-between gap-3 py-1.5"
              >
                <span className="text-sm text-lab-ink">
                  {line.name}
                  {line.role ? (
                    <span className="ml-1.5 text-[10px] uppercase text-lab-muted">
                      {line.role}
                    </span>
                  ) : null}
                </span>
                <span className="font-mono text-sm text-lab-ink">
                  {line.percent}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : sections?.formula ? (
        <Section title="Formula" body={sections.formula} mono />
      ) : null}

      {cost?.ok ? <CostBreakdownView cost={cost} /> : null}

      {sections?.explanation ? (
        <Section title="Explanation" body={sections.explanation} />
      ) : gen?.explanation ? (
        <Section title="Explanation" body={gen.explanation} />
      ) : null}

      {sections?.improvements ? (
        <Section title="Improvements" body={sections.improvements} />
      ) : gen?.improvements?.length ? (
        <Section
          title="Improvements"
          body={gen.improvements.map((i) => `• ${i}`).join("\n")}
        />
      ) : null}

      {(structured?.citations || []).length ? (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-lab-muted">
            Sources
          </p>
          <ul className="mt-1 space-y-1">
            {structured!.citations!.slice(0, 6).map((url) => (
              <li key={url}>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all font-mono text-[11px] text-lab-ink underline decoration-lab-line underline-offset-2 hover:decoration-lab-ink"
                >
                  {url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function Section({
  title,
  body,
  mono,
}: {
  title: string;
  body: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-lab-muted">
        {title}
      </p>
      <p
        className={`mt-1 whitespace-pre-wrap text-sm leading-relaxed text-lab-ink/90 ${
          mono ? "font-mono text-[12px]" : ""
        }`}
      >
        {body}
      </p>
    </div>
  );
}

function CostBreakdownView({ cost }: { cost: CostBreakdown }) {
  return (
    <div className="rounded-lg bg-lab-wash/70 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-lab-muted">
        Cost estimate
      </p>
      <p className="mt-1 font-display text-xl text-lab-ink">
        ${cost.totalCostUsd?.toFixed(2)}
        <span className="ml-2 font-sans text-xs font-normal text-lab-muted">
          / {cost.batchGrams || 100}g batch
        </span>
      </p>
      {cost.items?.length ? (
        <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto scroll-thin">
          {cost.items.map((item) => (
            <li
              key={item.id}
              className="flex justify-between gap-2 font-mono text-[11px] text-lab-muted"
            >
              <span className="truncate text-lab-ink/80">{item.name}</span>
              <span>${item.lineCostUsd.toFixed(3)}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {cost.warnings?.length ? (
        <p className="mt-2 text-[11px] text-lab-amber">{cost.warnings.join(" ")}</p>
      ) : null}
    </div>
  );
}
