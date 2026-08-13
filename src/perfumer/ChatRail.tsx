"use client";

import { PerfumerChat } from "@/perfumer/PerfumerChat";
import { PlanPanel } from "@/perfumer/PlanPanel";
import { useBuilderStore } from "@/store/builderStore";
import { PanelResizeHandle } from "@/desk/PanelResizeHandle";
import { RightRailShell } from "@/desk/RightRailShell";

export function ChatRail({
  onBuild,
  onStop,
  onUndo,
  onInstant,
  onCloseSheet,
  mobileSheet,
  /** Desktop placement: right rail or under desk */
  dock = "right",
}: {
  onBuild: () => void;
  onStop: () => void;
  onUndo: () => void;
  onInstant: () => void;
  onCloseSheet?: () => void;
  /** Full-height phone sheet over desk */
  mobileSheet?: boolean;
  dock?: "right" | "bottom";
}) {
  const plan = useBuilderStore((s) => s.plan);
  const structured = useBuilderStore((s) => s.structured);
  const mode = useBuilderStore((s) => s.mode);
  const buildStepIndex = useBuilderStore((s) => s.buildStepIndex);
  const buildSteps = useBuilderStore((s) => s.buildSteps);
  const bottomChatHeight = useBuilderStore((s) => s.bottomChatHeight);
  const setBottomChatHeight = useBuilderStore((s) => s.setBottomChatHeight);
  const building = mode === "building";

  const body = (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <PerfumerChat
          variant="shell"
          dock={mobileSheet ? "sheet" : dock}
          onCloseSheet={onCloseSheet}
          showDockControls={!mobileSheet}
        />
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
        compact={Boolean(mobileSheet) || dock === "bottom"}
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

  if (dock === "bottom") {
    return (
      <div
        className="relative hidden w-full shrink-0 flex-col border-t border-lab-line/80 bg-lab-panel md:flex"
        style={{ height: bottomChatHeight }}
        data-lab-bottom-panel
      >
        <PanelResizeHandle
          side="top"
          onResize={(dy) => setBottomChatHeight(bottomChatHeight + dy)}
        />
        <aside className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {body}
        </aside>
        {building ? (
          <span className="sr-only">
            Building step {buildStepIndex + 1} of {buildSteps.length}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <RightRailShell dataAttr="lab-right-chat">
      {body}
      {building ? (
        <span className="sr-only">
          Building step {buildStepIndex + 1} of {buildSteps.length}
        </span>
      ) : null}
    </RightRailShell>
  );
}
