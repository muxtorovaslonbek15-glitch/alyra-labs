"use client";

import { PerfumerChat } from "@/perfumer/PerfumerChat";
import { PlanPanel } from "@/perfumer/PlanPanel";
import { useBuilderStore } from "@/store/builderStore";

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
  const building = mode === "building";

  const body = (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className={`min-h-0 flex-1 overflow-hidden ${building ? "max-h-[40%]" : ""}`}>
        <PerfumerChat variant="shell" onCloseSheet={onCloseSheet} />
      </div>
      <div
        className={`scroll-thin shrink-0 overflow-y-auto border-t border-lab-line/60 ${
          building ? "max-h-[60%]" : "max-h-[45%]"
        }`}
      >
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
          <div className="flex items-center justify-between gap-3 border-b border-lab-line/50 px-4 py-3">
            <div className="min-w-0">
              <p className="font-display text-[10px] uppercase tracking-[0.2em] text-lab-muted">
                Chat
              </p>
              <h2
                id="chat-sheet-title"
                className="font-display text-lg leading-tight text-lab-ink"
              >
                Master Perfumer
              </h2>
            </div>
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
    <aside className="panel-glass hidden h-full w-[min(22rem,28vw)] shrink-0 flex-col border-l border-lab-line/60 md:flex xl:w-[24rem]">
      <div className="flex w-full items-center justify-between border-b border-lab-line/50 px-2.5 py-2 text-left">
        <div>
          <p className="font-display text-[10px] uppercase tracking-[0.2em] text-lab-teal">
            Chat
          </p>
          <h2 className="mt-0.5 font-display text-base leading-tight text-lab-ink">
            Master Perfumer
          </h2>
        </div>
      </div>
      {body}
    </aside>
  );
}
