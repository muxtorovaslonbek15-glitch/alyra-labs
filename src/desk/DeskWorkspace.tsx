"use client";

import { useRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import { DESK_SURFACE } from "@/drag/types";
import { useDeskStore } from "@/store/deskStore";
import { VesselSlot } from "./VesselSlot";
import { PourStream, pourSurfaceLocalY } from "@/animation/PourStream";
import { resolveGlassShape } from "@/animation/glassware/shapes";
import {
  computeFxIntensities,
  deskMotionClass,
  POUR_WINDOW_MS,
  pourHomeFactor,
  pourPoseLiftPx,
  pourPoseTiltDeg,
  transferDisplayFillPct,
} from "@/animation/fxIntensity";
import { useFxClock, usePrefersReducedMotion } from "@/animation/useFxClock";
import { getChemical } from "@/domains/chemistry/data/chemicals";
import { trySeedDemoReaction } from "@/lab/labActions";
import {
  LAB_GLASS_FALLBACK,
  vesselCardMetrics,
  wearOnlyTins,
} from "@/desk/vesselLayout";
import { useMdUp } from "@/desk/useMdUp";
import { DeskToolButtons } from "@/desk/DeskToolButtons";
import { useWearStore } from "@/wear/wearStore";
import {
  fillPctFromContents,
  getVesselContents,
} from "@/desk/vesselContents";
import { hadSolidSession } from "@/perfumer/solidDetect";
import { ensureSim } from "@/desk/vesselSim";
import { planBuildCta, useBuilderStore } from "@/store/builderStore";
import { useBuilderBuildActions } from "@/desk/useBuilderBuildActions";

export function DeskWorkspace({
  onOpenAtelier,
  flushBottom = false,
  hideTools = false,
}: {
  onOpenAtelier?: () => void;
  /** When chat is bottom-docked: square bottom edge flush to panel */
  flushBottom?: boolean;
  /** Wear chrome: tin is hero; Place / Process / React stay composer-only. */
  hideTools?: boolean;
} = {}) {
  const storedVessels = useDeskStore((s) => s.vessels);
  const skuChooserNeeded = useWearStore((s) => s.skuChooserNeeded);
  const vessels = hideTools
    ? skuChooserNeeded
      ? []
      : wearOnlyTins(storedVessels)
    : storedVessels;
  const deskRef = useRef<HTMLElement | null>(null);
  const tinBiasEmpty = hadSolidSession();
  const mdUp = useMdUp();
  const card = vesselCardMetrics(mdUp);
  const builderMode = useBuilderStore((s) => s.mode);
  const plan = useBuilderStore((s) => s.plan);
  const { onBuild } = useBuilderBuildActions();
  const mappedCount = plan?.mappingReport?.mappedCount ?? 0;
  const showDeskBuild =
    !hideTools &&
    mdUp &&
    planBuildCta(builderMode) === "build" &&
    mappedCount > 0;

  const { setNodeRef, isOver } = useDroppable({
    id: DESK_SURFACE,
    data: { type: "desk" },
  });

  function bindDesk(node: HTMLElement | null) {
    deskRef.current = node;
    setNodeRef(node);
  }

  const reducedMotion = usePrefersReducedMotion();

  const simAlive = vessels.some(
    (v) =>
      v.heatAttached ||
      v.coolAttached ||
      v.sim?.stirActive ||
      v.sim?.shakeActive ||
      v.sim?.mixActive ||
      (v.sim?.agitation ?? 0) > 0.02,
  );
  const now = useFxClock(
    vessels.flatMap((v) => [
      v.fx.transferAt,
      v.fx.pourAt,
      v.fx.mixAt,
      v.fx.shakeAt,
      v.fx.stirAt,
    ]),
    Math.max(2400, POUR_WINDOW_MS + 400),
    simAlive,
  );

  const vesselIntensities = vessels.map((v) => {
    const sim = ensureSim(v);
    return computeFxIntensities({
      fx: v.fx,
      effects: [
        ...(v.lastResult?.effects ?? []),
        ...(v.livePreview?.effects ?? []),
      ],
      now,
      heatAttached: v.heatAttached,
      coolAttached: v.coolAttached,
      boiling: Boolean(
        (v.heatAttached && sim.temperature >= 0.72) ||
          v.livePreview?.effects.some((e) => e.kind === "boil") ||
          v.lastResult?.effects.some((e) => e.kind === "boil"),
      ),
      simTemperature: sim.temperature,
      simFrost: sim.frost,
      simViscosity: sim.viscosity,
      stirActive: sim.stirActive,
      shakeActive: sim.shakeActive,
      mixActive: sim.mixActive,
      agitation: sim.agitation,
      meltFraction: sim.meltFraction,
    });
  });
  const deskMotion = deskMotionClass(vesselIntensities);

  const transferSource = vessels.find((v, i) => {
    const inten = vesselIntensities[i];
    return (
      v.fx.transferRole === "source" &&
      inten != null &&
      inten.pourPhase !== "idle"
    );
  });
  const transferSourceIdx = transferSource
    ? vessels.findIndex((v) => v.instanceId === transferSource.instanceId)
    : -1;
  const sourceInten =
    transferSourceIdx >= 0 ? vesselIntensities[transferSourceIdx] : undefined;

  const transferTarget = transferSource?.fx.transferToId
    ? vessels.find((v) => v.instanceId === transferSource.fx.transferToId)
    : undefined;

  const pourLive =
    sourceInten?.pourPhase === "stream" || sourceInten?.pourPhase === "settle";

  const streamProps =
    transferSource &&
    transferTarget &&
    transferSource.fx.transferAt &&
    pourLive
      ? (() => {
          const fromGeo = resolveGlassShape(transferSource.equipmentId);
          const toGeo = resolveGlassShape(transferTarget.equipmentId);
          const scaleX = (card.width - card.glassInsetX * 2) / 100;
          const scaleY = card.glassH / 140;
          const poseTilt = reducedMotion
            ? 0
            : pourPoseTiltDeg(
                sourceInten!.pourPhase,
                sourceInten!.pourElapsed,
              );
          const liftPx = reducedMotion
            ? 0
            : pourPoseLiftPx(
                sourceInten!.pourPhase,
                sourceInten!.pourElapsed,
              );
          const homeT = reducedMotion
            ? 1
            : pourHomeFactor(
                sourceInten!.pourPhase,
                sourceInten!.pourElapsed,
              );
          const home = transferSource.fx.pourHome;
          const homeDx = home
            ? (home.x - transferSource.position.x) * homeT
            : 0;
          const homeDy = home
            ? (home.y - transferSource.position.y) * homeT
            : 0;
          const lipDesk = (
            v: typeof transferSource,
            geo: typeof fromGeo,
            tiltDeg = 0,
          ) => {
            const localX = card.glassInsetX + geo.lip.x * scaleX;
            const localY = card.glassTop + geo.lip.y * scaleY;
            // Match card pour pose origin (72% 85%)
            const ox = card.width * 0.72;
            const oy = card.height * 0.85;
            const rad = (tiltDeg * Math.PI) / 180;
            const dx = localX - ox;
            const dy = localY - oy;
            const rx = dx * Math.cos(rad) - dy * Math.sin(rad);
            const ry = dx * Math.sin(rad) + dy * Math.cos(rad);
            return {
              x: v.position.x + ox + rx + homeDx,
              y: v.position.y + oy + ry + homeDy - liftPx,
            };
          };
          const targetFill = transferDisplayFillPct({
            role: "target",
            phase: sourceInten!.pourPhase,
            elapsed: sourceInten!.pourElapsed,
            storeFillPct:
              transferTarget.livePreview?.fillPct ??
              fillPctFromContents(
                getVesselContents(transferTarget),
                transferTarget.equipmentId,
              ),
            targetFillPct: transferTarget.fx.targetFillPct,
          });
          const surfaceLocalY = pourSurfaceLocalY(
            targetFill,
            toGeo.wellBounds,
          );
          const to = {
            x:
              transferTarget.position.x +
              card.glassInsetX +
              toGeo.mouth.x * scaleX,
            y:
              transferTarget.position.y +
              card.glassTop +
              surfaceLocalY * scaleY,
          };
          const from = lipDesk(transferSource, fromGeo, poseTilt);
          const color =
            transferSource.fx.pourColor ??
            transferTarget.fx.pourColor ??
            (transferTarget.contentIds.length
              ? getChemical(
                  transferTarget.contentIds[
                    transferTarget.contentIds.length - 1
                  ]!,
                )?.color
              : undefined) ??
            LAB_GLASS_FALLBACK;
          const layerColors =
            transferSource.livePreview?.layerColors ??
            transferTarget.livePreview?.layerColors;
          const targetIdx = vessels.findIndex(
            (v) => v.instanceId === transferTarget.instanceId,
          );
          const targetSplash =
            targetIdx >= 0 ? (vesselIntensities[targetIdx]?.splash ?? 0) : 0;
          return {
            from,
            to,
            color,
            layerColors,
            activeKey: transferSource.fx.transferAt,
            viscosity: ensureSim(transferSource).viscosity,
            splash: Math.max(sourceInten!.splash, targetSplash),
            phase: sourceInten!.pourPhase,
            streaming: sourceInten!.pourPhase === "stream",
          };
        })()
      : null;

  return (
    <section
      ref={bindDesk}
      data-lab-desk
      className={`relative h-full min-h-0 flex-1 overflow-hidden rounded-none ${
        flushBottom
          ? "md:rounded-t-[1.25rem] md:rounded-b-none"
          : "md:rounded-[1.25rem]"
      } ${
        isOver ? "ring-2 ring-lab-teal ring-offset-2 ring-offset-lab-wash" : ""
      }`}
    >
      <div
        className={`lab-desk-surface absolute inset-0 ${deskMotion}`}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/15 to-transparent" />
          <div className="pointer-events-none absolute inset-0 lab-desk-sheen" />

      {streamProps ? (
        <div className="pointer-events-none absolute inset-0 z-[25] overflow-visible">
          <PourStream
            from={streamProps.from}
            to={streamProps.to}
            color={streamProps.color}
            layerColors={streamProps.layerColors}
            activeKey={streamProps.activeKey}
            streaming={streamProps.streaming}
            viscosity={streamProps.viscosity}
            splash={streamProps.splash}
            phase={streamProps.phase}
          />
        </div>
      ) : null}

      {vessels.length > 0 && !hideTools ? (
        <div className="absolute bottom-2 left-1/2 z-40 hidden w-auto -translate-x-1/2 flex-wrap items-center justify-center gap-y-1.5 overflow-visible rounded-xl border border-white/20 bg-lab-ink/90 px-2 py-1.5 shadow-2xl backdrop-blur-md md:flex">
          <DeskToolButtons layout="desktop" />
        </div>
      ) : null}

      <div className="relative z-10 h-full min-h-0 w-full overflow-visible md:min-h-[22rem]">
        {vessels.length === 0 && !(hideTools && skuChooserNeeded) ? (
          <div className="lab-empty-desk absolute inset-0 flex items-center justify-center p-3">
            <div className="lab-empty-desk-inner max-w-md px-3 text-center">
              {hideTools ? (
                <>
                  <p className="lab-empty-desk-item font-display text-2xl tracking-display text-lab-foam">
                    Your compact
                  </p>
                  <p className="lab-empty-desk-item mt-1.5 text-xs leading-snug text-lab-foam/75">
                    Press. Warm. Wear.
                  </p>
                </>
              ) : (
                <>
              <p className="lab-empty-desk-item font-display text-2xl tracking-display text-lab-foam">
                Compose a signature
              </p>
              <p className="lab-empty-desk-item mt-1.5 text-xs leading-snug text-lab-foam/75 md:hidden">
                {tinBiasEmpty
                  ? "Place a tin. Melt the chassis. Blend notes. Cast the balm."
                  : "Place a beaker or tin. Pour notes. Mix, or cast a balm."}
              </p>
              <p className="lab-empty-desk-item mt-1.5 hidden text-xs leading-snug text-lab-foam/70 md:block">
                {tinBiasEmpty
                  ? "Fine perfume, in solid form. Press, warm, wear. Chat plans; Build casts here."
                  : "Desk is the canvas. Chat plans; Build pours or casts here."}
              </p>
              <dl className="lab-empty-cheat mt-6 hidden space-y-2.5 text-left md:block">
                {(
                  [
                    ["Open Chat", "Header → Chat"],
                    ["Chat history", "◷ in chat → center"],
                    ["Toggle inventory", "⌘B"],
                    ["Toggle chat", "⌘T"],
                    ["Dock chat", "⋮⋮ drag · double-click"],
                    ["Build", "Lock plan → Build"],
                    ["Guide", "⋯ → How it works"],
                  ] as const
                ).map(([label, hint], i) => (
                  <div
                    key={label}
                    className="lab-empty-desk-item flex items-baseline justify-between gap-6"
                    style={{ ["--lab-empty-i" as string]: String(i) }}
                  >
                    <dt className="text-[13px] font-medium text-lab-foam/90">
                      {label}
                    </dt>
                    <dd className="font-mono text-[12px] tracking-wide text-lab-foam/45">
                      {hint}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="lab-empty-desk-item mt-5 flex flex-col items-stretch gap-2">
                {showDeskBuild ? (
                  <button
                    type="button"
                    onClick={onBuild}
                    className="lab-build-cta lab-build-cta-ready rounded-lg bg-lab-foam px-3 py-1.5 text-xs font-semibold text-lab-ink shadow-lg transition hover:bg-white active:scale-[0.98]"
                  >
                    Build
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => trySeedDemoReaction()}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold shadow-lg transition active:scale-[0.98] ${
                    showDeskBuild
                      ? "border border-lab-foam/35 bg-transparent text-lab-foam hover:bg-white/10"
                      : "bg-lab-foam text-lab-ink hover:bg-white"
                  }`}
                >
                  Try starter: HCl + NaOH
                </button>
                {onOpenAtelier ? (
                  <button
                    type="button"
                    onClick={onOpenAtelier}
                    className="rounded-lg border border-lab-foam/35 bg-transparent px-3 py-1.5 text-xs font-semibold text-lab-foam transition hover:bg-white/10 active:scale-[0.98]"
                  >
                    Browse Perfume Atelier
                  </button>
                ) : null}
              </div>
                </>
              )}
            </div>
          </div>
        ) : (
          vessels.map((v) => (
            <VesselSlot key={v.instanceId} vessel={v} deskRef={deskRef} />
          ))
        )}
      </div>
    </section>
  );
}
