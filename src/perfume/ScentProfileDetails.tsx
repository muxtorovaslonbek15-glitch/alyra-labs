"use client";

import {
  concentrationLabel,
  familyLabel,
  type ScentProfile,
} from "@/domains/chemistry/perfume";

export function ScentProfileDetails({
  profile,
  compact = false,
}: {
  profile: ScentProfile;
  /** Tighter layout for shelf rows */
  compact?: boolean;
}) {
  const conc = concentrationLabel(profile.concentration);
  return (
    <div
      className={`rounded-xl border border-lab-teal/25 bg-lab-wash/50 text-left ${
        compact ? "px-2.5 py-2" : "px-3 py-2.5"
      }`}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-lab-teal/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-label text-lab-teal">
          {familyLabel(String(profile.family))}
        </span>
        {conc ? (
          <span className="rounded-full border border-lab-line/60 bg-white px-2 py-0.5 text-[9px] font-semibold uppercase tracking-label text-lab-muted">
            {conc}
          </span>
        ) : null}
        {profile.brandLabel ? (
          <span className="text-[10px] text-lab-muted">{profile.brandLabel}</span>
        ) : null}
      </div>

      <p className={`mt-1.5 ${compact ? "text-[11px]" : "text-[12px]"} leading-snug text-lab-ink`}>
        <span className="font-semibold text-lab-teal">Smells like </span>
        {profile.smellsLike}
      </p>

      {profile.hasNotesOf.length > 0 ? (
        <p className="mt-1 text-[11px] leading-snug text-lab-ink/80">
          <span className="font-semibold text-lab-ink">Has notes of </span>
          {profile.hasNotesOf.join(" · ")}
        </p>
      ) : null}

      {!compact ? (
        <div className="mt-2 grid gap-1.5">
          {profile.notes
            .filter((n) => n.names.length > 0)
            .map((n) => (
              <div key={n.role}>
                <p className="text-[9px] font-semibold uppercase tracking-label text-lab-muted">
                  {n.label}
                </p>
                <p className="text-[11px] text-lab-ink/90">{n.names.join(" · ")}</p>
              </div>
            ))}
        </div>
      ) : null}

      {profile.ingredients.length > 0 ? (
        <div className="mt-2 border-t border-lab-line/40 pt-2">
          <p className="text-[9px] font-semibold uppercase tracking-label text-lab-muted">
            Ingredients
          </p>
          <ul className={`mt-1 space-y-1 ${compact ? "" : ""}`}>
            {profile.ingredients.map((ing) => (
              <li
                key={ing.chemicalId}
                className="flex items-start justify-between gap-2 text-[11px] leading-snug"
              >
                <span className="min-w-0 text-lab-ink">
                  <span className="font-medium">{ing.name}</span>
                  {ing.formula ? (
                    <span className="text-lab-muted"> · {ing.formula}</span>
                  ) : null}
                  {!compact && ing.blurb ? (
                    <span className="mt-0.5 block text-[10px] text-lab-muted">
                      {ing.blurb}
                    </span>
                  ) : null}
                </span>
                {ing.role ? (
                  <span className="shrink-0 rounded bg-white/80 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-label text-lab-teal">
                    {ing.role}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
