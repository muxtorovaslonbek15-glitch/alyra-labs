"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Thin drag handle between Lab columns. Cursor-like resize affordance.
 */
export function PanelResizeHandle({
  side,
  onResize,
  className = "",
}: {
  side: "left" | "right";
  onResize: (deltaPx: number) => void;
  className?: string;
}) {
  const dragging = useRef(false);
  const lastX = useRef(0);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragging.current = true;
      lastX.current = e.clientX;
      e.currentTarget.setPointerCapture(e.pointerId);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging.current) return;
      const dx = e.clientX - lastX.current;
      lastX.current = e.clientX;
      // Left panel grows with +dx; right panel grows with −dx.
      onResize(side === "left" ? dx : -dx);
    },
    [onResize, side],
  );

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, []);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={side === "left" ? "Resize inventory" : "Resize chat"}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className={`group relative z-20 hidden w-1 shrink-0 cursor-col-resize touch-none md:block ${className}`}
    >
      <div className="absolute inset-y-0 -left-1 -right-1" />
      <div className="absolute inset-y-8 left-0 w-px bg-lab-line/50 transition group-hover:bg-lab-ink/35 group-active:bg-lab-ink/50" />
    </div>
  );
}
