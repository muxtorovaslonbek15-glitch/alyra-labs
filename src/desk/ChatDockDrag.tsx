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
  variant = "dots",
}: {
  dock: ChatDock;
  onDock: (dock: ChatDock) => void;
  /** dots = ::: rail grip; bar = horizontal bottom-panel grab */
  variant?: "dots" | "bar";
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

  const beginDragUi = useCallback((hover: ChatDock) => {
    dragging.current = true;
    setLive(hover);
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
    window.dispatchEvent(
      new CustomEvent("alyra-chat-dock-drag", {
        detail: { active: true, hover },
      }),
    );
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
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
      className={`flex shrink-0 cursor-grab touch-none items-center justify-center text-lab-muted hover:text-lab-ink active:cursor-grabbing ${
        variant === "bar"
          ? `h-5 w-10 rounded-md ${live ? "bg-lab-wash" : "hover:bg-lab-wash/80"}`
          : `h-7 min-w-7 rounded-md px-1 ${live ? "bg-lab-wash text-lab-ink" : "hover:bg-lab-wash"}`
      }`}
    >
      {variant === "bar" ? (
        <span aria-hidden className="flex flex-col items-center gap-[3px]">
          <span className="h-0.5 w-8 rounded-full bg-current opacity-45" />
          <span className="h-0.5 w-8 rounded-full bg-current opacity-45" />
        </span>
      ) : (
        <span
          aria-hidden
          className="grid grid-cols-2 gap-[3px] p-0.5"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <span
              key={i}
              className="h-[3px] w-[3px] rounded-full bg-current opacity-55"
            />
          ))}
        </span>
      )}
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
        className={`absolute inset-y-2 right-1 w-[min(18rem,28%)] border border-dashed transition ${
          hover === "right"
            ? "border-lab-ink/50 bg-lab-ink/[0.10]"
            : "border-lab-line/90 bg-lab-panel/50"
        }`}
      >
        <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[11px] font-semibold uppercase tracking-label text-lab-ink/70">
          Right{chatDock === "right" ? " · current" : ""}
        </p>
      </div>
      <div
        id="alyra-drop-bottom"
        className={`absolute bottom-1 left-[10%] right-[10%] h-[min(14rem,36%)] border border-dashed transition ${
          hover === "bottom"
            ? "border-lab-ink/50 bg-lab-ink/[0.10]"
            : "border-lab-line/90 bg-lab-panel/50"
        }`}
      >
        <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center text-[11px] font-semibold uppercase tracking-label text-lab-ink/70">
          Bottom panel
          {chatDock === "bottom" ? " · current" : ""}
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
