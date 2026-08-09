"use client";

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
  if (!bridge?.lines?.length) {
    return (
      <div
        className={`border-t border-lab-line/70 bg-lab-wash/40 ${
          compact ? "px-3 py-3" : "px-3 py-4 md:px-4"
        }`}
      >
        <p className="font-display text-base text-lab-ink">Plan</p>
        <p className="mt-1.5 text-sm leading-relaxed text-lab-muted">
          Brief in chat first. When a formula lands, the plan appears here —
          read it, then hit Build to pour on the desk.
        </p>
      </div>
    );
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
  const canBuild = mode === "plan_ready" || mode === "stopped" || mode === "built";
  const canUndo = (mode === "built" || mode === "stopped") && Boolean(onUndo);

  return (
    <div
      className={`border-t border-lab-line/70 bg-lab-panel ${
        compact ? "px-3 py-3" : "px-3 py-4 md:px-4"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-lab-muted">
            Plan
          </p>
          <h3 className="mt-1 font-display text-xl leading-snug text-lab-ink md:text-2xl">
            {bridge.title}
          </h3>
          <p className="mt-1 text-sm text-lab-muted">
            {bridge.format}
            {bridge.batchGrams ? ` · ${bridge.batchGrams}g batch` : ""}
          </p>
        </div>
        {building && buildTotal != null && buildStepIndex != null ? (
          <p className="shrink-0 font-mono text-xs text-lab-muted">
            {Math.min(buildStepIndex + 1, buildTotal)}/{buildTotal}
          </p>
        ) : null}
      </div>

      <section className="mt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-lab-muted">
          Formula
        </p>
        <ol className="mt-2 space-y-1.5">
          {bridge.lines.map((line, i) => (
            <li
              key={`${line.perfumerIngredientId}-${i}`}
              className="flex items-baseline justify-between gap-3 text-sm"
            >
              <span className="min-w-0 text-lab-ink">
                <span className="mr-1.5 font-mono text-xs text-lab-muted">
                  {i + 1}.
                </span>
                {line.name}
                {!line.labChemicalId ? (
                  <span className="ml-1.5 text-xs text-lab-hazard">unmapped</span>
                ) : line.mapStatus === "proxy" ? (
                  <span className="ml-1.5 text-xs text-lab-amber">proxy</span>
                ) : null}
              </span>
              <span className="shrink-0 font-mono text-[13px] text-lab-ink/90">
                {line.percent}%
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-lab-muted">
          Mapping
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-lab-ink/85">
          Lab can place {mapped} material{mapped === 1 ? "" : "s"}
          {unmapped > 0 ? `; ${unmapped} not in inventory yet` : ""}.
        </p>
        {unmapped > 0 && bridge.mappingReport?.unmappedIds?.length ? (
          <p className="mt-1 font-mono text-xs leading-relaxed text-lab-hazard/90">
            Missing: {bridge.mappingReport.unmappedIds.slice(0, 8).join(", ")}
            {(bridge.mappingReport.unmappedIds.length || 0) > 8 ? "…" : ""}
          </p>
        ) : null}
      </section>

      {costInr != null ? (
        <section className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-lab-muted">
            Cost
          </p>
          <p className="mt-1 font-display text-xl text-lab-ink">
            ₹{Math.round(costInr).toLocaleString("en-IN")}
          </p>
        </section>
      ) : null}

      {india ? (
        <section className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-lab-muted">
            India / occasion
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-lab-ink/85">{india}</p>
        </section>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {building ? (
          <button
            type="button"
            onClick={onStop}
            className="min-h-11 rounded-lg border border-lab-hazard/40 bg-lab-hazard/10 px-4 py-2.5 text-sm font-semibold text-lab-hazard transition hover:bg-lab-hazard/15 md:min-h-10"
          >
            Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={onBuild}
            disabled={!canBuild || mapped === 0}
            className="min-h-11 rounded-lg bg-lab-ink px-5 py-2.5 text-sm font-semibold text-lab-foam transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40 md:min-h-10"
          >
            Build
          </button>
        )}
        {canUndo ? (
          <button
            type="button"
            onClick={onUndo}
            className="min-h-11 rounded-lg border border-lab-line px-3 py-2.5 text-sm font-medium text-lab-ink hover:bg-lab-wash md:min-h-10"
          >
            Undo to plan
          </button>
        ) : null}
        {onInstant && canBuild && !building ? (
          <button
            type="button"
            onClick={onInstant}
            className="min-h-11 rounded-lg px-3 py-2.5 text-sm font-medium text-lab-muted underline decoration-lab-line underline-offset-2 hover:text-lab-ink md:min-h-10"
          >
            Apply instantly
          </button>
        ) : null}
      </div>

      {mode === "building" ? (
        <p className="mt-3 text-sm leading-relaxed text-lab-muted">
          Pouring on the desk — watch the beaker fill step by step.
        </p>
      ) : mode === "built" ? (
        <p className="mt-3 text-sm leading-relaxed text-lab-muted">
          Build complete. Refine in chat or open Tutor for notes.
        </p>
      ) : mode === "stopped" ? (
        <p className="mt-3 text-sm leading-relaxed text-lab-muted">
          Stopped. Undo to restore the pre-build desk, or Build again.
        </p>
      ) : null}
    </div>
  );
}
