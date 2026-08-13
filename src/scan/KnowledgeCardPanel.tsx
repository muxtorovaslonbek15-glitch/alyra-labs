"use client";

import { lookupKnowledge, type KnowledgeCard } from "@/domains/chemistry/knowledge/lookup";

interface Props {
  card: KnowledgeCard | null;
  onSelectRelated: (key: string) => void;
  onAddToDesk?: (chemicalId: string) => void;
}

export function KnowledgeCardPanel({
  card,
  onSelectRelated,
  onAddToDesk,
}: Props) {
  if (!card) {
    return (
      <div className="rounded-2xl border border-dashed border-lab-line/70 bg-lab-foam/40 px-4 py-8 text-center">
        <p className="text-sm text-lab-muted">
          Hover or select a formula piece to learn more
        </p>
        <p className="mt-2 text-xs text-lab-muted/80">
          Elements, ions, and compounds open rich cards from the local knowledge
          base.
        </p>
      </div>
    );
  }

  const kindLabel =
    card.kind === "element"
      ? "Element"
      : card.kind === "compound"
        ? "Compound"
        : card.kind === "ion"
          ? "Ion"
          : "Unknown";

  return (
    <article className="equation-pop rounded-2xl border border-lab-line/60 bg-white/95 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-label text-lab-muted">
            {kindLabel}
          </p>
          <h3 className="mt-1 font-display text-xl text-lab-ink">{card.title}</h3>
          <p className="mt-0.5 font-mono text-xs text-lab-muted">{card.subtitle}</p>
        </div>
        {card.key ? (
          <span className="rounded-lg bg-lab-ink px-2 py-1 font-mono text-sm text-lab-foam">
            {card.key}
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-sm leading-relaxed text-lab-ink/90">{card.summary}</p>

      {card.bullets.length > 0 ? (
        <ul className="mt-3 space-y-1.5 text-xs text-lab-ink/85">
          {card.bullets.map((b) => (
            <li key={b} className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-lab-teal" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {card.hazards ? (
        <p className="mt-3 rounded-lg bg-red-50 px-2.5 py-2 text-xs text-lab-hazard">
          <span className="font-semibold">Hazard: </span>
          {card.hazards}
        </p>
      ) : null}

      {card.funFact ? (
        <p className="mt-3 rounded-lg bg-lab-wash/80 px-2.5 py-2 text-xs text-lab-muted">
          <span className="font-semibold text-lab-teal">Fun fact: </span>
          {card.funFact}
        </p>
      ) : null}

      {card.related.length > 0 ? (
        <div className="mt-4">
          <p className="text-[10px] uppercase tracking-label text-lab-muted">
            Related
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {card.related.map((r) => {
              const related = lookupKnowledge(r);
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => onSelectRelated(r)}
                  className="rounded-lg border border-lab-line/60 bg-lab-foam/60 px-2 py-1 font-mono text-[11px] text-lab-ink transition hover:border-lab-teal hover:bg-white"
                  title={related.title}
                >
                  {r}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {card.deskChemicalId && onAddToDesk ? (
        <button
          type="button"
          onClick={() => onAddToDesk(card.deskChemicalId!)}
          className="mt-4 w-full rounded-xl bg-lab-teal px-3 py-2 text-sm font-semibold text-white transition hover:bg-lab-teal/90"
        >
          Add {card.key} to active vessel
        </button>
      ) : null}
    </article>
  );
}
