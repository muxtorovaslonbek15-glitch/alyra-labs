"use client";

import { useState } from "react";
import type { LabBridgeFormula, StructuredPayload } from "./types";

export function PlanPanel({
  bridge,
  structured,
  mode,
  buildStepIndex,
  buildTotal,
  onBuild,
  onStop,
  onUndo,
  onInstant,
  compact,
}: {
  bridge: LabBridgeFormula | null;
  structured?: StructuredPayload | null;
  mode: "idle" | "planning" | "plan_ready" | "building" | "built" | "stopped";
  buildStepIndex?: number;
  buildTotal?: number;
  onBuild: () => void;
  onStop?: () => void;
  onUndo?: () => void;
  /** Power-user: bulk loadFormula (instant) */
  onInstant?: () => void;
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  // Empty plan: stay invisible — don't dominate the chat rail.
  if (!bridge?.lines?.length) {
    return null;
  }

  const mapped = bridge.mappingReport?.mappedCount ?? 0;
  const unmapped = bridge.mappingReport?.unmappedCount ?? 0;
  const costInr =
    bridge.costInr?.totalCostInr ??
    structured?.cost?.totalCostInr ??
    structured?.formula?.cost?.totalCostInr;
  const india =
    bridge.indiaContext?.climateNote ||
    structured?.indiaContext?.wearAdvice ||
    structured?.indiaContext?.occasion;
  const building = mode === "building";
  const canBuild =
    mode === "plan_ready" || mode === "stopped" || mode === "built";
  const canUndo = (mode === "built" || mode === "stopped") && Boolean(onUndo);
  const stepLabel =
    building && buildTotal != null && buildStepIndex != null
      ? `${Math.min(buildStepIndex + 1, buildTotal)}/${buildTotal}`
      : null;

  return (
    <div
      className={`shrink-0 border-t border-lab-line/50 bg-lab-panel ${
        compact ? "px-3 py-2.5" : "px-3 py-2.5"
      }`}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="min-w-0 flex-1 text-left"
          aria-expanded={expanded}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-lab-muted">
            Plan{stepLabel ? ` · ${stepLabel}` : ""}
          </p>
          <p className="mt-0.5 truncate text-sm font-medium text-lab-ink">
            {bridge.title}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-lab-muted">
            {bridge.lines.length} lines · {mapped} mapped
            {unmapped > 0 ? ` · ${unmapped} missing` : ""}
            {costInr != null
              ? ` · ₹${Math.round(costInr).toLocaleString("en-IN")}`
              : ""}
          </p>
        </button>
        <div className="flex shrink-0 items-center gap-1.5">
          {building ? (
            <button
              type="button"
              onClick={onStop}
              className="min-h-9 rounded-md border border-lab-hazard/40 bg-lab-hazard/10 px-3 text-xs font-semibold text-lab-hazard hover:bg-lab-hazard/15"
            >
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={onBuild}
              disabled={!canBuild || mapped === 0}
              className="min-h-9 rounded-md bg-lab-ink px-3.5 text-xs font-semibold text-lab-foam transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
            >
              Build
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="min-h-9 min-w-9 rounded-md text-lab-muted hover:bg-lab-wash hover:text-lab-ink"
            aria-label={expanded ? "Collapse plan" : "Expand plan"}
          >
            {expanded ? "▾" : "▸"}
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="mt-3 space-y-3 border-t border-lab-line/40 pt-3">
          <ol className="space-y-1">
            {bridge.lines.map((line, i) => (
              <li
                key={`${line.perfumerIngredientId}-${i}`}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <span className="min-w-0 text-lab-ink">
                  <span className="mr-1.5 font-mono text-[11px] text-lab-muted">
                    {i + 1}.
                  </span>
                  {line.name}
                  {!line.labChemicalId ? (
                    <span className="ml-1.5 text-[11px] text-lab-hazard">
                      unmapped
                    </span>
                  ) : line.mapStatus === "proxy" ? (
                    <span className="ml-1.5 text-[11px] text-lab-amber">
                      proxy
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 font-mono text-[12px] text-lab-ink/90">
                  {line.percent}%
                </span>
              </li>
            ))}
          </ol>

          {unmapped > 0 && bridge.mappingReport?.unmappedIds?.length ? (
            <p className="font-mono text-[11px] leading-relaxed text-lab-hazard/90">
              Missing: {bridge.mappingReport.unmappedIds.slice(0, 8).join(", ")}
              {(bridge.mappingReport.unmappedIds.length || 0) > 8 ? "…" : ""}
            </p>
          ) : null}

          {india ? (
            <p className="text-sm leading-relaxed text-lab-muted">{india}</p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            {canUndo ? (
              <button
                type="button"
                onClick={onUndo}
                className="min-h-9 rounded-md border border-lab-line px-3 text-xs font-medium text-lab-ink hover:bg-lab-wash"
              >
                Undo to plan
              </button>
            ) : null}
            {onInstant && canBuild && !building ? (
              <button
                type="button"
                onClick={onInstant}
                className="min-h-9 rounded-md px-2 text-xs font-medium text-lab-muted underline decoration-lab-line underline-offset-2 hover:text-lab-ink"
              >
                Apply instantly
              </button>
            ) : null}
          </div>

          {mode === "building" ? (
            <p className="text-xs leading-relaxed text-lab-muted">
              Pouring on the desk — watch the beaker fill step by step.
            </p>
          ) : mode === "built" ? (
            <p className="text-xs leading-relaxed text-lab-muted">
              Build complete. Refine in chat or open Tutor for notes.
            </p>
          ) : mode === "stopped" ? (
            <p className="text-xs leading-relaxed text-lab-muted">
              Stopped. Undo to restore the pre-build desk, or Build again.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
