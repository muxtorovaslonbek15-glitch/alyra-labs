"use client";

import { useEffect, useState } from "react";
import { MOTION_MS } from "@/animation/motion";
import { usePrefersReducedMotion } from "@/animation/useFxClock";
import { HOUSE_SKUS, type HouseSkuId } from "./houseSkus";

export function SkuChooser({
  onPick,
  onCompose,
}: {
  onPick: (id: Exclude<HouseSkuId, "generic">) => void;
  onCompose: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-lg rounded-2xl border border-white/15 bg-lab-ink/80 px-3.5 py-5 shadow-2xl backdrop-blur-md md:px-5 md:py-5">
      <p className="font-display text-2xl leading-display tracking-display text-lab-foam">
        Which compact?
      </p>
      <p className="mt-1.5 text-xs leading-ui text-lab-foam/65">
        Honor system. Pick the tin you own.
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2 md:gap-2.5">
        {HOUSE_SKUS.map((sku, i) => (
          <SkuTinButton
            key={sku.id}
            name={sku.name}
            number={sku.number}
            photo={sku.photo}
            staggerIndex={i}
            onClick={() => onPick(sku.id)}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={onCompose}
        className="mt-4 min-h-11 w-full text-center text-xs font-medium text-lab-foam/70 underline decoration-white/20 underline-offset-4 outline-none hover:text-lab-foam focus-visible:ring-1 focus-visible:ring-lab-line md:min-h-8"
      >
        Try to make your own Alyra?
      </button>
    </div>
  );
}

function SkuTinButton({
  name,
  number,
  photo,
  staggerIndex,
  onClick,
}: {
  name: string;
  number: string;
  photo: string;
  staggerIndex: number;
  onClick: () => void;
}) {
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(reduced);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    if (reduced) {
      setShown(true);
      return;
    }
    let inner = 0;
    const outer = window.requestAnimationFrame(() => {
      inner = window.requestAnimationFrame(() => setShown(true));
    });
    return () => {
      window.cancelAnimationFrame(outer);
      window.cancelAnimationFrame(inner);
    };
  }, [reduced]);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${number} ${name}`}
      className={`flex min-h-11 flex-col overflow-hidden rounded-lg border border-white/15 bg-lab-desk text-left outline-none transition-[opacity,border-color] ease-out motion-reduce:transition-none hover:border-lab-glass/60 focus-visible:ring-1 focus-visible:ring-lab-line ${
        shown ? "opacity-100" : "opacity-0"
      }`}
      style={{
        transitionDuration: `${MOTION_MS.crossfade}ms`,
        transitionDelay: reduced
          ? "0ms"
          : `${staggerIndex * MOTION_MS.emptyStagger}ms`,
      }}
    >
      {photo && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo}
          alt=""
          className="aspect-[3/4] w-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        <span className="flex aspect-[3/4] w-full items-center justify-center bg-lab-desk font-display text-lg text-lab-glass">
          tin
        </span>
      )}
      <span className="px-1.5 py-2">
        <span className="block text-[10px] font-semibold uppercase tracking-label text-lab-foam/50">
          {number}
        </span>
        <span className="mt-0.5 block font-display text-[13px] leading-display tracking-display text-lab-foam md:text-sm">
          {name}
        </span>
      </span>
    </button>
  );
}
