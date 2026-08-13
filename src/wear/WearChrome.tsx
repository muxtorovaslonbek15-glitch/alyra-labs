"use client";

import { LabSheet } from "@/desk/LabSheet";
import { RightRailShell } from "@/desk/RightRailShell";
import { useMdUp } from "@/desk/useMdUp";
import { getHouseSku } from "./houseSkus";
import { WearCompanion } from "./WearCompanion";
import { useWearStore } from "./wearStore";

export function WearChrome({
  onAskCompose,
  placement = "all",
}: {
  onAskCompose: () => void;
  /** Split so Wear ↔ Compose can crossfade the rail without hiding the phone FAB. */
  placement?: "all" | "rail" | "phone";
}) {
  const mdUp = useMdUp();
  const showRail = mdUp && placement !== "phone";
  const showPhone = !mdUp && placement !== "rail";
  const sheetOpen = useWearStore((s) => s.sheetOpen);
  const setSheetOpen = useWearStore((s) => s.setSheetOpen);
  const skuId = useWearStore((s) => s.skuId);
  const sku = getHouseSku(skuId);

  const skuChooserNeeded = useWearStore((s) => s.skuChooserNeeded);

  if (showRail) {
    return (
      <RightRailShell dataAttr="wear-companion">
        <WearCompanion onAskCompose={onAskCompose} />
      </RightRailShell>
    );
  }

  if (!showPhone) return null;

  return (
    <>
      {!skuChooserNeeded ? (
      <div className="pointer-events-none absolute inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] z-40 flex justify-end px-3 md:hidden">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="pointer-events-auto flex h-11 min-w-11 items-center justify-center rounded-xl border border-lab-line/70 bg-lab-panel/95 px-3 text-xs font-semibold text-lab-ink shadow-lg backdrop-blur-md outline-none focus-visible:ring-1 focus-visible:ring-lab-line"
          aria-label="Open companion"
        >
          Companion
        </button>
      </div>
      ) : null}
      <LabSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={sku.name}
        eyebrow="Wear"
        labelledBy="wear-sheet-title"
      >
        <div className="flex min-h-[60dvh] flex-1 flex-col overflow-hidden">
          <WearCompanion onAskCompose={onAskCompose} />
        </div>
      </LabSheet>
    </>
  );
}
