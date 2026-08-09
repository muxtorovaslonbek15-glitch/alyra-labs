"use client";

import { useEffect } from "react";
import { useDeskStore } from "@/store/deskStore";
import { SIM_TICK_MS, simNeedsTick } from "@/desk/vesselSim";

/**
 * Keeps heat/cool/stir/shake/mix sim alive while any vessel needs a tick.
 * Mount once under the lab desk shell.
 */
export function DeskSimTicker() {
  const vessels = useDeskStore((s) => s.vessels);
  const tickSims = useDeskStore((s) => s.tickSims);
  const needs = vessels.some(simNeedsTick);

  useEffect(() => {
    if (!needs) return;
    let id = 0;
    let cancelled = false;
    const loop = () => {
      if (cancelled) return;
      tickSims(Date.now());
      id = window.setTimeout(loop, SIM_TICK_MS);
    };
    id = window.setTimeout(loop, SIM_TICK_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [needs, tickSims, vessels.length]);

  return null;
}
