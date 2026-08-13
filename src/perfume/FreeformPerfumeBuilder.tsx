"use client";

import { useMemo, useState } from "react";
import {
  notesByRole,
  type FragranceNote,
} from "@/domains/chemistry/perfume";
import { useDeskStore } from "@/store/deskStore";
import { useInventionStore } from "@/store/inventionStore";
import { showToast } from "@/gamification/ToastHost";
import { track } from "@/lib/analytics/track";

function NotePicker({
  label,
  notes,
  selected,
  onToggle,
}: {
  label: string;
  notes: FragranceNote[];
  selected: string[];
  onToggle: (chemicalId: string) => void;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-label text-lab-muted">
        {label}
      </p>
      <div className="mt-1 flex flex-wrap gap-1">
        {notes.map((n) => {
          const on = selected.includes(n.chemicalId);
          return (
            <button
              key={n.id}
              type="button"
              data-note-id={n.chemicalId}
              onClick={() => onToggle(n.chemicalId)}
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                on
                  ? "bg-lab-teal text-white"
                  : "bg-lab-wash text-lab-ink hover:bg-lab-line/40"
              }`}
            >
              {n.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function FreeformPerfumeBuilder({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const placeEquipment = useDeskStore((s) => s.placeEquipment);
  const addChemicalToVessel = useDeskStore((s) => s.addChemicalToVessel);
  const clearDesk = useDeskStore((s) => s.clearDesk);
  const mixVessel = useDeskStore((s) => s.mixVessel);
  const stirVessel = useDeskStore((s) => s.stirVessel);
  const beginNamingFreeform = useInventionStore((s) => s.beginNamingFreeform);
  const setShelfOpen = useInventionStore((s) => s.setShelfOpen);

  const [top, setTop] = useState<string[]>([]);
  const [heart, setHeart] = useState<string[]>([]);
  const [base, setBase] = useState<string[]>([]);
  const [name, setName] = useState("");

  const tops = useMemo(() => notesByRole("top"), []);
  const hearts = useMemo(() => notesByRole("heart"), []);
  const bases = useMemo(
    () => [...notesByRole("base"), ...notesByRole("fixative")],
    [],
  );

  if (!open) return null;

  function toggle(
    list: string[],
    set: (v: string[]) => void,
    id: string,
  ) {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  function pyramidIds() {
    return [
      "c2h5oh",
      ...top.slice(0, 1),
      ...heart.slice(0, 1),
      ...base.slice(0, 1),
    ];
  }

  function freshBeakerWithPyramid(): string | null {
    // Clear leftovers so capacity isn't stolen by a prior goal mix
    clearDesk();
    const vesselId = placeEquipment("beaker", { x: 120, y: 140 });
    if (!vesselId) return null;
    for (const id of pyramidIds()) {
      addChemicalToVessel(vesselId, id);
    }
    const loaded = useDeskStore
      .getState()
      .vessels.find((v) => v.instanceId === vesselId)?.contentIds;
    if (!loaded || loaded.length < 4) {
      showToast({
        title: "Couldn't load blend",
        detail: "Try again — need ethanol + top + heart + base in the beaker.",
      });
      return null;
    }
    return vesselId;
  }

  function loadOntoDesk() {
    if (!top.length || !heart.length || !base.length) {
      showToast({
        title: "Pick a full pyramid",
        detail: "Need at least one top, heart, and base note.",
      });
      return;
    }
    if (!freshBeakerWithPyramid()) return;
    track("perfume_start", { recipeId: "custom", freeform: true });
    showToast({
      title: "Desk loaded",
      detail: "Stir and Mix, then save your blend to My Shelf.",
    });
    onClose();
  }

  function craftAndSave() {
    if (!top.length || !heart.length || !base.length) {
      showToast({
        title: "Pick a full pyramid",
        detail: "Need at least one top, heart, and base note.",
      });
      return;
    }
    const label = name.trim() || "Untitled freeform";
    const vesselId = freshBeakerWithPyramid();
    if (!vesselId) return;

    stirVessel(vesselId);
    mixVessel(vesselId);

    const vessel = useDeskStore
      .getState()
      .vessels.find((v) => v.instanceId === vesselId);
    if (!vessel) return;

    const inv = beginNamingFreeform({
      name: label,
      vessel,
      perfumeNotes: { top, heart, base },
    });
    if (inv) {
      track("perfume_start", { recipeId: "custom", freeform: true, saved: true });
      showToast({
        title: `“${inv.name}” on your Shelf`,
        detail: `Score ${inv.bestScore} — remix anytime to improve.`,
      });
      onClose();
      setShelfOpen(true);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-lab-ink/45 p-3 pt-[8vh] backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Freeform perfume"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-lab-line bg-lab-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-lab-line/50 px-4 py-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-label text-lab-teal">
              Freeform
            </p>
            <h2 className="font-display text-xl text-lab-ink">
              Invent your own perfume
            </h2>
          </div>
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-sm text-lab-muted hover:bg-lab-wash"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="scroll-thin max-h-[55vh] space-y-3 overflow-y-auto px-4 py-3">
          <NotePicker
            label="Top notes"
            notes={tops}
            selected={top}
            onToggle={(id) => toggle(top, setTop, id)}
          />
          <NotePicker
            label="Heart notes"
            notes={hearts}
            selected={heart}
            onToggle={(id) => toggle(heart, setHeart, id)}
          />
          <NotePicker
            label="Base / fixative"
            notes={bases}
            selected={base}
            onToggle={(id) => toggle(base, setBase, id)}
          />
          <label className="block">
            <span className="text-[10px] font-semibold uppercase tracking-label text-lab-muted">
              Name your blend
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Midnight Orchard"
              className="mt-1 w-full rounded-lg border border-lab-line bg-white px-2.5 py-1.5 text-xs outline-none focus:border-lab-teal"
            />
          </label>
        </div>
        <div className="flex gap-2 border-t border-lab-line/50 px-4 py-3">
          <button
            type="button"
            onClick={loadOntoDesk}
            className="flex-1 rounded-lg border border-lab-line bg-white px-3 py-2 text-xs font-semibold text-lab-ink hover:bg-lab-wash"
          >
            Load onto desk
          </button>
          <button
            type="button"
            onClick={craftAndSave}
            className="flex-[1.4] rounded-lg bg-lab-teal px-3 py-2 text-xs font-semibold text-white hover:bg-lab-teal/90"
          >
            Craft & save to Shelf
          </button>
        </div>
      </div>
    </div>
  );
}
