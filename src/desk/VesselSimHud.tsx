"use client";

import type { DeskVessel } from "@/types";
import {
  ensureSim,
  formatSimElapsed,
  phaseLabel,
  primarySimHud,
} from "@/desk/vesselSim";

/** Compact live process readout — always wraps inside the vessel card. */
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
  const extras: string[] = [];
  if (vessel.heatAttached && !solid && sim.temperature >= 0.68) extras.push("evap");
  if (solid && (vessel.heatAttached || sim.meltFraction > 0.05)) {
    extras.push(`melt ${Math.round(sim.meltFraction * 100)}%`);
  }
  if (sim.frost > 0.2 && !vessel.heatAttached) {
    extras.push(`frost ${Math.round(sim.frost * 100)}%`);
  }

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
      className={`pointer-events-none min-w-0 max-w-full overflow-hidden font-mono tracking-wide text-lab-foam ${
        compact
          ? "rounded bg-black/45 px-1 py-0.5 text-[7px] leading-tight md:px-1.5 md:text-[8px]"
          : "rounded-md border border-white/10 bg-black/50 px-2 py-1 text-[9px] shadow-sm"
      }`}
      data-lab-sim-hud
      aria-live="polite"
    >
      <div className="flex min-w-0 items-baseline gap-x-1">
        {action && action !== label ? (
          <span className="min-w-0 truncate text-lab-foam/95">{action}</span>
        ) : null}
        <span className="min-w-0 truncate text-lab-foam/95">{label}</span>
        {elapsedMs > 0 ? (
          <span className="shrink-0 tabular-nums">
            {formatSimElapsed(elapsedMs)}
          </span>
        ) : null}
        <span className="ml-auto shrink-0 tabular-nums">{intensity}%</span>
      </div>
      {extras.length > 0 ? (
        <div className="min-w-0 truncate text-[8px] leading-tight text-lab-foam/75">
          {extras.join(" · ")}
        </div>
      ) : null}
    </div>
  );
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}
