"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Item } from "@/types";
import type { DragPayload } from "./types";
import { ItemGlyph } from "@/animation/heatSource";

interface Props {
  item: Item;
  payload: DragPayload;
  subtitle?: string;
  accentColor?: string;
  onQuickAdd?: () => void;
  hint?: string;
  /** Disambiguate when the same item is mounted twice (e.g. list + modal). */
  dragIdPrefix?: string;
  highlighted?: boolean;
}

export function DraggableItem({
  item,
  payload,
  subtitle,
  accentColor,
  onQuickAdd,
  hint,
  dragIdPrefix = "panel",
  highlighted = false,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `${dragIdPrefix}-${payload.type}-${item.id}`,
      data: payload,
    });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex w-full items-stretch gap-0.5 rounded-lg border bg-white/85 shadow-sm transition hover:border-lab-teal/45 hover:bg-white hover:shadow-md ${
        highlighted
          ? "border-lab-amber/60 ring-1 ring-lab-amber/25"
          : "border-lab-line/50"
      } ${isDragging ? "opacity-40" : ""}`}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 cursor-grab items-center gap-2 px-2 py-1.5 text-left active:cursor-grabbing"
        {...listeners}
        {...attributes}
      >
        <span
          className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-lab-wash text-sm"
          aria-hidden
        >
          <ItemGlyph id={item.id} icon={item.icon} />
          {accentColor ? (
            <span
              className="absolute bottom-0.5 right-0.5 h-1.5 w-1.5 rounded-full ring-1 ring-white"
              style={{ background: accentColor }}
            />
          ) : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium leading-tight text-lab-ink">
            {item.name}
          </span>
          {subtitle ? (
            <span className="mt-px block truncate font-mono text-[10px] leading-tight text-lab-muted">
              {subtitle}
            </span>
          ) : null}
        </span>
      </button>
      {onQuickAdd ? (
        <button
          type="button"
          title={hint ?? "Add to active vessel"}
          onClick={(e) => {
            e.stopPropagation();
            onQuickAdd();
          }}
          className="shrink-0 rounded-r-lg border-l border-lab-line/40 px-2 text-xs font-bold text-lab-teal opacity-70 transition hover:bg-lab-teal hover:text-white hover:opacity-100"
        >
          +
        </button>
      ) : null}
    </div>
  );
}
