"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DeskVessel, EngineResult, VesselContent, VesselFx } from "@/types";
import { resolveDomain } from "@/domains/registry";
import { EQUIPMENT_BY_ID } from "@/domains/chemistry/data/equipment";
import { getChemical } from "@/domains/chemistry/data/chemicals";
import { computeLivePreview } from "@/domains/chemistry/engine/liveFormula";
import { labSound } from "@/desk/labSound";
import { assertLabActionAllowed, useAuthStore } from "@/store/authStore";
import {
  capacityMlForEquipment,
  defaultPourMl,
  fillPctFromContents,
  getVesselContents,
  isOverflowing,
  pourIntoContents,
  setContentAmount,
  syncVesselContents,
  transferContents,
} from "@/desk/vesselContents";
import { resolveGlassShape } from "@/animation/glassware/shapes";
import {
  SNAP_GAP_PX,
  currentVesselCard,
  findFreeSlot,
  separateOverlappingPositions,
  slotOrigin,
  stampSlotFrom,
  snapAlignPosition,
} from "@/desk/vesselLayout";
import { POUR_WINDOW_MS } from "@/animation/fxIntensity";
import { useInventoryStockStore, defaultStockMl } from "@/store/inventoryStockStore";
import { showToast } from "@/gamification/ToastHost";
import { labCopy } from "@/lab/labCopy";
import {
  defaultVesselSim,
  ensureSim,
  simNeedsTick,
  tickVesselSim,
} from "@/desk/vesselSim";
import { mixToggleDecision, shouldStampCupSet } from "@/desk/mixCastGuard";

if (typeof window !== "undefined") {
  try {
    const next = window.localStorage.getItem("chemlab-desk");
    const prev = window.localStorage.getItem("reactolab-desk");
    if (!next && prev) window.localStorage.setItem("chemlab-desk", prev);
  } catch {
    /* ignore */
  }
}

const SIM_FALLBACK_DT = 500;

interface DeskState {
  vessels: DeskVessel[];
  activeVesselId: string | null;
  lastExplanationVesselId: string | null;
  /** Preferred pour volume when adding chemicals (ml). */
  pourAmountMl: number;
  /** Wall clock of last tickSims (for dt). */
  lastSimTickAt: number | null;
  setPourAmountMl: (ml: number) => void;
  placeEquipment: (
    equipmentId: string,
    position?: { x: number; y: number },
  ) => string | null;
  moveVessel: (vesselId: string, position: { x: number; y: number }) => void;
  /** Park overlapping cards into a gapped row. No-op during transfer pour. */
  nudgeOverlappingVessels: () => void;
  addChemicalToVessel: (
    vesselId: string,
    chemicalId: string,
    amountMl?: number,
    opts?: { consumeStock?: boolean; bypassGuestLimit?: boolean },
  ) => boolean;
  setChemicalAmount: (
    vesselId: string,
    chemicalId: string,
    amountMl: number,
  ) => void;
  /** Pour contents from one vessel into another (up to capacity). */
  transferVesselContents: (fromId: string, toId: string) => boolean;
  attachHeat: (vesselId: string) => void;
  detachHeat: (vesselId: string) => void;
  toggleHeat: (vesselId: string) => void;
  attachCool: (vesselId: string) => void;
  detachCool: (vesselId: string) => void;
  toggleCool: (vesselId: string) => void;
  stirVessel: (vesselId: string, autoMix?: boolean) => EngineResult | null;
  /** Toggle continuous stir (alive swirl + level climb). */
  toggleStirActive: (vesselId: string) => void;
  /** Toggle continuous shake. */
  toggleShakeActive: (vesselId: string) => void;
  /** Toggle continuous mix/cast (auto-resolves chemistry after timer). */
  toggleMixActive: (vesselId: string) => void;
  removeLastChemical: (vesselId: string) => void;
  removeVessel: (vesselId: string) => void;
  clearVessel: (vesselId: string) => void;
  /** Remove every vessel from the desk. */
  clearDesk: () => void;
  setActiveVessel: (id: string | null) => void;
  mixVessel: (vesselId: string) => EngineResult | null;
  shakeVessel: (vesselId: string) => EngineResult | null;
  /** Advance live heat/cool/stir/evaporation sim (call ~500ms). */
  tickSims: (now?: number) => void;
  seedDemoReaction: () => EngineResult | null;
  runPair: (
    equipmentId: string,
    a: string,
    b: string,
    heat?: boolean,
  ) => EngineResult | null;
  /** Clear desk and restore a saved formula for remix. */
  loadFormula: (input: {
    equipmentId: string;
    contentIds: string[];
    contents?: VesselContent[];
    heatAttached?: boolean;
    coolAttached?: boolean;
    stirLevel?: number;
    autoMix?: boolean;
  }) => string | null;
}

function uid(): string {
  return `v-${Math.random().toString(36).slice(2, 10)}`;
}

function patchFx(fx: VesselFx | undefined, patch: VesselFx): VesselFx {
  return { ...fx, ...patch };
}

function withLivePreview(vessel: DeskVessel): DeskVessel {
  const contents = getVesselContents(vessel);
  const synced = syncVesselContents(contents);
  const livePreview =
    synced.contents.length > 0
      ? computeLivePreview({
          contents: synced.contents,
          equipmentId: vessel.equipmentId,
          heatAttached: vessel.heatAttached,
          coolAttached: vessel.coolAttached,
        })
      : undefined;
  return {
    ...vessel,
    ...synced,
    livePreview,
  };
}

function resolveMix(vessel: DeskVessel): EngineResult {
  const contents = getVesselContents(vessel);
  const functions: string[] = [];
  if (vessel.heatAttached) functions.push("heat-source");
  if (vessel.coolAttached) functions.push("cold-source");
  const amounts: Record<string, number> = {};
  for (const c of contents) amounts[c.chemicalId] = c.amountMl;
  return resolveDomain("chemistry", {
    itemIds: syncedIds(contents),
    amounts,
    equipmentFunctions: functions,
  });
}

function syncedIds(contents: VesselContent[]): string[] {
  return contents.map((c) => c.chemicalId);
}

export const useDeskStore = create<DeskState>()(
  persist(
    (set, get) => ({
      vessels: [],
      activeVesselId: null,
      lastExplanationVesselId: null,
      pourAmountMl: 2,
      lastSimTickAt: null,

      setPourAmountMl: (ml) => {
        const clamped = Math.round(Math.max(0.1, Math.min(50, ml)) * 10) / 10;
        set({ pourAmountMl: clamped });
      },

      placeEquipment: (equipmentId, position) => {
        const eq = EQUIPMENT_BY_ID[equipmentId];
        if (!eq) return null;

        if (eq.function === "heat-source") {
          const active = get().activeVesselId;
          if (active) {
            get().attachHeat(active);
            return active;
          }
          return null;
        }

        if (eq.function === "cold-source") {
          const active = get().activeVesselId;
          if (active) {
            get().attachCool(active);
            return active;
          }
          return null;
        }

        if (eq.function === "stirring") {
          const active = get().activeVesselId;
          if (active) {
            get().stirVessel(active, true);
            return active;
          }
          return null;
        }

        if (eq.function !== "container" && eq.function !== "measuring") {
          return null;
        }

        const instanceId = uid();
        const card = currentVesselCard();
        const occupied = get().vessels.map((v) => v.position);
        const from = position
          ? { x: Math.max(8, position.x), y: Math.max(8, position.y) }
          : slotOrigin(card);
        const to = findFreeSlot(occupied, position, card);
        stampSlotFrom(instanceId, from, to);
        const vessel: DeskVessel = {
          instanceId,
          equipmentId,
          contents: [],
          contentIds: [],
          heatAttached: false,
          coolAttached: false,
          stirLevel: 0,
          fx: {},
          sim: defaultVesselSim(
            equipmentId === "tin" ? { meltFraction: 0, viscosity: 0.7 } : undefined,
          ),
          position: to,
        };
        labSound.place();
        set((s) => ({
          vessels: [...s.vessels, vessel],
          activeVesselId: instanceId,
        }));
        return instanceId;
      },

      moveVessel: (vesselId, position) => {
        set((s) => ({
          vessels: s.vessels.map((v) =>
            v.instanceId === vesselId
              ? {
                  ...v,
                  position: {
                    x: Math.max(8, position.x),
                    y: Math.max(8, position.y),
                  },
                }
              : v,
          ),
        }));
      },

      nudgeOverlappingVessels: () => {
        const now = Date.now();
        const vessels = get().vessels;
        if (
          vessels.some(
            (v) =>
              v.fx?.transferAt != null && now - v.fx.transferAt < POUR_WINDOW_MS,
          )
        ) {
          return;
        }
        const next = separateOverlappingPositions(
          vessels.map((v) => ({ id: v.instanceId, position: v.position })),
          currentVesselCard(),
        );
        if (!next) return;
        const byId = new Map(next.map((p) => [p.id, p.position]));
        set((s) => ({
          vessels: s.vessels.map((v) => {
            const pos = byId.get(v.instanceId);
            if (!pos) return v;
            if (
              Math.abs(pos.x - v.position.x) < 0.5 &&
              Math.abs(pos.y - v.position.y) < 0.5
            ) {
              return v;
            }
            stampSlotFrom(v.instanceId, v.position, pos);
            return { ...v, position: pos };
          }),
        }));
      },

      addChemicalToVessel: (vesselId, chemicalId, amountMl, opts) => {
        // Bulk hydrate (Open in Lab / market remix) must not trip the 2-pour guest gate mid-loop.
        const bypassGuestLimit = opts?.bypassGuestLimit === true;
        if (!bypassGuestLimit && !assertLabActionAllowed()) return false;

        let added = false;
        const color = getChemical(chemicalId)?.color;
        const pour =
          amountMl ?? get().pourAmountMl ?? defaultPourMl(chemicalId);
        const consumeStock = opts?.consumeStock !== false;

        if (consumeStock) {
          const stock = useInventoryStockStore.getState();
          if (!stock.tryConsume(chemicalId, pour)) {
            showToast({
              title: "Bottle empty",
              detail: `Not enough ${getChemical(chemicalId)?.name ?? chemicalId} — refill bottles.`,
            });
            return false;
          }
        }

        set((s) => ({
          vessels: s.vessels.map((v) => {
            if (v.instanceId !== vesselId) return v;
            const contents = getVesselContents(v);
            const cap = capacityMlForEquipment(v.equipmentId);
            const next = pourIntoContents(contents, chemicalId, pour, cap);
            if (!next) return v;
            added = true;
            return withLivePreview({
              ...v,
              ...syncVesselContents(next),
              lastResult: undefined,
              stirLevel: 0,
              fx: patchFx(v.fx, {
                pourAt: Date.now(),
                pourColor: color,
              }),
            });
          }),
          activeVesselId: vesselId,
        }));
        if (!added) {
          if (consumeStock) {
            useInventoryStockStore.setState((s) => ({
              stockMlByChemicalId: {
                ...s.stockMlByChemicalId,
                [chemicalId]:
                  Math.round(
                    ((s.stockMlByChemicalId[chemicalId] ??
                      defaultStockMl(chemicalId)) +
                      pour) *
                      100,
                  ) / 100,
              },
            }));
          }
          return false;
        }
        labSound.pour();
        const poured = get()
          .vessels.find((v) => v.instanceId === vesselId);
        if (
          poured &&
          isOverflowing(
            getVesselContents(poured),
            capacityMlForEquipment(poured.equipmentId),
          )
        ) {
          showToast(labCopy.pourOverflow);
        }
        const auth = useAuthStore.getState();
        if (!auth.user && !bypassGuestLimit) {
          auth.recordGuestChemicalAdd();
        }
        return true;
      },

      setChemicalAmount: (vesselId, chemicalId, amountMl) => {
        if (!assertLabActionAllowed()) return;
        set((s) => ({
          vessels: s.vessels.map((v) => {
            if (v.instanceId !== vesselId) return v;
            const contents = getVesselContents(v);
            const cap = capacityMlForEquipment(v.equipmentId);
            const next = setContentAmount(
              contents,
              chemicalId,
              amountMl,
              cap,
            );
            return withLivePreview({
              ...v,
              ...syncVesselContents(next),
              lastResult: undefined,
            });
          }),
          activeVesselId: vesselId,
        }));
      },

      transferVesselContents: (fromId, toId) => {
        if (!assertLabActionAllowed()) return false;
        if (fromId === toId) return false;
        const state = get();
        const from = state.vessels.find((v) => v.instanceId === fromId);
        const to = state.vessels.find((v) => v.instanceId === toId);
        if (!from || !to) return false;
        const fromContents = getVesselContents(from);
        if (fromContents.length === 0) return false;

        const toContents = getVesselContents(to);
        const cap = capacityMlForEquipment(to.equipmentId);
        const result = transferContents(fromContents, toContents, cap);
        if (!result) return false;

        const leavingId =
          fromContents[fromContents.length - 1]?.chemicalId ??
          result.to[result.to.length - 1]?.chemicalId;
        const pourColor = leavingId
          ? getChemical(leavingId)?.color
          : undefined;
        const now = Date.now();
        const sourceFillPct = fillPctFromContents(
          fromContents,
          from.equipmentId,
        );
        const targetFillPct = fillPctFromContents(
          toContents,
          to.equipmentId,
        );
        // Stamp desk-local lip origin so PourStream / dead pourFrom path stay live
        const geo = resolveGlassShape(from.equipmentId);
        const card = currentVesselCard();
        const scaleX = (card.width - card.glassInsetX * 2) / 100;
        const scaleY = card.glassH / 140;
        const pourFrom = {
          x: from.position.x + card.glassInsetX + geo.lip.x * scaleX,
          y: from.position.y + card.glassTop + geo.lip.y * scaleY,
        };
        const pourHome =
          snapAlignPosition(from.position, [to.position], card) ?? {
            x:
              from.position.x >= to.position.x
                ? to.position.x + card.width + SNAP_GAP_PX
                : Math.max(8, to.position.x - card.width - SNAP_GAP_PX),
            y: to.position.y,
          };

        // Pour audio fires on stream phase start (VesselEffects), not here
        set((s) => ({
          vessels: s.vessels.map((v) => {
            if (v.instanceId === fromId) {
              return withLivePreview({
                ...v,
                ...syncVesselContents(result.from),
                lastResult: undefined,
                stirLevel: 0,
                fx: patchFx(v.fx, {
                  transferAt: now,
                  transferFromId: fromId,
                  transferToId: toId,
                  transferRole: "source",
                  pourColor,
                  sourceFillPct,
                  targetFillPct,
                  pourFrom,
                  pourHome,
                }),
              });
            }
            if (v.instanceId === toId) {
              return withLivePreview({
                ...v,
                ...syncVesselContents(result.to),
                lastResult: undefined,
                stirLevel: 0,
                fx: patchFx(v.fx, {
                  pourAt: now,
                  pourColor,
                  transferAt: now,
                  transferFromId: fromId,
                  transferToId: toId,
                  transferRole: "target",
                  pourFrom,
                  targetFillPct,
                }),
              });
            }
            return v;
          }),
          activeVesselId: toId,
        }));
        const target = get().vessels.find((v) => v.instanceId === toId);
        if (
          target &&
          isOverflowing(
            getVesselContents(target),
            capacityMlForEquipment(target.equipmentId),
          )
        ) {
          showToast(labCopy.pourOverflow);
        }
        return true;
      },

      attachHeat: (vesselId) => {
        labSound.heat();
        const now = Date.now();
        set((s) => ({
          vessels: s.vessels.map((v) => {
            if (v.instanceId !== vesselId) return v;
            const sim = ensureSim(v);
            return withLivePreview({
              ...v,
              heatAttached: true,
              coolAttached: false,
              fx: patchFx(v.fx, { heatFlashAt: now }),
              sim: {
                ...sim,
                processStartedAt: now,
                coolElapsedMs: 0,
              },
            });
          }),
          activeVesselId: vesselId,
        }));
      },

      detachHeat: (vesselId) => {
        set((s) => ({
          vessels: s.vessels.map((v) => {
            if (v.instanceId !== vesselId) return v;
            const sim = ensureSim(v);
            return withLivePreview({
              ...v,
              heatAttached: false,
              sim: {
                ...sim,
                processStartedAt: v.coolAttached ? sim.processStartedAt : undefined,
              },
            });
          }),
        }));
      },

      toggleHeat: (vesselId) => {
        const v = get().vessels.find((x) => x.instanceId === vesselId);
        if (!v) return;
        if (v.heatAttached) get().detachHeat(vesselId);
        else get().attachHeat(vesselId);
      },

      attachCool: (vesselId) => {
        labSound.cool();
        const now = Date.now();
        set((s) => ({
          vessels: s.vessels.map((v) => {
            if (v.instanceId !== vesselId) return v;
            const sim = ensureSim(v);
            return withLivePreview({
              ...v,
              coolAttached: true,
              heatAttached: false,
              fx: patchFx(v.fx, { coolFlashAt: now }),
              sim: {
                ...sim,
                processStartedAt: now,
                heatElapsedMs: 0,
              },
            });
          }),
          activeVesselId: vesselId,
        }));
      },

      detachCool: (vesselId) => {
        set((s) => ({
          vessels: s.vessels.map((v) => {
            if (v.instanceId !== vesselId) return v;
            const sim = ensureSim(v);
            return withLivePreview({
              ...v,
              coolAttached: false,
              sim: {
                ...sim,
                // Keep frost / coolElapsed so mid-abort leaves partial ice state
                processStartedAt: v.heatAttached ? sim.processStartedAt : undefined,
              },
            });
          }),
        }));
      },

      toggleCool: (vesselId) => {
        const v = get().vessels.find((x) => x.instanceId === vesselId);
        if (!v) return;
        if (v.coolAttached) get().detachCool(vesselId);
        else get().attachCool(vesselId);
      },

      stirVessel: (vesselId, autoMix = false) => {
        if (!assertLabActionAllowed()) return null;
        labSound.stir();
        const vessel = get().vessels.find((v) => v.instanceId === vesselId);
        if (!vessel) return null;

        const contents = getVesselContents(vessel);
        const nextLevel = Math.min(3, vessel.stirLevel + 1);
        const now = Date.now();
        const sim = ensureSim(vessel);
        set((s) => ({
          vessels: s.vessels.map((v) =>
            v.instanceId === vesselId
              ? {
                  ...v,
                  stirLevel: nextLevel,
                  fx: patchFx(v.fx, { stirAt: now }),
                  sim: {
                    ...sim,
                    stirActive: true,
                    stirStartedAt: sim.stirStartedAt ?? now,
                    processStartedAt: sim.processStartedAt ?? now,
                  },
                }
              : v,
          ),
          activeVesselId: vesselId,
        }));

        const canMix =
          contents.length >= 2 ||
          (contents.length >= 1 && vessel.heatAttached);

        if (autoMix && canMix && nextLevel >= 2) {
          return get().mixVessel(vesselId);
        }
        return null;
      },

      toggleStirActive: (vesselId) => {
        if (!assertLabActionAllowed()) return;
        const vessel = get().vessels.find((v) => v.instanceId === vesselId);
        if (!vessel) return;
        const sim = ensureSim(vessel);
        const now = Date.now();
        if (sim.stirActive) {
          set((s) => ({
            vessels: s.vessels.map((v) =>
              v.instanceId === vesselId
                ? {
                    ...v,
                    sim: {
                      ...ensureSim(v),
                      stirActive: false,
                      stirStartedAt: undefined,
                    },
                  }
                : v,
            ),
          }));
          return;
        }
        labSound.stir();
        set((s) => ({
          vessels: s.vessels.map((v) =>
            v.instanceId === vesselId
              ? {
                  ...v,
                  stirLevel: Math.min(3, Math.max(1, v.stirLevel)),
                  fx: patchFx(v.fx, { stirAt: now }),
                  sim: {
                    ...sim,
                    stirActive: true,
                    stirStartedAt: now,
                    shakeActive: false,
                    shakeStartedAt: undefined,
                    shakeUntil: undefined,
                    mixActive: false,
                    mixStartedAt: undefined,
                    mixResolved: false,
                    processStartedAt: sim.processStartedAt ?? now,
                  },
                }
              : v,
          ),
          activeVesselId: vesselId,
        }));
      },

      toggleShakeActive: (vesselId) => {
        if (!assertLabActionAllowed()) return;
        const vessel = get().vessels.find((v) => v.instanceId === vesselId);
        if (!vessel) return;
        if (vessel.equipmentId === "tin") return;
        const sim = ensureSim(vessel);
        const now = Date.now();
        if (sim.shakeActive) {
          set((s) => ({
            vessels: s.vessels.map((v) =>
              v.instanceId === vesselId
                ? {
                    ...v,
                    sim: {
                      ...ensureSim(v),
                      shakeActive: false,
                      shakeStartedAt: undefined,
                      shakeUntil: undefined,
                    },
                  }
                : v,
            ),
          }));
          return;
        }
        labSound.shake();
        set((s) => ({
          vessels: s.vessels.map((v) =>
            v.instanceId === vesselId
              ? {
                  ...v,
                  stirLevel: Math.min(3, v.stirLevel + 1),
                  fx: patchFx(v.fx, { shakeAt: now }),
                  sim: {
                    ...sim,
                    shakeActive: true,
                    shakeStartedAt: now,
                    shakeUntil: undefined,
                    stirActive: false,
                    stirStartedAt: undefined,
                    mixActive: false,
                    mixStartedAt: undefined,
                    mixResolved: false,
                    processStartedAt: sim.processStartedAt ?? now,
                  },
                }
              : v,
          ),
          activeVesselId: vesselId,
        }));
      },

      toggleMixActive: (vesselId) => {
        if (!assertLabActionAllowed()) return;
        const vessel = get().vessels.find((v) => v.instanceId === vesselId);
        if (!vessel) return;
        const sim = ensureSim(vessel);
        const now = Date.now();
        const decision = mixToggleDecision({
          contentsCount: getVesselContents(vessel).length,
          mixActive: Boolean(sim.mixActive),
          mixResolved: Boolean(sim.mixResolved),
        });
        if (decision === "empty") {
          showToast(
            vessel.equipmentId === "tin" ? labCopy.emptyCast : labCopy.emptyMix,
          );
          return;
        }
        if (decision === "hold") return;
        if (decision === "off") {
          set((s) => ({
            vessels: s.vessels.map((v) =>
              v.instanceId === vesselId
                ? {
                    ...v,
                    sim: {
                      ...ensureSim(v),
                      mixActive: false,
                      mixStartedAt: undefined,
                      mixResolved: false,
                    },
                  }
                : v,
            ),
          }));
          return;
        }
        labSound.mix();
        set((s) => ({
          vessels: s.vessels.map((v) =>
            v.instanceId === vesselId
              ? {
                  ...v,
                  fx: patchFx(v.fx, { mixAt: now, stirAt: now }),
                  sim: {
                    ...sim,
                    mixActive: true,
                    mixStartedAt: now,
                    mixResolved: false,
                    stirActive: false,
                    stirStartedAt: undefined,
                    shakeActive: false,
                    shakeStartedAt: undefined,
                    shakeUntil: undefined,
                    processStartedAt: now,
                  },
                }
              : v,
          ),
          activeVesselId: vesselId,
        }));
      },

      removeLastChemical: (vesselId) => {
        labSound.clear();
        set((s) => ({
          vessels: s.vessels.map((v) => {
            if (v.instanceId !== vesselId) return v;
            const contents = getVesselContents(v);
            if (contents.length === 0) return v;
            return withLivePreview({
              ...v,
              ...syncVesselContents(contents.slice(0, -1)),
              lastResult: undefined,
              stirLevel: 0,
            });
          }),
        }));
      },

      removeVessel: (vesselId) => {
        labSound.clear();
        set((s) => ({
          vessels: s.vessels.filter((v) => v.instanceId !== vesselId),
          activeVesselId:
            s.activeVesselId === vesselId ? null : s.activeVesselId,
        }));
      },

      clearVessel: (vesselId) => {
        labSound.clear();
        set((s) => ({
          vessels: s.vessels.map((v) =>
            v.instanceId === vesselId
              ? {
                  ...v,
                  contents: [],
                  contentIds: [],
                  lastResult: undefined,
                  livePreview: undefined,
                  heatAttached: false,
                  coolAttached: false,
                  stirLevel: 0,
                  fx: {},
                  sim: defaultVesselSim(
                    v.equipmentId === "tin"
                      ? { meltFraction: 0, viscosity: 0.7 }
                      : undefined,
                  ),
                }
              : v,
          ),
        }));
      },

      clearDesk: () => {
        labSound.clear();
        set({
          vessels: [],
          activeVesselId: null,
          lastExplanationVesselId: null,
          lastSimTickAt: null,
        });
      },

      setActiveVessel: (id) => set({ activeVesselId: id }),

      mixVessel: (vesselId) => {
        if (!assertLabActionAllowed()) return null;
        const vessel = get().vessels.find((v) => v.instanceId === vesselId);
        if (!vessel) return null;
        const contents = getVesselContents(vessel);
        if (contents.length < 1) {
          showToast(
            vessel.equipmentId === "tin" ? labCopy.emptyCast : labCopy.emptyMix,
          );
          return null;
        }

        const result = resolveMix(vessel);
        if (result.effects.some((e) => e.kind === "hazard" || e.kind === "blast" || e.kind === "flash")) {
          labSound.hazard();
        } else labSound.mix();

        const nextSynced = result.nextContents
          ? syncVesselContents(result.nextContents)
          : null;

        set((s) => ({
          vessels: s.vessels.map((v) =>
            v.instanceId === vesselId
              ? withLivePreview({
                  ...v,
                  ...(nextSynced
                    ? {
                        contents: nextSynced.contents,
                        contentIds: nextSynced.contentIds,
                      }
                    : {}),
                  lastResult: result,
                  stirLevel: Math.max(v.stirLevel, 1),
                  fx: patchFx(v.fx, {
                    mixAt: Date.now(),
                    shakeAt: Date.now(),
                    stirAt: Date.now(),
                    ...(shouldStampCupSet({
                      equipmentId: v.equipmentId,
                      cupSetAt: v.fx.cupSetAt,
                      now: Date.now(),
                    })
                      ? { castRevealAt: Date.now(), cupSetAt: Date.now() }
                      : {}),
                  }),
                  sim: {
                    ...ensureSim(v),
                    mixBlend: Math.max(ensureSim(v).mixBlend, 0.35),
                    stirActive: false,
                    // Continuous mix stays engaged until toggled off
                    ...(ensureSim(v).mixActive
                      ? { mixResolved: true }
                      : { mixActive: false, mixStartedAt: undefined }),
                    ...(v.equipmentId === "tin"
                      ? { meltFraction: Math.min(1, ensureSim(v).meltFraction + 0.15) }
                      : {}),
                  },
                })
              : v,
          ),
          lastExplanationVesselId: vesselId,
          activeVesselId: vesselId,
        }));

        return result;
      },

      shakeVessel: (vesselId) => {
        // Continuous toggle — keeps shaking until toggled off
        get().toggleShakeActive(vesselId);
        return null;
      },

      tickSims: (now = Date.now()) => {
        const vessels = get().vessels;
        if (!vessels.some(simNeedsTick)) {
          set({ lastSimTickAt: now });
          return;
        }
        const last = get().lastSimTickAt;
        const dt = last ? Math.min(2000, now - last) : SIM_FALLBACK_DT;
        const reducedMotion =
          typeof window !== "undefined" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const resolveIds: string[] = [];
        const next = vessels.map((v) => {
          if (!simNeedsTick(v)) return v;
          const result = tickVesselSim(v, dt, now, { reducedMotion });
          if (result.shouldResolveMix) resolveIds.push(v.instanceId);
          let nextV: DeskVessel = {
            ...v,
            sim: result.sim,
            stirLevel: result.stirLevel ?? v.stirLevel,
            fx: result.fxPatch ? patchFx(v.fx, result.fxPatch) : v.fx,
          };
          if (result.contents) {
            nextV = withLivePreview({
              ...nextV,
              ...syncVesselContents(result.contents),
            });
          }
          return nextV;
        });
        set({ vessels: next, lastSimTickAt: now });
        for (const id of resolveIds) {
          const mixed = get().mixVessel(id);
          if (!mixed) {
            set((s) => ({
              vessels: s.vessels.map((v) =>
                v.instanceId === id
                  ? {
                      ...v,
                      sim: {
                        ...ensureSim(v),
                        mixActive: false,
                        mixStartedAt: undefined,
                        mixResolved: false,
                      },
                    }
                  : v,
              ),
            }));
            continue;
          }
          // Keep mixActive visuals after resolve until user toggles off
          set((s) => ({
            vessels: s.vessels.map((v) =>
              v.instanceId === id
                ? {
                    ...v,
                    sim: {
                      ...ensureSim(v),
                      mixResolved: true,
                      mixActive: true,
                      mixStartedAt: ensureSim(v).mixStartedAt ?? now,
                    },
                  }
                : v,
            ),
          }));
        }
      },

      seedDemoReaction: () => {
        if (!assertLabActionAllowed()) return null;
        set({ vessels: [], activeVesselId: null, lastExplanationVesselId: null });
        const id = get().placeEquipment("beaker", { x: 140, y: 90 });
        if (!id) return null;
        get().addChemicalToVessel(id, "hcl", undefined, {
          consumeStock: false,
          bypassGuestLimit: true,
        });
        get().addChemicalToVessel(id, "naoh", undefined, {
          consumeStock: false,
          bypassGuestLimit: true,
        });
        const auth = useAuthStore.getState();
        if (!auth.user) auth.recordGuestChemicalAdd();
        get().stirVessel(id);
        return get().mixVessel(id);
      },

      runPair: (equipmentId: string, a: string, b: string, heat = false) => {
        if (!assertLabActionAllowed()) return null;
        set({ vessels: [], activeVesselId: null, lastExplanationVesselId: null });
        const id = get().placeEquipment(equipmentId, { x: 140, y: 90 });
        if (!id) return null;
        get().addChemicalToVessel(id, a, undefined, {
          consumeStock: false,
          bypassGuestLimit: true,
        });
        get().addChemicalToVessel(id, b, undefined, {
          consumeStock: false,
          bypassGuestLimit: true,
        });
        const auth = useAuthStore.getState();
        if (!auth.user) auth.recordGuestChemicalAdd();
        if (heat) get().attachHeat(id);
        get().stirVessel(id);
        return get().mixVessel(id);
      },

      loadFormula: ({
        equipmentId,
        contentIds,
        contents,
        heatAttached = false,
        coolAttached = false,
        stirLevel = 0,
        autoMix = false,
      }) => {
        if (!assertLabActionAllowed()) return null;
        set({ vessels: [], activeVesselId: null, lastExplanationVesselId: null });
        const id = get().placeEquipment(equipmentId || "beaker", {
          x: 140,
          y: 100,
        });
        if (!id) return null;
        if (contents?.length) {
          for (const c of contents) {
            get().addChemicalToVessel(id, c.chemicalId, c.amountMl, {
              consumeStock: false,
              bypassGuestLimit: true,
            });
          }
        } else {
          for (const chemId of contentIds) {
            get().addChemicalToVessel(id, chemId, undefined, {
              consumeStock: false,
              bypassGuestLimit: true,
            });
          }
        }
        // Count formula hydrate as a single guest action (not one per line).
        const auth = useAuthStore.getState();
        if (!auth.user) auth.recordGuestChemicalAdd();
        if (heatAttached) get().attachHeat(id);
        if (coolAttached) get().attachCool(id);
        const stirTimes = Math.max(0, Math.min(3, stirLevel));
        for (let i = 0; i < stirTimes; i += 1) {
          get().stirVessel(id, false);
        }
        if (autoMix) get().mixVessel(id);
        return id;
      },
    }),
    {
      name: "chemlab-desk",
      version: 3,
      migrate: (persisted) => {
        const state = persisted as {
          vessels?: Array<Partial<DeskVessel> & { contentIds?: string[] }>;
          activeVesselId?: string | null;
          lastExplanationVesselId?: string | null;
        };
        const vessels = (state.vessels ?? []).map((v) => {
          const contents =
            v.contents?.length
              ? v.contents
              : (v.contentIds ?? []).map((chemicalId) => ({
                  chemicalId,
                  amountMl: defaultPourMl(chemicalId),
                }));
          const synced = syncVesselContents(contents);
          const equipmentId = v.equipmentId ?? "beaker";
          const base: DeskVessel = {
            instanceId: v.instanceId ?? uid(),
            equipmentId,
            ...synced,
            heatAttached: Boolean(v.heatAttached),
            coolAttached: Boolean(v.coolAttached),
            stirLevel: v.stirLevel ?? 0,
            lastResult: v.lastResult,
            position: v.position ?? { x: 48, y: 56 },
            fx: {},
            sim: defaultVesselSim(
              v.sim ??
                (equipmentId === "tin"
                  ? { meltFraction: 0, viscosity: 0.7 }
                  : undefined),
            ),
          };
          return withLivePreview(base);
        });
        return {
          vessels,
          activeVesselId: state.activeVesselId ?? null,
          lastExplanationVesselId: state.lastExplanationVesselId ?? null,
          pourAmountMl:
            typeof (state as { pourAmountMl?: unknown }).pourAmountMl ===
            "number"
              ? (state as { pourAmountMl: number }).pourAmountMl
              : 2,
          lastSimTickAt: null,
        } as never;
      },
      partialize: (s) => ({
        vessels: s.vessels.map((v) => ({
          ...v,
          fx: {},
          // drop ephemeral preview size from storage
          livePreview: undefined,
          // persist thermal residue; drop active process flags
          sim: v.sim
            ? {
                ...ensureSim(v),
                stirActive: false,
                shakeActive: false,
                shakeUntil: undefined,
                processStartedAt: undefined,
                stirStartedAt: undefined,
                shakeStartedAt: undefined,
              }
            : defaultVesselSim(),
        })),
        activeVesselId: s.activeVesselId,
        lastExplanationVesselId: s.lastExplanationVesselId,
        pourAmountMl: s.pourAmountMl,
      }),
    },
  ),
);
