"use client";

import { PerfumerChat } from "@/perfumer/PerfumerChat";
import { PlanPanel } from "@/perfumer/PlanPanel";
import { useBuilderStore } from "@/store/builderStore";
import { PanelResizeHandle } from "@/desk/PanelResizeHandle";

export function ChatRail({
  onBuild,
  onStop,
  onUndo,
  onInstant,
  onCloseSheet,
  mobileSheet,
}: {
  onBuild: () => void;
  onStop: () => void;
  onUndo: () => void;
  onInstant: () => void;
  onCloseSheet?: () => void;
  /** Full-height phone sheet over desk */
  mobileSheet?: boolean;
}) {
  const plan = useBuilderStore((s) => s.plan);
  const structured = useBuilderStore((s) => s.structured);
  const mode = useBuilderStore((s) => s.mode);
  const buildStepIndex = useBuilderStore((s) => s.buildStepIndex);
  const buildSteps = useBuilderStore((s) => s.buildSteps);
  const rightWidth = useBuilderStore((s) => s.rightWidth);
  const setRightWidth = useBuilderStore((s) => s.setRightWidth);
  const building = mode === "building";

  const body = (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-hidden">
        <PerfumerChat variant="shell" onCloseSheet={onCloseSheet} />
      </div>
      <PlanPanel
        bridge={plan}
        structured={structured}
        mode={mode}
        buildStepIndex={buildStepIndex}
        buildTotal={buildSteps.length}
        onBuild={onBuild}
        onStop={onStop}
        onUndo={onUndo}
        onInstant={onInstant}
        compact={Boolean(mobileSheet)}
      />
    </div>
  );

  if (mobileSheet) {
    return (
      <div
        className="fixed inset-0 z-[280] flex flex-col justify-end md:hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-sheet-title"
      >
        <button
          type="button"
          className="absolute inset-0 bg-lab-ink/45"
          aria-label="Close chat"
          onClick={onCloseSheet}
        />
        <div className="relative flex max-h-[88dvh] min-h-[70dvh] flex-col rounded-t-2xl border border-lab-line bg-lab-panel pb-[env(safe-area-inset-bottom,0px)] shadow-2xl">
          <div className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-lab-line" />
          <div className="flex items-center justify-between gap-3 border-b border-lab-line/50 px-4 py-2.5">
            <h2
              id="chat-sheet-title"
              className="text-sm font-semibold tracking-wide text-lab-ink"
            >
              Perfumer
            </h2>
            <button
              type="button"
              onClick={onCloseSheet}
              className="min-h-11 shrink-0 rounded-lg bg-lab-ink px-3 text-xs font-semibold text-lab-foam"
            >
              Done
            </button>
          </div>
          {body}
        </div>
      </div>
    );
  }

  return (
    <div className="relative hidden h-full shrink-0 md:flex">
      <PanelResizeHandle
        side="right"
        onResize={(dx) => setRightWidth(rightWidth + dx)}
      />
      <aside
        className="panel-glass flex h-full shrink-0 flex-col border-l border-lab-line/60"
        style={{ width: rightWidth }}
      >
        {body}
      </aside>
      {/* Keep building HUD out of chat body noise */}
      {building ? (
        <span className="sr-only">
          Building step {buildStepIndex + 1} of {buildSteps.length}
        </span>
      ) : null}
    </div>
  );
}
