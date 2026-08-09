"use client";

import type { DeskVessel } from "@/types";
import {
  ensureSim,
  formatSimElapsed,
  phaseLabel,
  primarySimHud,
} from "@/desk/vesselSim";

/** Compact live process readout on a vessel card or tool rail. */
export function VesselSimHud({
  vessel,
  compact,
  now,
}: {
  vessel: DeskVessel;
  compact?: boolean;
  /** Wall clock from rAF — keeps elapsed live while engaged. */
  now?: number;
}) {
  const wall = now && now > 0 ? now : Date.now();
  const sim = ensureSim(vessel);
  const solid = vessel.equipmentId === "tin";
  const hud = primarySimHud(vessel, wall);
  const active =
    Boolean(hud) ||
    vessel.heatAttached ||
    vessel.coolAttached ||
    sim.stirActive ||
    sim.shakeActive ||
    sim.mixActive ||
    sim.agitation > 0.05 ||
    Math.abs(sim.temperature - 0.5) > 0.03 ||
    sim.frost > 0.05;

  if (!active) return null;

  const elapsedMs = hud?.elapsedMs ?? 0;
  const label = hud?.phase ?? phaseLabel(sim.phaseHint, solid);
  const action = hud?.label;

  const intensity = Math.round(
    clamp01(
      vessel.heatAttached || vessel.coolAttached
        ? Math.abs(sim.temperature - 0.5) * 2
        : sim.mixActive
          ? 0.5 + sim.mixBlend * 0.5
          : sim.stirActive || sim.shakeActive
            ? Math.max(0.35, sim.agitation)
            : Math.max(sim.frost, sim.agitation * 0.5),
    ) * 100,
  );

  return (
    <div
      className={`pointer-events-none font-mono text-[9px] tracking-wide text-lab-foam ${
        compact
          ? "rounded bg-black/45 px-1.5 py-0.5"
          : "rounded-md border border-white/10 bg-black/50 px-2 py-1 shadow-sm"
      }`}
      data-lab-sim-hud
      aria-live="polite"
    >
      {action && action !== label ? (
        <>
          <span className="text-lab-foam/95">{action}</span>
          <span className="mx-1 text-lab-foam/40">·</span>
        </>
      ) : null}
      <span className="text-lab-foam/95">{label}</span>
      {elapsedMs > 0 ? (
        <>
          <span className="mx-1 text-lab-foam/40">·</span>
          <span>{formatSimElapsed(elapsedMs)}</span>
        </>
      ) : null}
      <span className="mx-1 text-lab-foam/40">·</span>
      <span>{intensity}%</span>
      {vessel.heatAttached && !solid && sim.temperature >= 0.68 ? (
        <span className="ml-1 text-lab-amber/90">evap</span>
      ) : null}
      {solid && (vessel.heatAttached || sim.meltFraction > 0.05) ? (
        <span className="ml-1 text-lab-amber/90">
          melt {Math.round(sim.meltFraction * 100)}%
        </span>
      ) : null}
      {sim.frost > 0.2 && !vessel.heatAttached ? (
        <span className="ml-1 text-[#7dd3fc]/90">
          frost {Math.round(sim.frost * 100)}%
        </span>
      ) : null}
    </div>
  );
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}
