"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatDock } from "@/store/builderStore";

const DRAG_THRESHOLD_PX = 6;

/**
 * Cursor-like dock grip for Lab chat (md+):
 * - Drag to Right or Bottom drop zones
 * - Double-click toggles bottom dock ↔ right rail
 */
export function ChatDockHandle({
  dock,
  onDock,
}: {
  dock: ChatDock;
  onDock: (dock: ChatDock) => void;
}) {
  const dragging = useRef(false);
  const armed = useRef(false);
  const start = useRef({ x: 0, y: 0 });
  const [live, setLive] = useState<ChatDock | null>(null);

  const clearDragUi = useCallback(() => {
    dragging.current = false;
    armed.current = false;
    setLive(null);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    window.dispatchEvent(
      new CustomEvent("alyra-chat-dock-drag", { detail: { active: false } }),
    );
  }, []);

  const beginDragUi = useCallback(
    (hover: ChatDock) => {
      dragging.current = true;
      setLive(hover);
      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";
      window.dispatchEvent(
        new CustomEvent("alyra-chat-dock-drag", {
          detail: { active: true, hover },
        }),
      );
    },
    [],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      // Left button only; let double-click fire without capture fights.
      if (e.button !== 0) return;
      e.stopPropagation();
      armed.current = true;
      dragging.current = false;
      start.current = { x: e.clientX, y: e.clientY };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!armed.current) return;
      const dx = e.clientX - start.current.x;
      const dy = e.clientY - start.current.y;
      if (!dragging.current) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
        beginDragUi(dock);
      }
      const hover = pickDockZone(e.clientX, e.clientY) ?? dock;
      setLive(hover);
      window.dispatchEvent(
        new CustomEvent("alyra-chat-dock-drag", {
          detail: { active: true, hover },
        }),
      );
    },
    [beginDragUi, dock],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!armed.current) return;
      const wasDragging = dragging.current;
      const x = e.clientX;
      const y = e.clientY;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      if (wasDragging) {
        const target = pickDockZone(x, y) ?? dock;
        clearDragUi();
        if (target !== dock) onDock(target);
        return;
      }
      clearDragUi();
    },
    [clearDragUi, dock, onDock],
  );

  const onDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      clearDragUi();
      // Cursor: dblclick panel grip snaps to bottom; again restores right.
      onDock(dock === "bottom" ? "right" : "bottom");
    },
    [clearDragUi, dock, onDock],
  );

  useEffect(() => {
    return () => {
      clearDragUi();
    };
  }, [clearDragUi]);

  const nextHint = dock === "right" ? "bottom" : "right";

  return (
    <button
      type="button"
      aria-label={`Dock chat. Drag to move, double-click to snap ${nextHint}`}
      title={`Drag to dock · Double-click for ${nextHint}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onDoubleClick}
      className={`flex h-7 min-w-7 shrink-0 cursor-grab items-center justify-center rounded-md px-1 text-lab-muted touch-none hover:bg-lab-wash hover:text-lab-ink active:cursor-grabbing ${
        live ? "bg-lab-wash text-lab-ink" : ""
      }`}
    >
      <span
        aria-hidden
        className="select-none font-mono text-[10px] font-semibold leading-none tracking-[0.18em] text-current"
      >
        :::
      </span>
    </button>
  );
}

function pickDockZone(x: number, y: number): ChatDock | null {
  const bottom = document.getElementById("alyra-drop-bottom");
  const right = document.getElementById("alyra-drop-right");
  if (bottom) {
    const r = bottom.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
      return "bottom";
    }
  }
  if (right) {
    const r = right.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
      return "right";
    }
  }
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  if (y > vh * 0.62) return "bottom";
  if (x > vw * 0.72) return "right";
  return null;
}

/** Drop-zone overlays while dragging the chat dock handle (md+). */
export function ChatDockDropZones({
  active,
  hover,
  chatDock,
}: {
  active: boolean;
  hover: ChatDock | null;
  chatDock: ChatDock;
}) {
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-[200] hidden md:block">
      <div
        id="alyra-drop-right"
        className={`absolute inset-y-3 right-2 w-[min(18rem,28%)] rounded-xl border-2 border-dashed transition ${
          hover === "right"
            ? "border-lab-ink/55 bg-lab-ink/[0.12] shadow-[inset_0_0_0_1px_rgba(12,12,12,0.06)]"
            : "border-lab-line/80 bg-lab-panel/40"
        }`}
      >
        <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[11px] font-semibold uppercase tracking-[0.14em] text-lab-ink/75">
          Right rail{chatDock === "right" ? " · current" : ""}
        </p>
      </div>
      <div
        id="alyra-drop-bottom"
        className={`absolute bottom-2 left-[12%] right-[12%] h-[min(14rem,36%)] rounded-xl border-2 border-dashed transition ${
          hover === "bottom"
            ? "border-lab-ink/55 bg-lab-ink/[0.12] shadow-[inset_0_0_0_1px_rgba(12,12,12,0.06)]"
            : "border-lab-line/80 bg-lab-panel/40"
        }`}
      >
        <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-lab-ink/75">
          Bottom panel
          {chatDock === "bottom" ? " · current" : ""}
          <span className="mt-1 block text-[10px] font-medium normal-case tracking-normal text-lab-muted">
            Under the desk
          </span>
        </p>
      </div>
    </div>
  );
}

export function useChatDockDragState() {
  const [state, setState] = useState<{
    active: boolean;
    hover: ChatDock | null;
  }>({ active: false, hover: null });

  useEffect(() => {
    const onEvt = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        active?: boolean;
        hover?: ChatDock;
      };
      setState({
        active: Boolean(detail?.active),
        hover: detail?.hover ?? null,
      });
    };
    window.addEventListener("alyra-chat-dock-drag", onEvt);
    return () => window.removeEventListener("alyra-chat-dock-drag", onEvt);
  }, []);

  return state;
}
