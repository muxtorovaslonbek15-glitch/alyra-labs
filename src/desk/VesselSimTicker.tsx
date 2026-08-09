"use client";

import { useEffect } from "react";
import { useDeskStore } from "@/store/deskStore";
import { SIM_TICK_MS, simNeedsTick } from "@/desk/vesselSim";
import { usePrefersReducedMotion } from "@/animation/useFxClock";

/**
 * Advances live Heat/Cool/Stir/Shake/evaporation while any vessel needs a tick.
 */
export function VesselSimTicker() {
  const reduced = usePrefersReducedMotion();
  const vessels = useDeskStore((s) => s.vessels);
  const tickSims = useDeskStore((s) => s.tickSims);
  const needs = vessels.some(simNeedsTick);

  useEffect(() => {
    if (!needs) return;
    const ms = reduced ? Math.max(SIM_TICK_MS, 900) : SIM_TICK_MS;
    const id = window.setInterval(() => {
      tickSims(Date.now());
    }, ms);
    tickSims(Date.now());
    return () => window.clearInterval(id);
  }, [needs, reduced, tickSims, vessels.length]);

  return null;
}
