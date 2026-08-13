"use client";

import { useState } from "react";
import { useDeskStore } from "@/store/deskStore";
import { showToast } from "@/gamification/ToastHost";
import {
  tryToggleMixActive,
  tryToggleShakeActive,
  tryToggleStirActive,
} from "@/lab/labActions";
import { labCopy } from "@/lab/labCopy";
import { vesselCardMetrics } from "@/desk/vesselLayout";
import { useMdUp } from "@/desk/useMdUp";
import { ensureSim } from "@/desk/vesselSim";
import { hadSolidSession } from "@/perfumer/solidDetect";
import { planBuildCta, useBuilderStore } from "@/store/builderStore";
import { useBuilderBuildActions } from "@/desk/useBuilderBuildActions";

function toolBtnClass(phone: boolean, extra = "") {
  return `rounded-lg text-[10px] font-semibold whitespace-nowrap transition ${
    phone ? "min-h-11 px-2 py-2" : "min-h-9 px-2.5 py-2 md:min-h-7 md:py-1.5"
  } ${extra}`;
}

/**
 * Place / Process / React / Reset clusters.
 * Desktop: floating rail (DeskWorkspace). Phone: items inside MobileBottomDock.
 */
export function DeskToolButtons({
  layout,
}: {
  layout: "desktop" | "phone";
}) {
  const phone = layout === "phone";
  const vessels = useDeskStore((s) => s.vessels);
  const activeVesselId = useDeskStore((s) => s.activeVesselId);
  const placeEquipment = useDeskStore((s) => s.placeEquipment);
  const toggleHeat = useDeskStore((s) => s.toggleHeat);
  const toggleCool = useDeskStore((s) => s.toggleCool);
  const clearDesk = useDeskStore((s) => s.clearDesk);
  const [confirmClear, setConfirmClear] = useState(false);
  const tinBiasEmpty = hadSolidSession();
  const mdUp = useMdUp();
  const card = vesselCardMetrics(mdUp);
  const builderMode = useBuilderStore((s) => s.mode);
  const plan = useBuilderStore((s) => s.plan);
  const { onBuild } = useBuilderBuildActions();
  const mappedCount = plan?.mappingReport?.mappedCount ?? 0;
  const showDeskBuild =
    !phone &&
    mdUp &&
    planBuildCta(builderMode) === "build" &&
    mappedCount > 0;

  const active =
    vessels.find((v) => v.instanceId === activeVesselId) ?? vessels[0];
  const solidActive = active
    ? active.equipmentId === "tin"
    : tinBiasEmpty;
  const hasVessel = Boolean(active);

  function place(id: "beaker" | "tin") {
    const n = vessels.length;
    placeEquipment(id, {
      x: (mdUp ? 60 : 8) + (n % 3) * (card.width + 6),
      y:
        (mdUp ? 50 : 8) +
        Math.floor(n / 3) * (mdUp ? 200 : card.height + 8),
    });
  }

  const quiet = "bg-white/10 text-lab-foam hover:bg-white/20";
  const pressed =
    "bg-white/25 text-lab-foam shadow-[0_0_0_1px_rgba(255,255,255,0.25)]";

  return (
    <>
      {!phone ? (
        <>
          <span className="hidden px-2 text-[9px] font-semibold uppercase tracking-label text-lab-foam/55 sm:inline">
            Tools
          </span>
          <span
            className="mx-1 hidden h-5 w-px bg-white/15 sm:block"
            aria-hidden
          />
        </>
      ) : null}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => place("beaker")}
          className={toolBtnClass(phone, quiet)}
        >
          + Beaker
        </button>
        <button
          type="button"
          onClick={() => place("tin")}
          className={toolBtnClass(phone, quiet)}
        >
          + Tin
        </button>
      </div>
      <span className="mx-1 h-5 w-px shrink-0 bg-white/15" aria-hidden />
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={!hasVessel}
          onClick={() => {
            if (!active) return;
            tryToggleStirActive(active.instanceId);
          }}
          aria-pressed={Boolean(active && ensureSim(active).stirActive)}
          className={toolBtnClass(
            phone,
            `${
              active && ensureSim(active).stirActive ? pressed : quiet
            } disabled:opacity-40`,
          )}
        >
          Stir
        </button>
        <button
          type="button"
          disabled={!hasVessel}
          onClick={() => {
            if (!active) return;
            toggleHeat(active.instanceId);
          }}
          aria-pressed={Boolean(active?.heatAttached)}
          className={toolBtnClass(
            phone,
            `${
              active?.heatAttached
                ? "bg-lab-amber text-white shadow-[0_0_0_1px_rgba(255,200,120,0.45)]"
                : quiet
            } disabled:opacity-40`,
          )}
        >
          {solidActive ? "Melt" : "Heat"}
        </button>
        <button
          type="button"
          disabled={!hasVessel}
          onClick={() => {
            if (!active) return;
            toggleCool(active.instanceId);
          }}
          aria-pressed={Boolean(active?.coolAttached)}
          className={toolBtnClass(
            phone,
            `${
              active?.coolAttached
                ? "bg-[#0c4a6e] text-[#e0f2fe] shadow-[0_0_0_1px_rgba(125,211,252,0.4)]"
                : quiet
            } disabled:opacity-40`,
          )}
        >
          {solidActive ? "Set" : "Cool"}
        </button>
        {!solidActive ? (
          <button
            type="button"
            disabled={!hasVessel}
            onClick={() => {
              if (!active) return;
              tryToggleShakeActive(active.instanceId);
            }}
            aria-pressed={Boolean(active && ensureSim(active).shakeActive)}
            className={toolBtnClass(
              phone,
              `${
                active && ensureSim(active).shakeActive ? pressed : quiet
              } disabled:opacity-40`,
            )}
          >
            Shake
          </button>
        ) : null}
      </div>
      {showDeskBuild ? (
        <>
          <span className="mx-1 h-5 w-px bg-white/15" aria-hidden />
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onBuild}
              className={`lab-build-cta lab-build-cta-ready ${toolBtnClass(phone, "bg-lab-foam text-lab-ink hover:bg-white")}`}
            >
              Build
            </button>
          </div>
        </>
      ) : null}
      <span className="mx-1 h-5 w-px shrink-0 bg-white/15" aria-hidden />
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={!hasVessel}
          onClick={() => {
            if (!active) return;
            tryToggleMixActive(active.instanceId);
          }}
          aria-pressed={Boolean(active && ensureSim(active).mixActive)}
          className={toolBtnClass(
            phone,
            `${
              active && ensureSim(active).mixActive
                ? "bg-lab-teal text-white shadow-[0_0_0_1px_rgba(255,255,255,0.35)]"
                : "bg-lab-teal text-white hover:bg-lab-teal/90"
            } disabled:opacity-40`,
          )}
        >
          {solidActive ? "Cast" : "Mix"}
        </button>
        <button
          type="button"
          disabled={!hasVessel && !vessels.length}
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
          className={toolBtnClass(
            phone,
            "border border-lab-hazard/40 bg-lab-hazard/25 text-lab-foam hover:bg-lab-hazard/55 disabled:opacity-40",
          )}
        >
          {confirmClear ? "Confirm?" : phone ? "Clear" : "Clear board"}
        </button>
      </div>
    </>
  );
}
