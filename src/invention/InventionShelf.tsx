"use client";

import { useEffect, useMemo, useState } from "react";
import type { Invention } from "@/domains/chemistry/invention";
import { resolveScentProfile } from "@/domains/chemistry/perfume";
import { ScentProfileDetails } from "@/perfume/ScentProfileDetails";
import { useInventionStore } from "@/store/inventionStore";
import { useDeskStore } from "@/store/deskStore";
import { showToast } from "@/gamification/ToastHost";
import { track } from "@/lib/analytics/track";
import { InventionShareCard } from "@/invention/InventionShareCard";

function tierLabel(tier: string) {
  if (tier === "signature") return "Signature";
  if (tier === "refine") return "Refine";
  return "Make";
}

function InventionRow({
  inv,
  onRemix,
  onCompare,
  onShare,
  onDelete,
}: {
  inv: Invention;
  onRemix: () => void;
  onCompare: () => void;
  onShare: () => void;
  onDelete: () => void;
}) {
  const latest = inv.versions[inv.versions.length - 1];
  const [dossierOpen, setDossierOpen] = useState(false);

  const scentProfile = useMemo(() => {
    if (inv.kind !== "perfume") return null;
    return resolveScentProfile({
      goalId: inv.sourceGoalId,
      perfumeRecipeId: inv.perfumeRecipeId,
      contentIds: latest?.snapshot.contentIds,
      displayName: inv.name,
    });
  }, [inv, latest]);

  return (
    <li className="rounded-xl border border-lab-line/60 bg-white/80 px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-display text-base text-lab-ink">
            {inv.name}
          </p>
          <p className="text-[10px] uppercase tracking-label text-lab-muted">
            {inv.kind} · v{latest?.version ?? 1} · {tierLabel(latest?.tier ?? "make")}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-display text-lg text-lab-teal">{inv.bestScore}</p>
          <p className="text-[9px] uppercase tracking-label text-lab-muted">
            best
          </p>
        </div>
      </div>
      {latest?.notes?.[0] ? (
        <p className="mt-1 line-clamp-2 text-[11px] text-lab-ink/75">
          {latest.notes[0]}
        </p>
      ) : null}

      {scentProfile ? (
        <div className="mt-2">
          {!dossierOpen ? (
            <button
              type="button"
              onClick={() => setDossierOpen(true)}
              className="w-full rounded-lg border border-lab-teal/30 bg-lab-teal/5 px-2.5 py-1.5 text-left transition hover:bg-lab-teal/10"
            >
              <p className="text-[10px] font-semibold uppercase tracking-label text-lab-teal">
                Perfume dossier
              </p>
              <p className="mt-0.5 line-clamp-2 text-[11px] text-lab-ink/85">
                Smells like {scentProfile.smellsLike}
              </p>
              <p className="mt-0.5 text-[10px] text-lab-muted">
                Notes · ingredients · tap to expand
              </p>
            </button>
          ) : (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-label text-lab-teal">
                  Perfume dossier
                </p>
                <button
                  type="button"
                  onClick={() => setDossierOpen(false)}
                  className="text-[10px] text-lab-muted hover:text-lab-ink"
                >
                  Collapse
                </button>
              </div>
              <ScentProfileDetails profile={scentProfile} />
            </div>
          )}
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={onRemix}
          className="rounded-md bg-lab-teal px-2 py-1 text-[10px] font-semibold text-white hover:bg-lab-teal/90"
        >
          Remix on desk
        </button>
        {inv.versions.length >= 2 ? (
          <button
            type="button"
            onClick={onCompare}
            className="rounded-md border border-lab-line bg-lab-wash px-2 py-1 text-[10px] font-semibold text-lab-ink hover:bg-white"
          >
            Compare versions
          </button>
        ) : null}
        <button
          type="button"
          onClick={onShare}
          className="rounded-md border border-lab-amber/50 bg-lab-amber/15 px-2 py-1 text-[10px] font-semibold text-lab-ink hover:bg-lab-amber/25"
        >
          Share card
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-md px-2 py-1 text-[10px] font-medium text-lab-muted hover:text-lab-hazard"
        >
          Delete
        </button>
      </div>
    </li>
  );
}

function ComparePanel({
  inv,
  a,
  b,
  onClose,
}: {
  inv: Invention;
  a: number;
  b: number;
  onClose: () => void;
}) {
  const va = inv.versions.find((v) => v.version === a) ?? inv.versions[0];
  const vb =
    inv.versions.find((v) => v.version === b) ??
    inv.versions[inv.versions.length - 1];
  if (!va || !vb) return null;
  const delta = vb.score - va.score;
  return (
    <div className="mt-3 rounded-xl border border-lab-teal/30 bg-lab-wash/60 p-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-label text-lab-teal">
          Version compare
        </p>
        <button
          type="button"
          className="text-[11px] text-lab-muted hover:text-lab-ink"
          onClick={onClose}
        >
          Close
        </button>
      </div>
      <p className="mt-1 font-display text-sm text-lab-ink">{inv.name}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {[va, vb].map((v) => (
          <div
            key={v.version}
            className="rounded-lg border border-lab-line/50 bg-white px-2 py-2"
          >
            <p className="text-[10px] uppercase tracking-label text-lab-muted">
              v{v.version} · {tierLabel(v.tier)}
            </p>
            <p className="font-display text-xl text-lab-teal">{v.score}</p>
            <ul className="mt-1 space-y-0.5">
              {v.notes.slice(0, 3).map((n) => (
                <li key={n} className="text-[10px] leading-snug text-lab-ink/80">
                  · {n}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p
        className={`mt-2 text-center text-xs font-semibold ${
          delta > 0
            ? "text-lab-teal"
            : delta < 0
              ? "text-lab-hazard"
              : "text-lab-muted"
        }`}
      >
        {delta > 0
          ? `+${delta} — you improved it`
          : delta < 0
            ? `${delta} — earlier version scored higher`
            : "Same score — try a different ratio"}
      </p>
    </div>
  );
}

export function InventionShelf() {
  const open = useInventionStore((s) => s.shelfOpen);
  const setShelfOpen = useInventionStore((s) => s.setShelfOpen);
  const inventions = useInventionStore((s) => s.inventions);
  const compare = useInventionStore((s) => s.compare);
  const setCompare = useInventionStore((s) => s.setCompare);
  const setRemixInventionId = useInventionStore((s) => s.setRemixInventionId);
  const deleteInvention = useInventionStore((s) => s.deleteInvention);
  const ensureDailyBrief = useInventionStore((s) => s.ensureDailyBrief);
  const loadFormula = useDeskStore((s) => s.loadFormula);

  const [brief, setBrief] = useState<{
    kind: "improve" | "family";
    message: string;
    inventionId?: string;
  } | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setBrief(null);
      return;
    }
    setBrief(ensureDailyBrief());
  }, [open, ensureDailyBrief, inventions.length]);

  if (!open) return null;

  function remix(inv: Invention) {
    const latest = inv.versions[inv.versions.length - 1];
    if (!latest) return;
    const id = loadFormula({
      equipmentId: latest.snapshot.equipmentId || "beaker",
      contentIds: latest.snapshot.contentIds,
      contents: latest.snapshot.contents,
      heatAttached: latest.snapshot.heatAttached,
      coolAttached: latest.snapshot.coolAttached,
      stirLevel: latest.snapshot.stirLevel,
      autoMix: false,
    });
    if (!id) {
      showToast({
        title: "Sign in to remix",
        detail: "Lab actions need an account.",
      });
      return;
    }
    setRemixInventionId(inv.id);
    setShelfOpen(false);
    track("shelf_remix", { inventionId: inv.id, version: latest.version });
    showToast({
      title: `Remixing “${inv.name}”`,
      detail: "Tweak the formula, then Mix — beat your best score.",
    });
  }

  const shareInv = shareId
    ? inventions.find((i) => i.id === shareId)
    : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-lab-ink/45 p-3 pt-[6vh] backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="My Shelf"
      onClick={() => setShelfOpen(false)}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-lab-line bg-lab-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-lab-line/50 px-4 py-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-label text-lab-teal">
              My Shelf
            </p>
            <h2 className="font-display text-xl text-lab-ink">
              Your creations
            </h2>
          </div>
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-sm text-lab-muted hover:bg-lab-wash"
            onClick={() => setShelfOpen(false)}
          >
            ✕
          </button>
        </div>

        {brief ? (
          <div className="border-b border-lab-amber/30 bg-lab-amber/10 px-4 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-label text-lab-amber">
              Today&apos;s brief
            </p>
            <p className="text-[12px] text-lab-ink">{brief.message}</p>
          </div>
        ) : null}

        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {inventions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-lab-line bg-lab-wash/40 px-4 py-10 text-center">
              <p className="font-display text-lg text-lab-ink">
                Nothing on your shelf yet
              </p>
              <p className="mt-1 text-[12px] text-lab-muted">
                Finish a goal and name what you made. Authorship lives here —
                not just XP.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {inventions.map((inv) => (
                <InventionRow
                  key={inv.id}
                  inv={inv}
                  onRemix={() => remix(inv)}
                  onCompare={() => {
                    const last = inv.versions.length;
                    setCompare({
                      inventionId: inv.id,
                      a: Math.max(1, last - 1),
                      b: last,
                    });
                  }}
                  onShare={() => setShareId(inv.id)}
                  onDelete={() => {
                    deleteInvention(inv.id);
                    showToast({ title: "Removed from Shelf" });
                  }}
                />
              ))}
            </ul>
          )}

          {compare ? (
            (() => {
              const inv = inventions.find((i) => i.id === compare.inventionId);
              if (!inv) return null;
              return (
                <ComparePanel
                  inv={inv}
                  a={compare.a}
                  b={compare.b}
                  onClose={() => setCompare(null)}
                />
              );
            })()
          ) : null}
        </div>
      </div>

      {shareInv ? (
        <InventionShareCard
          invention={shareInv}
          onClose={() => setShareId(null)}
        />
      ) : null}
    </div>
  );
}
