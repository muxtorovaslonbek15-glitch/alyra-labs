"use client";

import { useCallback, useEffect, useRef } from "react";

type ResizeSide = "left" | "right" | "top" | "bottom";

/**
 * Thin drag handle between Lab columns / rows. Cursor-like resize affordance.
 */
export function PanelResizeHandle({
  side,
  onResize,
  className = "",
  label: labelProp,
}: {
  side: ResizeSide;
  onResize: (deltaPx: number) => void;
  className?: string;
  label?: string;
}) {
  const dragging = useRef(false);
  const last = useRef(0);
  const vertical = side === "top" || side === "bottom";

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragging.current = true;
      last.current = vertical ? e.clientY : e.clientX;
      e.currentTarget.setPointerCapture(e.pointerId);
      document.body.style.cursor = vertical ? "row-resize" : "col-resize";
      document.body.style.userSelect = "none";
    },
    [vertical],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging.current) return;
      if (vertical) {
        const dy = e.clientY - last.current;
        last.current = e.clientY;
        // Bottom panel grows when dragging its top edge upward (−dy).
        onResize(side === "top" ? -dy : dy);
      } else {
        const dx = e.clientX - last.current;
        last.current = e.clientX;
        // Left panel grows with +dx; right panel grows with −dx.
        onResize(side === "left" ? dx : -dx);
      }
    },
    [onResize, side, vertical],
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

  const label =
    labelProp ??
    (side === "left"
      ? "Resize inventory"
      : side === "right"
        ? "Resize panel"
        : "Resize chat height");

  return (
    <div
      role="separator"
      aria-orientation={vertical ? "horizontal" : "vertical"}
      aria-label={label}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className={
        vertical
          ? `group relative z-20 hidden h-1 w-full shrink-0 cursor-row-resize touch-none md:block ${className}`
          : `group relative z-20 hidden w-1 shrink-0 cursor-col-resize touch-none md:block ${className}`
      }
    >
      {vertical ? (
        <>
          <div className="absolute inset-x-0 -top-1 -bottom-1" />
          <div className="absolute inset-x-8 top-0 h-px bg-lab-line/50 transition group-hover:bg-lab-ink/35 group-active:bg-lab-ink/50" />
        </>
      ) : (
        <>
          <div className="absolute inset-y-0 -left-1 -right-1" />
          <div className="absolute inset-y-8 left-0 w-px bg-lab-line/50 transition group-hover:bg-lab-ink/35 group-active:bg-lab-ink/50" />
        </>
      )}
    </div>
  );
}
