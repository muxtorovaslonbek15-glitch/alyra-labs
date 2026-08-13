"use client";

import { useEffect, useState } from "react";
import {
  timelineToolChips,
  workedSeconds,
  type ThoughtEntry,
  type ThoughtTimeline,
} from "./thoughtTimeline";

function Chevron({ open }: { open: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-block text-[10px] text-lab-muted transition-transform duration-150 ${
        open ? "rotate-90" : ""
      }`}
    >
      ▸
    </span>
  );
}

function ThoughtRow({ entry, live }: { entry: ThoughtEntry; live?: boolean }) {
  const [open, setOpen] = useState(false);
  const hasNotes = entry.notes.length > 0;
  const label = live && !entry.endedAt ? "Thinking" : "Thought briefly";

  if (!hasNotes && !live) return null;

  return (
    <div className="text-[12px] leading-snug text-lab-muted">
      <button
        type="button"
        onClick={() => hasNotes && setOpen((v) => !v)}
        className={`group flex w-full items-center gap-1.5 rounded-sm py-0.5 text-left outline-none transition-colors focus-visible:ring-1 focus-visible:ring-lab-line ${
          hasNotes ? "cursor-pointer hover:text-lab-ink" : "cursor-default"
        }`}
        aria-expanded={hasNotes ? open : undefined}
        disabled={!hasNotes}
      >
        {hasNotes ? <Chevron open={open} /> : (
          <span className="inline-block w-[10px]" />
        )}
        <span className="font-medium text-lab-muted group-hover:text-lab-ink">
          {label}
        </span>
        {live && !entry.endedAt ? (
          <span className="ml-0.5 inline-flex gap-0.5" aria-hidden>
            <span className="h-1 w-1 animate-pulse rounded-full bg-lab-muted/45" />
            <span className="h-1 w-1 animate-pulse rounded-full bg-lab-muted/45 [animation-delay:120ms]" />
            <span className="h-1 w-1 animate-pulse rounded-full bg-lab-muted/45 [animation-delay:240ms]" />
          </span>
        ) : null}
      </button>
      {open && hasNotes ? (
        <div className="agent-thought-expand ml-[18px] mt-0.5 space-y-0.5 border-l border-lab-line/70 pl-2.5">
          {entry.notes.map((n) => (
            <p key={n} className="text-[11px] leading-relaxed text-lab-muted/90">
              {n}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ToolRow({ entry }: { entry: ThoughtEntry }) {
  return (
    <div className="ml-[18px] flex items-baseline gap-2 py-0.5 font-mono text-[11px] text-lab-muted">
      <span className="text-lab-ink/70">·</span>
      <span className="rounded bg-lab-wash/80 px-1.5 py-px text-[10px] font-medium tracking-wide text-lab-ink/80">
        {entry.summary}
      </span>
      {entry.notes[0] ? (
        <span className="min-w-0 truncate text-[10px] text-lab-muted/75">
          {entry.notes[0]}
          {entry.ok === false ? " · failed" : ""}
        </span>
      ) : null}
    </div>
  );
}

function WorkHeader({
  timeline,
  live,
  reconnecting = false,
}: {
  timeline: ThoughtTimeline;
  live: boolean;
  reconnecting?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [live]);

  const secs = workedSeconds(timeline, live ? now : timeline.endedAt ?? now);

  return (
    <div className="space-y-0.5" role="status" aria-live="polite">
      <div className="flex items-center gap-1.5 py-0.5 text-[12px] text-lab-muted">
        {live ? (
          <>
            <span
              className={`h-1.5 w-1.5 shrink-0 animate-pulse rounded-full ${
                reconnecting ? "bg-lab-muted/55" : "bg-lab-amber/80"
              }`}
            />
            <span className="font-medium text-lab-ink/75">
              {reconnecting ? "Reconnecting…" : "Working…"}
            </span>
            <span className="font-mono text-[11px] tabular-nums text-lab-muted">
              {secs}s
            </span>
          </>
        ) : (
          <>
            <span
              aria-hidden
              className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-lab-ink/8 text-[9px] text-lab-ink/70"
            >
              ✓
            </span>
            <span className="font-medium text-lab-muted">
              Worked for {secs}s
            </span>
          </>
        )}
      </div>
      {live && reconnecting ? (
        <p className="pl-[14px] text-[11px] leading-snug text-lab-muted/80">
          Slow or unstable connection
        </p>
      ) : null}
    </div>
  );
}

function ChipStrip({ chips }: { chips: string[] }) {
  if (!chips.length) return null;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      {chips.map((c) => (
        <span
          key={c}
          className="rounded border border-lab-line/70 bg-lab-panel px-1.5 py-px font-mono text-[9px] uppercase tracking-label text-lab-muted"
        >
          {c}
        </span>
      ))}
    </div>
  );
}

export function AgentTimeline({
  timeline,
  live = false,
  showChips = true,
  connectionState = "working",
}: {
  timeline: ThoughtTimeline;
  live?: boolean;
  showChips?: boolean;
  /** Live stream link health — Reconnecting… when slow/stalled/offline */
  connectionState?: "working" | "reconnecting";
}) {
  if (!timeline?.entries?.length && !live) return null;

  const chips = showChips ? timelineToolChips(timeline) : [];
  const reconnecting = live && connectionState === "reconnecting";

  return (
    <div className="agent-timeline space-y-0.5 py-0.5">
      <WorkHeader timeline={timeline} live={live} reconnecting={reconnecting} />
      {timeline.entries.map((e) =>
        e.kind === "thought" ? (
          <ThoughtRow key={e.id} entry={e} live={live} />
        ) : (
          <ToolRow key={e.id} entry={e} />
        ),
      )}
      {showChips && !live && chips.length ? <ChipStrip chips={chips} /> : null}
    </div>
  );
}
