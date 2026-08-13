"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { useDroppable } from "@dnd-kit/core";
import type { DeskVessel } from "@/types";
import { EQUIPMENT_BY_ID } from "@/domains/chemistry/data/equipment";
import { getChemical } from "@/domains/chemistry/data/chemicals";
import { vesselDropId } from "@/drag/types";
import { GlassVessel } from "@/animation/glassware/GlassVessel";
import { SolidTinVessel } from "@/animation/glassware/SolidTinVessel";
import {
  computeFxIntensities,
  pourHomeFactor,
  pourPoseLiftPx,
  pourPoseTiltDeg,
  MIX_WINDOW_MS,
  POUR_WINDOW_MS,
} from "@/animation/fxIntensity";
import { CUP_SET_WINDOW_MS, cupSetFrame } from "@/animation/cupSet";
import { CastMixCue } from "@/animation/VesselEffects";
import { useFxClock, usePrefersReducedMotion } from "@/animation/useFxClock";
import { useDeskStore } from "@/store/deskStore";
import { showToast } from "@/gamification/ToastHost";
import { tryMixVessel } from "@/lab/labActions";
import { labCopy } from "@/lab/labCopy";
import { LAB_EASE } from "@/animation/motion";
import {
  SLOT_MOVE_MS,
  snapAlignPosition,
  stampSlotFrom,
  peekSlotFrom,
  clearSlotFrom,
  slotInvertDelta,
  vesselCardMetrics,
} from "@/desk/vesselLayout";
import { useMdUp } from "@/desk/useMdUp";
import { useWearStore } from "@/wear/wearStore";
import {
  capacityMlForEquipment,
  fillPctFromContents,
  getVesselContents,
  isOverflowing,
  softCapacityMl,
  totalMl,
} from "@/desk/vesselContents";
import { ensureSim } from "@/desk/vesselSim";
import { VesselSimHud } from "@/desk/VesselSimHud";
import { CupSetStage } from "@/animation/cupSet/CupSetStage";
import {
  CardCoolAtmosphere,
  CardHeatAtmosphere,
} from "@/animation/heatSource";

interface Props {
  vessel: DeskVessel;
  deskRef: RefObject<HTMLElement | null>;
}

export function VesselSlot({ vessel, deskRef }: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: vesselDropId(vessel.instanceId),
    data: { type: "vessel", vesselId: vessel.instanceId },
  });

  const activeVesselId = useDeskStore((s) => s.activeVesselId);
  const setActiveVessel = useDeskStore((s) => s.setActiveVessel);
  const clearVessel = useDeskStore((s) => s.clearVessel);
  const removeVessel = useDeskStore((s) => s.removeVessel);
  const toggleStirActive = useDeskStore((s) => s.toggleStirActive);
  const toggleHeat = useDeskStore((s) => s.toggleHeat);
  const toggleCool = useDeskStore((s) => s.toggleCool);
  const removeLastChemical = useDeskStore((s) => s.removeLastChemical);
  const moveVessel = useDeskStore((s) => s.moveVessel);
  const transferVesselContents = useDeskStore((s) => s.transferVesselContents);
  const setChemicalAmount = useDeskStore((s) => s.setChemicalAmount);

  const mdUp = useMdUp();
  const card = vesselCardMetrics(mdUp);
  const isWear = useWearStore((s) => s.audience === "owner");

  const dragOffset = useRef<{ dx: number; dy: number } | null>(null);
  /** Latest drag position — DOM-written during move; committed to store on up. */
  const dragPosRef = useRef<{ x: number; y: number } | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const deskRectRef = useRef<DOMRect | null>(null);
  const [dragging, setDragging] = useState(false);
  const prevPosRef = useRef(vessel.position);
  const [slotNudge, setSlotNudge] = useState({ x: 0, y: 0 });
  const [slotEasing, setSlotEasing] = useState(false);

  const sim = ensureSim(vessel);
  const simAlive =
    vessel.heatAttached ||
    vessel.coolAttached ||
    sim.stirActive ||
    sim.shakeActive ||
    sim.mixActive ||
    sim.agitation > 0.02;
  const now = useFxClock(
    [
      vessel.fx.shakeAt,
      vessel.fx.mixAt,
      vessel.fx.pourAt,
      vessel.fx.transferAt,
      vessel.fx.stirAt,
      vessel.fx.cupSetAt,
      vessel.fx.castRevealAt,
    ],
    Math.max(
      MIX_WINDOW_MS + 200,
      CUP_SET_WINDOW_MS + 200,
      POUR_WINDOW_MS + 200,
    ),
    simAlive,
  );
  const reducedMotion = usePrefersReducedMotion();

  const eq = EQUIPMENT_BY_ID[vessel.equipmentId];
  const isTin = vessel.equipmentId === "tin";
  const isActive = activeVesselId === vessel.instanceId;
  const result = vessel.lastResult;
  const contents = getVesselContents(vessel);
  const empty = contents.length === 0;
  const preview = vessel.livePreview;
  const hazard =
    result?.effects.some(
      (e) =>
        e.kind === "hazard" ||
        e.kind === "blast" ||
        e.kind === "flash" ||
        e.kind === "burst",
    ) || preview?.hazards.some((h) => h.level === "danger");
  const canMix =
    contents.length >= 2 || (contents.length >= 1 && vessel.heatAttached);

  const hasBoilable = contents.some((c) => {
    const chem = getChemical(c.chemicalId);
    return (
      chem?.state === "aqueous" ||
      chem?.state === "liquid" ||
      chem?.id === "h2o" ||
      Boolean(chem?.isFuel)
    );
  });
  const boiling =
    Boolean(vessel.heatAttached && hasBoilable && sim.temperature >= 0.68) ||
    Boolean(preview?.effects.some((e) => e.kind === "boil"));

  const fillColor =
    result?.effects.find((e) => e.kind === "color")?.value ??
    preview?.fillColor ??
    (contents.length
      ? getChemical(contents[contents.length - 1]!.chemicalId)?.color
      : undefined) ??
    "transparent";

  const capacityMl = capacityMlForEquipment(vessel.equipmentId);
  const usedMl = totalMl(contents);
  const overflowing = isOverflowing(contents, capacityMl);
  const fillPct =
    preview?.fillPct ?? fillPctFromContents(contents, vessel.equipmentId);

  const fxEffects = [
    ...(result?.effects ?? []),
    ...(preview?.effects ?? []),
  ];
  // Desk overfill should always spill visually (not only engine "overflow" effects)
  const overflowIntensity =
    overflowing && usedMl / capacityMl > 1.35
      ? ("high" as const)
      : ("medium" as const);
  const withOverflow =
    overflowing && !fxEffects.some((e) => e.kind === "overflow")
      ? [
          ...fxEffects,
          { kind: "overflow" as const, intensity: overflowIntensity },
        ]
      : fxEffects;

  // Merge live FX into a synthetic result for VesselEffects when not yet mixed
  const fxResult =
    result != null
      ? { ...result, effects: withOverflow }
      : withOverflow.length
        ? {
            ok: true,
            products: [],
            effects: withOverflow,
            discoveryId: "live-preview",
          }
        : undefined;
  const intensities = computeFxIntensities({
    fx: vessel.fx,
    effects: withOverflow,
    now,
    heatAttached: vessel.heatAttached,
    coolAttached: vessel.coolAttached,
    boiling,
    simTemperature: sim.temperature,
    simFrost: sim.frost,
    simViscosity: sim.viscosity,
    stirActive: sim.stirActive,
    shakeActive: sim.shakeActive,
    mixActive: sim.mixActive,
    agitation: sim.agitation,
    meltFraction: sim.meltFraction,
  });

  const shaking =
    !isTin &&
    (sim.shakeActive ||
      (Boolean(vessel.fx.shakeAt) &&
        now > 0 &&
        now - (vessel.fx.shakeAt ?? 0) < 700));
  const mixPop = !isTin && intensities.mixBloom > 0.35;
  const cupStarted = Boolean(vessel.fx.cupSetAt) && fillPct > 0;
  const cupFrame = cupStarted
    ? cupSetFrame({
        elapsedMs: now > 0 ? now - (vessel.fx.cupSetAt ?? 0) : 0,
        hasFill: fillPct > 0,
        started: true,
        reducedMotion,
      })
    : null;
  const cupSetBusy =
    cupFrame != null &&
    cupFrame.phase !== "idle" &&
    cupFrame.phase !== "ready";
  const showCastCue =
    isTin &&
    (cupFrame?.phase === "mix_hold" ||
      (!vessel.fx.cupSetAt && intensities.castCue > 0.08));
  const isSource =
    vessel.fx.transferRole === "source" && intensities.pourPhase !== "idle";
  const isTarget =
    vessel.fx.transferRole === "target" && intensities.pourPhase !== "idle";

  // Place / nudge-apart: store already has the free slot; invert then ease transform.
  // Pour pose stays on the inner card so this never steals z-index lift.
  useLayoutEffect(() => {
    if (dragging || isSource) {
      prevPosRef.current = vessel.position;
      clearSlotFrom(vessel.instanceId);
      setSlotEasing(false);
      setSlotNudge({ x: 0, y: 0 });
      return;
    }
    const to = vessel.position;
    const from = peekSlotFrom(vessel.instanceId) ?? prevPosRef.current;
    prevPosRef.current = to;
    const delta = slotInvertDelta(from, to);
    if (
      reducedMotion ||
      (Math.abs(delta.x) < 0.5 && Math.abs(delta.y) < 0.5)
    ) {
      clearSlotFrom(vessel.instanceId);
      setSlotEasing(false);
      setSlotNudge({ x: 0, y: 0 });
      return;
    }
    setSlotEasing(false);
    setSlotNudge(delta);
    let play = 0;
    let settle = 0;
    const invert = requestAnimationFrame(() => {
      play = requestAnimationFrame(() => {
        clearSlotFrom(vessel.instanceId);
        setSlotEasing(true);
        setSlotNudge({ x: 0, y: 0 });
        settle = window.setTimeout(() => setSlotEasing(false), SLOT_MOVE_MS);
      });
    });
    return () => {
      cancelAnimationFrame(invert);
      cancelAnimationFrame(play);
      window.clearTimeout(settle);
    };
  }, [
    vessel.instanceId,
    vessel.position.x,
    vessel.position.y,
    dragging,
    isSource,
    reducedMotion,
  ]);

  const pourIntensity = Math.max(
    intensities.pour,
    intensities.splash,
    vessel.fx.pourAt && intensities.pourPhase !== "idle" ? 0.8 : 0,
  );

  // Card owns pour pose (phase machine); glass tip stays small in GlassVessel.
  const pourCardTilt = isSource
    ? reducedMotion
      ? 0
      : pourPoseTiltDeg(intensities.pourPhase, intensities.pourElapsed)
    : 0;
  const pourLiftPx =
    isSource && !reducedMotion
      ? pourPoseLiftPx(intensities.pourPhase, intensities.pourElapsed)
      : 0;
  const pourHome = vessel.fx.pourHome;
  const homeT =
    isSource && pourHome
      ? reducedMotion
        ? 1
        : pourHomeFactor(intensities.pourPhase, intensities.pourElapsed)
      : 0;
  const homeDx = pourHome ? (pourHome.x - vessel.position.x) * homeT : 0;
  const homeDy = pourHome ? (pourHome.y - vessel.position.y) * homeT : 0;
  const homeCommitted = useRef(false);

  useEffect(() => {
    if (!isSource) {
      homeCommitted.current = false;
      return;
    }
    if (!pourHome || homeCommitted.current) return;
    if (reducedMotion || homeT >= 0.97) {
      homeCommitted.current = true;
      if (
        Math.abs(pourHome.x - vessel.position.x) > 0.5 ||
        Math.abs(pourHome.y - vessel.position.y) > 0.5
      ) {
        moveVessel(vessel.instanceId, pourHome);
      }
    }
  }, [
    isSource,
    reducedMotion,
    homeT,
    pourHome,
    vessel.instanceId,
    vessel.position.x,
    vessel.position.y,
    moveVessel,
  ]);
  const tiltDeg = shaking && !isSource ? Math.sin(now / 40) * 8 : 0;
  const blastKick =
    intensities.blast > 0.4 && !isSource && !isTin && !cupSetBusy
      ? Math.sin(now / 28) * 5 * intensities.blast
      : 0;

  function onMovePointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("button, [data-no-drag]")) return;
    e.stopPropagation();
    setActiveVessel(vessel.instanceId);
    const desk = deskRef.current;
    if (!desk) return;
    const rect = desk.getBoundingClientRect();
    deskRectRef.current = rect;
    dragOffset.current = {
      dx: e.clientX - rect.left - vessel.position.x,
      dy: e.clientY - rect.top - vessel.position.y,
    };
    dragPosRef.current = { ...vessel.position };
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onMovePointerMove(e: React.PointerEvent) {
    if (!dragOffset.current || !dragging) return;
    const rect = deskRectRef.current ?? deskRef.current?.getBoundingClientRect();
    if (!rect) return;
    const next = {
      x: Math.max(8, e.clientX - rect.left - dragOffset.current.dx),
      y: Math.max(8, e.clientY - rect.top - dragOffset.current.dy),
    };
    dragPosRef.current = next;
    // Direct DOM write — avoid Zustand re-render of every vessel / WebGL canvas
    const el = wrapRef.current;
    if (el) {
      el.style.left = `${next.x}px`;
      el.style.top = `${next.y}px`;
    }
  }

  function onMovePointerUp(e: React.PointerEvent) {
    const wasDragging = dragging;
    const dropPos = dragPosRef.current;
    dragOffset.current = null;
    dragPosRef.current = null;
    deskRectRef.current = null;
    setDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    if (!wasDragging || !dropPos) return;

    // Commit once so siblings / store catch up
    moveVessel(vessel.instanceId, dropPos);

    const latest =
      useDeskStore.getState().vessels.find(
        (v) => v.instanceId === vessel.instanceId,
      ) ?? { ...vessel, position: dropPos };
    const latestContents = getVesselContents(latest);
    const positioned = { ...latest, position: dropPos };

    // Vessel→vessel pour: if released overlapping another vessel, transfer
    const others = useDeskStore
      .getState()
      .vessels.filter((v) => v.instanceId !== vessel.instanceId);
    const target = findOverlapTarget(positioned, others, card);
    if (target && latestContents.length > 0) {
      const ok = transferVesselContents(vessel.instanceId, target.instanceId);
      if (ok) {
        showToast(
          labCopy.pouringInto(
            EQUIPMENT_BY_ID[target.equipmentId]?.name ?? "vessel",
          ),
        );
        return;
      }
    }

    // Otherwise snap / align with a nearby card when close enough
    const snapped = snapAlignPosition(
      dropPos,
      others.map((v) => v.position),
      card,
    );
    if (snapped) {
      stampSlotFrom(vessel.instanceId, dropPos, snapped);
      moveVessel(vessel.instanceId, snapped);
    }
  }

  function bindCard(node: HTMLDivElement | null) {
    cardRef.current = node;
    setNodeRef(node);
  }

  const slotSettling = slotNudge.x !== 0 || slotNudge.y !== 0;
  const skipSlotEase = dragging || isSource || reducedMotion || !slotEasing;

  return (
    <div
      ref={wrapRef}
      className="absolute"
      style={{
        left: vessel.position.x,
        top: vessel.position.y,
        width: card.width,
        zIndex: dragging ? 45 : isSource ? 50 : isTarget ? 18 : slotSettling || slotEasing ? 20 : 10,
        transform: `translate3d(${slotNudge.x}px, ${slotNudge.y}px, 0)`,
        transition: skipSlotEase
          ? "none"
          : `transform ${SLOT_MOVE_MS}ms ${LAB_EASE}`,
        willChange: dragging || isSource || slotSettling || slotEasing ? "transform" : undefined,
      }}
    >
    <div
      ref={bindCard}
      role="button"
      tabIndex={0}
      style={{
        width: "100%",
        overflow: isSource || isTarget ? "visible" : undefined,
        transform:
          pourCardTilt || blastKick || pourLiftPx || homeDx || homeDy
            ? `translate(${homeDx}px, ${homeDy - pourLiftPx}px) rotate(${pourCardTilt + blastKick}deg)`
            : undefined,
        transformOrigin: "72% 85%",
        // Pour pose owns this transform. Place/nudge lives on the wrapper.
        transition: dragging || isSource
          ? "none"
          : "transform 0.35s ease-out, box-shadow 0.2s, border-color 0.2s, background-color 0.2s",
        willChange: dragging || isSource ? "transform" : undefined,
      }}
      onPointerDown={onMovePointerDown}
      onPointerMove={onMovePointerMove}
      onPointerUp={onMovePointerUp}
      onPointerCancel={onMovePointerUp}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (isWear) return;
        if (canMix) tryMixVessel(vessel.instanceId);
        else toggleStirActive(vessel.instanceId);
      }}
      onClick={() => setActiveVessel(vessel.instanceId)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          setActiveVessel(vessel.instanceId);
        }
        if (isWear) return;
        if (e.key === "m" || e.key === "M") {
          if (canMix) tryMixVessel(vessel.instanceId);
        }
        if (e.key === "s" || e.key === "S") {
          toggleStirActive(vessel.instanceId);
        }
        if (e.key === "h" || e.key === "H") {
          toggleHeat(vessel.instanceId);
        }
        if (e.key === "c" || e.key === "C") {
          toggleCool(vessel.instanceId);
        }
      }}
      className={`lab-vessel-card group relative w-full overflow-hidden select-none border touch-none outline-none focus-visible:ring-1 focus-visible:ring-lab-line ${
        mdUp ? "rounded-2xl p-2.5" : "rounded-xl p-1.5"
      } ${
        dragging
          ? "cursor-grabbing scale-[1.03] shadow-2xl"
          : "cursor-grab transition-[box-shadow,border-color,background-color] duration-200"
      } ${shaking && !cupSetBusy ? "lab-vessel-shake" : ""} ${
        mixPop ? "lab-vessel-pop" : ""
      } ${isSource ? "lab-vessel-pour-source" : ""} ${
        isTarget && intensities.splash > 0.3 ? "lab-vessel-pour-receive" : ""
      } ${
        isWear
          ? "border-transparent bg-transparent shadow-none"
          : hazard
          ? "border-lab-hazard bg-lab-hazard/10 shadow-[0_0_28px_rgba(180,35,24,0.35)]"
          : isOver
            ? "scale-[1.04] border-lab-teal bg-white/95 shadow-xl"
            : vessel.heatAttached
              ? `border-lab-amber/55 bg-white/80 shadow-md ${
                  isActive ? "ring-2 ring-lab-amber/30" : ""
                }`
              : vessel.coolAttached
                ? `border-[#7dd3fc]/40 bg-white/80 shadow-md ${
                    isActive ? "ring-2 ring-[#7dd3fc]/25" : ""
                  }`
                : isActive
                  ? "border-lab-teal/80 bg-white/90 shadow-lg ring-2 ring-lab-teal/25"
                  : "border-white/35 bg-white/55 shadow-md backdrop-blur-[2px] hover:border-white/70 hover:bg-white/80"
      }`}
    >
      {!isWear ? (
      <div className="relative z-[1] flex items-start justify-between gap-2">
        <div>
          {!empty ? (
            <p className={`${mdUp ? "text-[11px]" : "text-[9px]"} font-semibold tracking-wide text-lab-ink`}>
              {eq?.name ?? "Vessel"}
            </p>
          ) : null}
        </div>
        <div
          className="flex gap-0.5 opacity-80 transition group-hover:opacity-100"
          data-no-drag
        >
          {!empty ? (
            <button
              type="button"
              className="rounded-md px-1.5 py-0.5 text-[10px] text-lab-muted outline-none hover:bg-lab-wash hover:text-lab-ink focus-visible:ring-1 focus-visible:ring-lab-line"
              onClick={(e) => {
                e.stopPropagation();
                clearVessel(vessel.instanceId);
              }}
            >
              Clear
            </button>
          ) : null}
          <button
            type="button"
            aria-label="Remove vessel"
            className="rounded-md px-1.5 py-0.5 text-[10px] text-lab-muted outline-none hover:bg-lab-hazard/15 hover:text-lab-hazard focus-visible:ring-1 focus-visible:ring-lab-line"
            onClick={(e) => {
              e.stopPropagation();
              removeVessel(vessel.instanceId);
            }}
          >
            ✕
          </button>
        </div>
      </div>
      ) : null}

      {!isWear && vessel.heatAttached ? (
        <CardHeatAtmosphere intensity={intensities.heat} />
      ) : null}
      {!isWear && vessel.coolAttached ? (
        <CardCoolAtmosphere frost={sim.frost} />
      ) : null}

      <div data-no-drag className="relative z-[1] mt-1">
        {isTin ? (
          <>
            <CupSetStage
              fillPct={fillPct}
              fillColor={fillColor}
              cupSetAt={vessel.fx.cupSetAt}
              meltFraction={sim.meltFraction}
              heatAttached={vessel.heatAttached}
              viscosity={sim.viscosity}
              pressEnabled={Boolean(vessel.fx.castRevealAt || result)}
              onPress={() => {
                showToast({ title: "Press · Warm · Wear" });
              }}
            >
              <SolidTinVessel
                fillPct={fillPct}
                fillColor={fillColor}
                heatAttached={vessel.heatAttached}
                coolAttached={vessel.coolAttached}
                meltFraction={sim.meltFraction}
                castRevealAt={vessel.fx.castRevealAt}
                pressEnabled={
                  Boolean(vessel.fx.castRevealAt || result) &&
                  !vessel.fx.cupSetAt
                }
                onPress={() => {
                  showToast({ title: "Press · Warm · Wear" });
                }}
              />
            </CupSetStage>
            {showCastCue ? (
              <CastMixCue
                fillColor={
                  fillColor === "transparent" ? undefined : fillColor
                }
                mixAt={vessel.fx.mixAt}
                intensity={intensities.castCue}
                reduced={reducedMotion}
              />
            ) : null}
          </>
        ) : (
          <GlassVessel
            equipmentId={vessel.equipmentId}
            fillPct={fillPct}
            fillColor={fillColor}
            motion={{
              pourIntensity,
              stirLevel: vessel.stirLevel,
              shaking: shaking || intensities.blast > 0.35,
              boiling,
              transferringOut: Boolean(isSource),
              boilIntensity: intensities.boil,
              solidify: intensities.solidify,
              melt: intensities.melt,
            }}
            result={fxResult}
            fx={vessel.fx}
            livePreview={preview}
            layerColors={preview?.layerColors}
            stirLevel={vessel.stirLevel}
            heatAttached={vessel.heatAttached}
            coolAttached={vessel.coolAttached}
            sim={sim}
            pouringCue={isOver}
            tiltDeg={tiltDeg}
            onGlassClick={(e) => {
              e.stopPropagation();
              toggleStirActive(vessel.instanceId);
            }}
          />
        )}
        {!isWear ? (
        <div className="absolute inset-x-1 top-1 z-10 flex min-w-0 flex-col gap-0.5 overflow-hidden">
          <div className="flex min-w-0 items-start justify-between gap-1">
            {usedMl > 0 ? (
              <div
                className={`max-w-[70%] truncate rounded-full px-1.5 py-0.5 font-mono text-[8px] leading-tight ${
                  overflowing
                    ? "bg-lab-hazard/80 text-lab-foam"
                    : "bg-black/35 text-lab-foam"
                }`}
              >
                {isTin
                  ? `${usedMl.toFixed(1)} g*`
                  : `${usedMl.toFixed(1)}/${capacityMl} ml`}
                {overflowing ? " ⚠" : ""}
              </div>
            ) : (
              <span />
            )}
            {vessel.stirLevel > 0 || sim.stirActive ? (
              <div className="shrink-0 truncate rounded-full bg-black/35 px-1.5 py-0.5 text-[8px] leading-tight text-lab-foam">
                {sim.stirActive ? "Stir" : `×${vessel.stirLevel}`}
              </div>
            ) : null}
          </div>
          <VesselSimHud vessel={vessel} compact now={now} />
        </div>
        ) : null}
      </div>

      {!isWear && !empty ? (
      <ul
        className={`relative z-[1] mt-1.5 min-h-0 space-y-1 text-lab-muted ${
          mdUp ? "text-[11px]" : "text-[9px]"
        }`}
        data-no-drag
      >
        {contents.map((entry, idx) => {
            const c = getChemical(entry.chemicalId);
            const isLast = idx === contents.length - 1;
            const othersMl = usedMl - entry.amountMl;
            const maxForThis = Math.max(
              0.1,
              Math.round(
                (softCapacityMl(capacityMl) - Math.max(0, othersMl)) * 10,
              ) / 10,
            );
            const amountPct = Math.min(
              100,
              (entry.amountMl / capacityMl) * 100,
            );
            return (
              <li key={entry.chemicalId} className="space-y-0.5">
                <div className="flex items-center gap-1 truncate">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: c?.color ?? "#888" }}
                  />
                  <span className="min-w-0 flex-1 truncate font-mono text-lab-ink/85">
                    {c?.formula ?? entry.chemicalId}
                    <span className="ml-1 font-sans text-[10px] text-lab-muted">
                      {c?.name}
                    </span>
                  </span>
                  {isLast ? (
                    <button
                      type="button"
                      className="rounded px-1 text-[9px] text-lab-muted hover:bg-lab-wash hover:text-lab-hazard"
                      title="Remove last chemical"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeLastChemical(vessel.instanceId);
                      }}
                    >
                      undo
                    </button>
                  ) : null}
                </div>
                {isActive ? (
                  <div
                    className="space-y-1 pl-3"
                    data-no-drag
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <div className="relative h-1.5 overflow-hidden rounded-full bg-lab-wash">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-lab-teal/80 transition-[width] duration-150"
                        style={{ width: `${amountPct}%` }}
                      />
                      <input
                        type="range"
                        min={0.1}
                        max={maxForThis}
                        step={0.1}
                        value={Math.min(entry.amountMl, maxForThis)}
                        onChange={(e) => {
                          e.stopPropagation();
                          setChemicalAmount(
                            vessel.instanceId,
                            entry.chemicalId,
                            Number(e.target.value),
                          );
                        }}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        aria-label={`Amount of ${c?.name ?? entry.chemicalId}`}
                      />
                    </div>
                    <label className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0.1}
                        max={maxForThis}
                        step={0.1}
                        value={Number(entry.amountMl.toFixed(1))}
                        onChange={(e) => {
                          e.stopPropagation();
                          const raw = Number(e.target.value);
                          if (!Number.isFinite(raw)) return;
                          setChemicalAmount(
                            vessel.instanceId,
                            entry.chemicalId,
                            raw,
                          );
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-12 rounded border border-lab-line/60 bg-white px-1 py-0.5 font-mono text-[10px] text-lab-ink outline-none focus-visible:border-lab-teal focus-visible:ring-1 focus-visible:ring-lab-teal/30"
                        aria-label={`Custom ml for ${c?.name ?? entry.chemicalId}`}
                      />
                      <span className="text-[9px] text-lab-muted">
                        ml · max {maxForThis}
                      </span>
                    </label>
                  </div>
                ) : (
                  <p className="pl-3 font-mono text-[9px] text-lab-muted">
                    {entry.amountMl.toFixed(1)} ml
                  </p>
                )}
              </li>
            );
          })}
      </ul>
      ) : null}

      {!isWear && result?.label ? (
        <p className="equation-pop relative z-[1] mt-1.5 rounded-lg bg-lab-ink px-2 py-1.5 font-mono text-[10px] leading-snug text-lab-foam">
          {result.label}
        </p>
      ) : null}
    </div>
    </div>
  );
}

function findOverlapTarget(
  source: DeskVessel,
  all: DeskVessel[],
  card: { width: number; height: number },
): DeskVessel | null {
  const sx = source.position.x;
  const sy = source.position.y;
  let best: DeskVessel | null = null;
  let bestArea = 0;

  for (const other of all) {
    if (other.instanceId === source.instanceId) continue;
    const ox = other.position.x;
    const oy = other.position.y;
    const overlapW =
      Math.min(sx + card.width, ox + card.width) - Math.max(sx, ox);
    const overlapH =
      Math.min(sy + card.height, oy + card.height) - Math.max(sy, oy);
    if (overlapW <= 0 || overlapH <= 0) continue;
    const area = overlapW * overlapH;
    const minArea = card.width * card.height * 0.28;
    if (area >= minArea && area > bestArea) {
      bestArea = area;
      best = other;
    }
  }
  return best;
}
