"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { listPublishedFormulas } from "@/lib/firebase/formulas";
import type { PublishedFormula } from "@/domains/chemistry/market";
import { useDeskStore } from "@/store/deskStore";
import { showToast } from "@/gamification/ToastHost";
import { track } from "@/lib/analytics/track";

function FormulaRow({
  formula,
  onRemix,
}: {
  formula: PublishedFormula;
  onRemix?: (f: PublishedFormula) => void;
}) {
  return (
    <li className="rounded-lg border border-lab-line/50 bg-lab-wash/50 px-2.5 py-2">
      <div className="flex items-start gap-2">
        <div
          className="mt-0.5 h-10 w-7 shrink-0 rounded-b-xl rounded-t-md border border-lab-glass/40 shadow-sm"
          style={{
            background: `linear-gradient(180deg, #fff8 0%, ${formula.bottleColor ?? "#8fc0b5"} 100%)`,
          }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate font-display text-sm text-lab-ink">
              {formula.title}
            </p>
            <span
              className={`shrink-0 rounded px-1 py-0.5 text-[8px] font-semibold uppercase tracking-label ${
                formula.badge === "screened"
                  ? "bg-lab-teal/15 text-lab-teal"
                  : "bg-lab-amber/15 text-lab-amber"
              }`}
            >
              {formula.badge}
            </span>
          </div>
          <p className="truncate text-[10px] text-lab-muted">
            by {formula.authorName}
            {formula.scentVerdict ? ` · ${formula.scentVerdict}` : ""}
            {formula.contents?.length
              ? ` · ${formula.contents
                  .slice(0, 3)
                  .map((c) => `${c.amountMl} ml`)
                  .join(", ")}${formula.contents.length > 3 ? "…" : ""}`
              : ""}
          </p>
          {formula.scentSummary ? (
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-lab-ink/80">
              {formula.scentSummary}
            </p>
          ) : null}
          <div className="mt-1.5 flex flex-wrap gap-1">
            <Link
              href={`/lab/formula/${formula.id}`}
              className="rounded-md border border-lab-line px-2 py-0.5 text-[10px] font-semibold text-lab-teal hover:bg-white/70"
            >
              Open
            </Link>
            {onRemix ? (
              <button
                type="button"
                onClick={() => onRemix(formula)}
                className="rounded-md bg-lab-teal px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-lab-teal/90"
              >
                Remix on desk
              </button>
            ) : null}
            {formula.studyId ? (
              <Link
                href={`/study/${formula.studyId}`}
                className="rounded-md border border-lab-line px-2 py-0.5 text-[10px] font-semibold text-lab-ink hover:bg-white/70"
              >
                Panel study
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}

export function MarketBrowser({
  compact,
  onRemixClose,
}: {
  compact?: boolean;
  onRemixClose?: () => void;
} = {}) {
  const loadFormula = useDeskStore((s) => s.loadFormula);
  const [query, setQuery] = useState("");
  const [badge, setBadge] = useState<"all" | "screened" | "experimental">(
    "all",
  );
  const [rows, setRows] = useState<PublishedFormula[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listPublishedFormulas({
        search: query,
        badge,
        max: compact ? 24 : 48,
      });
      setRows(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load market");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [query, badge, compact]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function remix(f: PublishedFormula) {
    const id = loadFormula({
      equipmentId: f.equipmentId,
      contentIds: f.contents.map((c) => c.chemicalId),
      contents: f.contents,
    });
    if (!id) {
      showToast({
        title: "Could not load formula",
        detail: "Sign in or clear the guest gate first.",
      });
      return;
    }
    track("market_remix", { formulaId: f.id });
    showToast({
      title: "Remixed on desk",
      detail: f.title,
    });
    onRemixClose?.();
  }

  return (
    <div className={compact ? "space-y-2" : "mx-auto max-w-2xl space-y-3"}>
      <div className="flex flex-wrap gap-1.5">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search titles, authors…"
          className="min-w-[10rem] flex-1 rounded-md border border-lab-line bg-white/80 px-2 py-1 text-xs text-lab-ink placeholder:text-lab-muted"
        />
        {(
          [
            ["all", "All"],
            ["screened", "Screened"],
            ["experimental", "Experimental"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setBadge(id)}
            className={`rounded-md px-2 py-1 text-[10px] font-semibold ${
              badge === id
                ? "bg-lab-teal text-white"
                : "border border-lab-line text-lab-ink hover:bg-lab-wash"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-xs text-lab-muted motion-safe:animate-pulse">
          Loading market…
        </p>
      ) : error ? (
        <p className="rounded-md bg-lab-hazard/10 px-2 py-1.5 text-xs text-lab-hazard">
          {error}
        </p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-lab-muted">
          No formulas yet — publish from the Formula Inspector after pouring a
          blend.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((f) => (
            <FormulaRow key={f.id} formula={f} onRemix={remix} />
          ))}
        </ul>
      )}
    </div>
  );
}

export function MarketPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-lab-ink/50 p-3 backdrop-blur-[1px] sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Atelier Market"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-lab-line bg-lab-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-lab-line/50 px-3 py-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-label text-lab-muted">
              Atelier Market
            </p>
            <h2 className="font-display text-lg text-lab-ink">
              Shared formulas
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            <Link
              href="/market"
              className="rounded-md px-2 py-1 text-[10px] font-semibold text-lab-teal hover:bg-lab-wash"
            >
              Full page
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-2 py-1 text-[10px] font-semibold text-lab-muted hover:bg-lab-wash hover:text-lab-ink"
            >
              Close
            </button>
          </div>
        </div>
        <div className="scroll-thin flex-1 overflow-y-auto px-3 py-2">
          <MarketBrowser compact onRemixClose={onClose} />
        </div>
        <p className="border-t border-lab-line/40 px-3 py-2 text-[9px] leading-snug text-lab-muted">
          Screened = teaching IFRA Category 4 pass. Educational only — not
          certified compliance.
        </p>
      </div>
    </div>
  );
}
