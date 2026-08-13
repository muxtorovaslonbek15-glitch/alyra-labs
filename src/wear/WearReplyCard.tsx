"use client";

import type { ReactNode } from "react";
import type { WearCardPayload } from "./cannedCopy";

export function WearReplyCard({ card }: { card: WearCardPayload }) {
  return (
    <article className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-label text-lab-muted">
        {card.kind === "wear"
          ? "Wear"
          : card.kind === "notes"
            ? "Notes"
            : card.kind === "story"
              ? "Story"
              : "Layer"}
      </p>
      <p className="font-display text-xl leading-snug tracking-display text-lab-ink">
        {card.title}
      </p>
      <p className="text-sm leading-relaxed text-lab-ink/90">{card.body}</p>
      {card.kind === "notes" && card.notes ? (
        <div className="space-y-2 pt-1">
          <NoteRow label="Brightness" notes={card.notes.top} />
          <NoteRow label="Heart" notes={card.notes.heart} />
          <NoteRow label="Skin" notes={card.notes.base} />
        </div>
      ) : null}
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

/** Craft dump lives here — never the Wear hero. */
export function SeeTheCraft({ children }: { children: ReactNode }) {
  return (
    <details className="mt-3 border-t border-lab-line/60 pt-3">
      <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-label text-lab-muted hover:text-lab-ink">
        See the craft
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}
