"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatDock } from "@/store/builderStore";

/**
 * Drag handle to re-dock chat: right rail ↔ under desk (desktop only).
 * Uses pointer capture so it doesn't fight chemical @dnd-kit.
 */
export function ChatDockHandle({
  dock,
  onDock,
}: {
  dock: ChatDock;
  onDock: (dock: ChatDock) => void;
}) {
  const dragging = useRef(false);
  const [live, setLive] = useState<ChatDock | null>(null);
  const start = useRef({ x: 0, y: 0 });

  const end = useCallback(
    (e: React.PointerEvent | PointerEvent, clientX?: number, clientY?: number) => {
      if (!dragging.current) return;
      dragging.current = false;
      const x = clientX ?? ("clientX" in e ? e.clientX : 0);
      const y = clientY ?? ("clientY" in e ? e.clientY : 0);
      const target = pickDockZone(x, y) ?? dock;
      setLive(null);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.dispatchEvent(
        new CustomEvent("alyra-chat-dock-drag", { detail: { active: false } }),
      );
      if (target !== dock) onDock(target);
    },
    [dock, onDock],
  );

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    start.current = { x: e.clientX, y: e.clientY };
    setLive(dock);
    e.currentTarget.setPointerCapture(e.pointerId);
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
    window.dispatchEvent(
      new CustomEvent("alyra-chat-dock-drag", { detail: { active: true, hover: dock } }),
    );
  }, [dock]);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!dragging.current) return;
      const hover = pickDockZone(e.clientX, e.clientY) ?? dock;
      setLive(hover);
      window.dispatchEvent(
        new CustomEvent("alyra-chat-dock-drag", {
          detail: { active: true, hover },
        }),
      );
    },
    [dock],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      end(e, e.clientX, e.clientY);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [end],
  );

  useEffect(() => {
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.dispatchEvent(
        new CustomEvent("alyra-chat-dock-drag", { detail: { active: false } }),
      );
    };
  }, []);

  return (
    <button
      type="button"
      aria-label="Drag to dock chat right or below desk"
      title="Drag to dock · Right or Bottom"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={`flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded-md text-lab-muted touch-none hover:bg-lab-wash hover:text-lab-ink active:cursor-grabbing ${
        live ? "bg-lab-wash text-lab-ink" : ""
      }`}
    >
      <span aria-hidden className="font-mono text-[11px] leading-none tracking-tighter">
        ⋮⋮
      </span>
    </button>
  );
}

function pickDockZone(x: number, y: number): ChatDock | null {
  const bottom = document.getElementById("alyra-drop-bottom");
  const right = document.getElementById("alyra-drop-right");
  if (bottom) {
    const r = bottom.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return "bottom";
  }
  if (right) {
    const r = right.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return "right";
  }
  // Heuristic fallback when overlays aren't mounted yet
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
        className={`absolute inset-y-2 right-2 w-[min(18rem,28%)] rounded-xl border-2 border-dashed transition ${
          hover === "right"
            ? "border-lab-ink/50 bg-lab-ink/10"
            : "border-lab-line/70 bg-lab-panel/30"
        }`}
      >
        <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[11px] font-semibold uppercase tracking-[0.14em] text-lab-ink/70">
          Right{chatDock === "right" ? " · current" : ""}
        </p>
      </div>
      <div
        id="alyra-drop-bottom"
        className={`absolute bottom-2 left-[14%] right-[14%] h-[min(12rem,32%)] rounded-xl border-2 border-dashed transition ${
          hover === "bottom"
            ? "border-lab-ink/50 bg-lab-ink/10"
            : "border-lab-line/70 bg-lab-panel/30"
        }`}
      >
        <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[11px] font-semibold uppercase tracking-[0.14em] text-lab-ink/70">
          Below desk{chatDock === "bottom" ? " · current" : ""}
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
