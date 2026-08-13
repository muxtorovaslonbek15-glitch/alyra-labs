"use client";

import type { ReactNode } from "react";
import { PanelResizeHandle } from "@/desk/PanelResizeHandle";
import { useBuilderStore } from "@/store/builderStore";

/**
 * Desktop right rail: Information, Chat, and Wear all share `rightWidth`
 * (`alyra.builder.panels.v1`) so toggling modes does not jump the layout.
 */
export function RightRailShell({
  children,
  asideClassName = "",
  dataAttr,
}: {
  children: ReactNode;
  asideClassName?: string;
  dataAttr?: "lab-right-chat" | "lab-right-info" | "wear-companion";
}) {
  const rightWidth = useBuilderStore((s) => s.rightWidth);

  return (
    <div className="relative hidden h-full shrink-0 md:flex">
      <PanelResizeHandle
        side="right"
        label="Resize panel"
        onResize={(dx) => {
          const w = useBuilderStore.getState().rightWidth;
          useBuilderStore.getState().setRightWidth(w + dx);
        }}
      />
      <aside
        className={`flex h-full min-h-0 shrink-0 flex-col overflow-hidden border-l border-lab-line/70 bg-lab-panel ${asideClassName}`}
        style={{ width: rightWidth }}
        data-lab-right-chat={dataAttr === "lab-right-chat" ? "" : undefined}
        data-lab-right-info={dataAttr === "lab-right-info" ? "" : undefined}
        data-wear-companion={dataAttr === "wear-companion" ? "" : undefined}
      >
        {children}
      </aside>
    </div>
  );
}
