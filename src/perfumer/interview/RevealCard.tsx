"use client";

import type { RevealCardPayload } from "./types";

export function RevealCard({ card }: { card: RevealCardPayload }) {
  return (
    <article className="space-y-3" data-reveal-card>
      <p className="text-[11px] font-semibold uppercase tracking-label text-lab-muted">
        Reveal
      </p>
      <p className="font-display text-xl leading-snug tracking-display text-lab-ink">
        {card.name}
      </p>
      <div className="space-y-2 pt-1">
        <p className="text-[11px] font-semibold uppercase tracking-label text-lab-muted">
          Notes
        </p>
        <NoteRow label="Brightness" notes={card.notes.brightness} />
        <NoteRow label="Heart" notes={card.notes.heart} />
        <NoteRow label="Skin" notes={card.notes.skin} />
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-label text-lab-muted">
          Vibe
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-lab-ink/90">{card.vibe}</p>
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-label text-lab-muted">
          Feel
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-lab-ink/90">{card.feel}</p>
      </div>
    </article>
  );
}

function NoteRow({ label, notes }: { label: string; notes: string[] }) {
  if (!notes.length) return null;
  return (
    <div className="flex gap-3 text-sm">
      <p className="w-20 shrink-0 text-[11px] font-medium uppercase tracking-label text-lab-muted">
        {label}
      </p>
      <p className="text-[13px] leading-relaxed text-lab-ink/85">
        {notes.join(" · ")}
      </p>
    </div>
  );
}
