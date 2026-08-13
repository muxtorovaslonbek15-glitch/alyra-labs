"use client";

import { useRef } from "react";
import { MOTION_MS } from "@/animation/motion";
import { usePresence } from "@/animation/usePresence";
import {
  getHouseSku,
  OCCASION_CHIPS,
  type HouseSkuId,
  type OccasionChip,
} from "./houseSkus";
import { SkuChooser } from "./SkuChooser";
import { useWearStore } from "./wearStore";

export function WearDeskOverlay({
  onChip,
  onCompose,
}: {
  onChip: (chip: OccasionChip) => void;
  onCompose: () => void;
}) {
  const skuId = useWearStore((s) => s.skuId);
  const skuChooserNeeded = useWearStore((s) => s.skuChooserNeeded);
  const setSku = useWearStore((s) => s.setSku);
  const openSkuChooser = useWearStore((s) => s.openSkuChooser);
  const occasion = useWearStore((s) => s.occasion);

  const heldSkuId = useRef<HouseSkuId | null>(skuId);
  if (skuId) heldSkuId.current = skuId;
  const sku = getHouseSku(skuChooserNeeded ? heldSkuId.current : skuId);

  const chooser = usePresence(skuChooserNeeded, MOTION_MS.crossfade);
  const ritual = usePresence(!skuChooserNeeded, MOTION_MS.crossfade);

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      {ritual.mounted ? (
        <div
          className={`absolute inset-0 flex flex-col items-center px-3 pt-3 motion-reduce:transition-none md:pt-4 lab-crossfade ${
            ritual.visible ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden={!ritual.visible}
          inert={!ritual.visible}
        >
          <div className="max-w-sm text-center">
            <p className="font-display text-2xl tracking-display text-lab-foam drop-shadow-sm md:text-[1.65rem]">
              {sku.name}
            </p>
            <p className="mt-1 font-display text-[15px] font-normal italic text-lab-foam/80">
              Press. Warm. Wear.
            </p>
            <button
              type="button"
              onClick={openSkuChooser}
              aria-label="Compacts"
              className="pointer-events-auto mt-3 inline-flex min-h-11 items-center rounded-lg border border-white/20 bg-lab-ink/55 px-3 text-xs font-semibold text-lab-foam outline-none hover:bg-white/10 focus-visible:ring-1 focus-visible:ring-lab-line md:min-h-8"
            >
              Compacts
            </button>
          </div>
          <div className="pointer-events-auto mt-auto mb-[max(1rem,env(safe-area-inset-bottom,0px))] flex flex-wrap justify-center gap-1.5 pb-14 pr-[5.75rem] md:mb-6 md:pb-2 md:pr-0">
            {OCCASION_CHIPS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onChip(c.id)}
                aria-pressed={occasion === c.id}
                className={`min-h-11 rounded-lg px-3 text-[11px] font-semibold outline-none focus-visible:ring-1 focus-visible:ring-lab-line md:min-h-8 ${
                  occasion === c.id
                    ? "bg-lab-foam text-lab-ink"
                    : "border border-white/20 bg-lab-ink/55 text-lab-foam hover:bg-white/10"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {chooser.mounted ? (
        <div
          className={`absolute inset-0 flex items-center justify-center px-3 pt-3 motion-reduce:transition-none md:pt-4 lab-crossfade ${
            chooser.visible ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden={!chooser.visible}
          inert={!chooser.visible}
        >
          <div className="pointer-events-auto w-full max-w-lg">
            <SkuChooser onPick={setSku} onCompose={onCompose} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
