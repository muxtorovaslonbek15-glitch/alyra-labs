"use client";

import { useRef, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { DESK_SURFACE } from "@/drag/types";
import { useDeskStore } from "@/store/deskStore";
import { VesselSlot } from "./VesselSlot";
import { showToast } from "@/gamification/ToastHost";
import { PourStream } from "@/animation/PourStream";
import { resolveGlassShape } from "@/animation/glassware/shapes";
import {
  computeFxIntensities,
  deskMotionClass,
  POUR_WINDOW_MS,
  pourPoseTiltDeg,
} from "@/animation/fxIntensity";
import { useFxClock } from "@/animation/useFxClock";
import { getChemical } from "@/domains/chemistry/data/chemicals";
import {
  tryMixVessel,
  trySeedDemoReaction,
  tryShakeVessel,
} from "@/lab/labActions";
import { labCopy } from "@/lab/labCopy";
import { LAB_GLASS_FALLBACK, VESSEL_CARD } from "@/desk/vesselLayout";

export function DeskWorkspace({
  onOpenAtelier,
  flushBottom = false,
}: {
  onOpenAtelier?: () => void;
  /** When chat is bottom-docked: square bottom edge flush to panel */
  flushBottom?: boolean;
} = {}) {
  const vessels = useDeskStore((s) => s.vessels);
  const activeVesselId = useDeskStore((s) => s.activeVesselId);
  const placeEquipment = useDeskStore((s) => s.placeEquipment);
  const stirVessel = useDeskStore((s) => s.stirVessel);
  const toggleHeat = useDeskStore((s) => s.toggleHeat);
  const toggleCool = useDeskStore((s) => s.toggleCool);
  const clearDesk = useDeskStore((s) => s.clearDesk);
  const deskRef = useRef<HTMLElement | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const { setNodeRef, isOver } = useDroppable({
    id: DESK_SURFACE,
    data: { type: "desk" },
  });

  function bindDesk(node: HTMLElement | null) {
    deskRef.current = node;
    setNodeRef(node);
  }

  const active = vessels.find((v) => v.instanceId === activeVesselId) ?? vessels[0];

  const now = useFxClock(
    vessels.flatMap((v) => [
      v.fx.transferAt,
      v.fx.pourAt,
      v.fx.mixAt,
      v.fx.shakeAt,
    ]),
    Math.max(2400, POUR_WINDOW_MS + 400),
  );

  const vesselIntensities = vessels.map((v) =>
    computeFxIntensities({
      fx: v.fx,
      effects: [
        ...(v.lastResult?.effects ?? []),
        ...(v.livePreview?.effects ?? []),
      ],
      now,
      heatAttached: v.heatAttached,
      coolAttached: v.coolAttached,
      boiling: Boolean(
        v.heatAttached ||
          v.livePreview?.effects.some((e) => e.kind === "boil") ||
          v.lastResult?.effects.some((e) => e.kind === "boil"),
      ),
    }),
  );
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

  const streaming = sourceInten?.pourPhase === "stream";

  const streamProps =
    transferSource &&
    transferTarget &&
    transferSource.fx.transferAt &&
    streaming
      ? (() => {
          const fromGeo = resolveGlassShape(transferSource.equipmentId);
          const toGeo = resolveGlassShape(transferTarget.equipmentId);
          const scaleX =
            (VESSEL_CARD.width - VESSEL_CARD.glassInsetX * 2) / 100;
          const scaleY = VESSEL_CARD.glassH / 140;
          const poseTilt = pourPoseTiltDeg(
            sourceInten!.pourPhase,
            sourceInten!.pourElapsed,
          );
          const lipDesk = (
            v: typeof transferSource,
            geo: typeof fromGeo,
            tiltDeg = 0,
          ) => {
            const localX =
              VESSEL_CARD.glassInsetX + geo.lip.x * scaleX;
            const localY = VESSEL_CARD.glassTop + geo.lip.y * scaleY;
            // Match card pour pose origin (72% 85%)
            const ox = VESSEL_CARD.width * 0.72;
            const oy = VESSEL_CARD.height * 0.85;
            const rad = (tiltDeg * Math.PI) / 180;
            const dx = localX - ox;
            const dy = localY - oy;
            const rx = dx * Math.cos(rad) - dy * Math.sin(rad);
            const ry = dx * Math.sin(rad) + dy * Math.cos(rad);
            return {
              x: v.position.x + ox + rx,
              y: v.position.y + oy + ry,
            };
          };
          const mouthDesk = (
            v: typeof transferTarget,
            geo: typeof toGeo,
          ) => ({
            x: v.position.x + VESSEL_CARD.glassInsetX + geo.mouth.x * scaleX,
            y:
              v.position.y +
              VESSEL_CARD.glassTop +
              geo.mouth.y * scaleY +
              8,
          });
          // Use stamped pourFrom (lip at transfer start), then apply pose tilt
          const from = transferSource.fx.pourFrom
            ? (() => {
                const ox =
                  transferSource.position.x + VESSEL_CARD.width * 0.72;
                const oy =
                  transferSource.position.y + VESSEL_CARD.height * 0.85;
                const rad = (poseTilt * Math.PI) / 180;
                const dx = transferSource.fx.pourFrom.x - ox;
                const dy = transferSource.fx.pourFrom.y - oy;
                return {
                  x: ox + dx * Math.cos(rad) - dy * Math.sin(rad),
                  y: oy + dx * Math.sin(rad) + dy * Math.cos(rad),
                };
              })()
            : lipDesk(transferSource, fromGeo, poseTilt);
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
          return {
            from,
            to: mouthDesk(transferTarget, toGeo),
            color,
            layerColors,
            activeKey: transferSource.fx.transferAt,
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
        <div className="pointer-events-none absolute inset-0 z-20">
          <PourStream
            from={streamProps.from}
            to={streamProps.to}
            color={streamProps.color}
            layerColors={streamProps.layerColors}
            activeKey={streamProps.activeKey}
            streaming
          />
        </div>
      ) : null}

      {vessels.length > 0 ? (
        <div className="absolute bottom-[max(0.5rem,env(safe-area-inset-bottom,0px))] left-1/2 z-40 flex w-[calc(100%-1rem)] max-w-[calc(100%-5.5rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-y-1.5 rounded-xl border border-white/20 bg-lab-ink/90 px-2 py-1.5 pb-[max(0.4rem,env(safe-area-inset-bottom,0px))] shadow-2xl backdrop-blur-md md:bottom-2 md:w-auto md:max-w-none md:pb-1.5">
          <span className="hidden px-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-lab-foam/55 sm:inline">
            Tools
          </span>
          <span
            className="mx-1 hidden h-5 w-px bg-white/15 sm:block"
            aria-hidden
          />
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                const n = vessels.length;
                placeEquipment("beaker", {
                  x: 60 + (n % 3) * (VESSEL_CARD.width + 6),
                  y: 50 + Math.floor(n / 3) * 200,
                });
              }}
              className="min-h-9 rounded-lg bg-white/10 px-2.5 py-2 text-[10px] font-semibold text-lab-foam transition hover:bg-white/20 md:min-h-7 md:py-1.5"
            >
              + Beaker
            </button>
          </div>
          <span className="mx-1 h-5 w-px bg-white/15" aria-hidden />
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                if (!active) return;
                stirVessel(active.instanceId);
                showToast(labCopy.stirring);
              }}
              className="min-h-9 rounded-lg bg-white/10 px-2.5 py-2 text-[10px] font-semibold text-lab-foam transition hover:bg-white/20 md:min-h-7 md:py-1.5"
            >
              Stir
            </button>
            <button
              type="button"
              onClick={() => {
                if (!active) return;
                toggleHeat(active.instanceId);
              }}
              aria-pressed={Boolean(active?.heatAttached)}
              className={`min-h-9 rounded-lg px-2.5 py-2 text-[10px] font-semibold transition md:min-h-7 md:py-1.5 ${
                active?.heatAttached
                  ? "bg-lab-amber text-white shadow-[0_0_0_1px_rgba(255,200,120,0.45)]"
                  : "bg-white/10 text-lab-foam hover:bg-white/20"
              }`}
            >
              Heat
            </button>
            <button
              type="button"
              onClick={() => {
                if (!active) return;
                toggleCool(active.instanceId);
              }}
              aria-pressed={Boolean(active?.coolAttached)}
              className={`min-h-9 rounded-lg px-2.5 py-2 text-[10px] font-semibold transition md:min-h-7 md:py-1.5 ${
                active?.coolAttached
                  ? "bg-[#0c4a6e] text-[#e0f2fe] shadow-[0_0_0_1px_rgba(125,211,252,0.4)]"
                  : "bg-white/10 text-lab-foam hover:bg-white/20"
              }`}
            >
              Cool
            </button>
            <button
              type="button"
              onClick={() => {
                if (!active) return;
                tryShakeVessel(active.instanceId);
              }}
              className="min-h-9 rounded-lg bg-white/10 px-2.5 py-2 text-[10px] font-semibold text-lab-foam transition hover:bg-white/20 md:min-h-7 md:py-1.5"
            >
              Shake
            </button>
          </div>
          <span className="mx-1 h-5 w-px bg-white/15" aria-hidden />
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                if (!active) return;
                tryMixVessel(active.instanceId);
              }}
              className="min-h-9 rounded-lg bg-lab-teal px-2.5 py-2 text-[10px] font-semibold text-white transition hover:bg-lab-teal/90 md:min-h-7 md:py-1.5"
            >
              Mix
            </button>
            <button
              type="button"
              onClick={() => {
                if (!confirmClear) {
                  setConfirmClear(true);
                  window.setTimeout(() => setConfirmClear(false), 2500);
                  return;
                }
                clearDesk();
                setConfirmClear(false);
                showToast(labCopy.deskCleared);
              }}
              className="min-h-9 rounded-lg border border-lab-hazard/40 bg-lab-hazard/25 px-2.5 py-2 text-[10px] font-semibold text-lab-foam transition hover:bg-lab-hazard/55 md:min-h-7 md:py-1.5"
            >
              {confirmClear ? "Confirm clear?" : "Clear board"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="relative z-10 h-full min-h-0 w-full md:min-h-[22rem]">
        {vessels.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center p-3">
            <div className="max-w-md px-3 text-center">
              <p className="font-display text-2xl tracking-tight text-lab-foam">
                Compose a signature
              </p>
              <p className="mt-1.5 text-xs leading-snug text-lab-foam/75 md:hidden">
                Place a beaker. Pour notes. Mix. Nothing else in the way.
              </p>
              <p className="mt-1.5 hidden text-xs leading-snug text-lab-foam/70 md:block">
                Desk is the canvas. Chat plans; Build pours here.
              </p>
              <dl className="mt-6 hidden space-y-2.5 text-left md:block">
                {(
                  [
                    ["Open Chat", "Header → Chat"],
                    ["Chat history", "◷ in chat → center"],
                    ["Toggle inventory", "⌘B"],
                    ["Toggle chat", "⌘T"],
                    ["Dock chat", "⋮⋮ drag · double-click"],
                    ["Build", "Plan ready → Build"],
                    ["Guide", "⋯ → How it works"],
                  ] as const
                ).map(([label, hint]) => (
                  <div
                    key={label}
                    className="flex items-baseline justify-between gap-6"
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
              <div className="mt-5 flex flex-col items-stretch gap-2">
                <button
                  type="button"
                  onClick={() => trySeedDemoReaction()}
                  className="rounded-lg bg-lab-foam px-3 py-1.5 text-xs font-semibold text-lab-ink shadow-lg transition hover:bg-white active:scale-[0.98]"
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
