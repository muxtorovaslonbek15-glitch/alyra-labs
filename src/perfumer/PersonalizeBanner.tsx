"use client";

/**
 * Opt-in personalization + chat learning. Not a Lab/Chat gate.
 * DESIGN.md: quiet atelier, ink CTA, no modal trap.
 */
export function PersonalizeBanner({
  onAccept,
  onDismiss,
}: {
  onAccept: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      className="rounded-lg border border-lab-line/70 bg-lab-wash/50 px-2.5 py-2"
      role="region"
      aria-label="Personalize briefs"
    >
      <p className="text-[10px] font-semibold uppercase tracking-label text-lab-muted">
        Personalize
      </p>
      <p className="mt-0.5 font-display text-[15px] text-lab-ink">
        Help Alyra tailor India-climate briefs?
      </p>
      <p className="mt-0.5 text-[12px] leading-snug text-lab-muted">
        We&apos;ll remember format, notes, occasion, and climate from chat.
        Never your Groq key, phone, or date of birth.
      </p>
      <div className="mt-2 flex gap-1.5">
        <button
          type="button"
          onClick={onAccept}
          className="min-h-9 flex-1 rounded-lg bg-lab-teal px-2 py-1.5 text-[11px] font-semibold text-white hover:bg-lab-teal/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lab-teal md:min-h-8"
        >
          Yes, tailor briefs
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="min-h-9 flex-1 rounded-lg border border-lab-line/80 bg-white px-2 py-1.5 text-[11px] font-semibold text-lab-ink hover:border-lab-teal/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lab-teal md:min-h-8"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
