/**
 * Local Cursor-style thought timeline from SSE status/tool events.
 * No extra model calls — labels are derived from known tool stages.
 */

export type ThoughtEntryKind = "thought" | "tool";

export interface ThoughtEntry {
  id: string;
  kind: ThoughtEntryKind;
  /** Collapsed row label, e.g. "Thought briefly" */
  summary: string;
  /** Expandable notes (status lines / tool detail) */
  notes: string[];
  tool?: string;
  ok?: boolean;
  startedAt: number;
  endedAt?: number;
}

export interface ThoughtTimeline {
  startedAt: number;
  endedAt?: number;
  entries: ThoughtEntry[];
}

const TOOL_CHIP: Record<string, string> = {
  retrieve_alyra_formulas: "catalog",
  search_alyra_catalog: "catalog",
  get_alyra_scent: "catalog",
  search_ingredients: "materials",
  generate_formula: "formula",
  refine_formula: "refine",
  calculate_formula_cost: "batch",
  apply_solid_constraints: "solid",
  analyze_dupe: "accord",
  web_search: "research",
  validate_materials: "IFRA",
  open_in_lab: "lab",
};

const TOOL_NOTE: Record<string, string> = {
  retrieve_alyra_formulas: "Reviewing Alyra house formulas",
  search_alyra_catalog: "Checking the Alyra lineup",
  get_alyra_scent: "Opening a scent dossier",
  search_ingredients: "Pulling materials from the library",
  generate_formula: "Composing the formula",
  refine_formula: "Tweaking the prior formula",
  calculate_formula_cost: "Checking material coverage",
  apply_solid_constraints: "Weighing solid / wax constraints",
  analyze_dupe: "Mapping inspired-by accords",
  web_search: "Researching live sources",
  validate_materials: "Checking materials / IFRA",
  open_in_lab: "Preparing Lab desk payload",
};

let _seq = 0;
function nextId(prefix: string) {
  _seq += 1;
  return `${prefix}-${_seq}-${Date.now().toString(36)}`;
}

export function createThoughtTimeline(now = Date.now()): ThoughtTimeline {
  return {
    startedAt: now,
    entries: [
      {
        id: nextId("th"),
        kind: "thought",
        summary: "Thinking",
        notes: ["Listening to the brief"],
        startedAt: now,
      },
    ],
  };
}

export function toolChipLabel(tool: string): string {
  return TOOL_CHIP[tool] || tool.replace(/_/g, " ").slice(0, 18);
}

export function toolNote(tool: string): string {
  return TOOL_NOTE[tool] || tool.replace(/_/g, " ");
}

function lastThought(tl: ThoughtTimeline): ThoughtEntry | undefined {
  for (let i = tl.entries.length - 1; i >= 0; i -= 1) {
    if (tl.entries[i].kind === "thought") return tl.entries[i];
  }
  return undefined;
}

/** Append or fold a status label into the open thought block. */
export function applyStatus(
  tl: ThoughtTimeline,
  label: string,
  opts?: { stage?: string; tool?: string; now?: number },
): ThoughtTimeline {
  const now = opts?.now ?? Date.now();
  const clean = (label || "").replace(/\.\.\.$/, "").trim();
  if (!clean) return tl;

  const entries = [...tl.entries];
  const open = lastThought({ ...tl, entries });
  const streaming = !tl.endedAt;

  if (open && streaming && open.kind === "thought") {
    const notes = open.notes.includes(clean)
      ? open.notes
      : [...open.notes, clean].slice(-6);
    const idx = entries.findIndex((e) => e.id === open.id);
    entries[idx] = {
      ...open,
      summary: streaming ? "Thinking" : "Thought briefly",
      notes,
      tool: opts?.tool || open.tool,
    };
    return { ...tl, entries };
  }

  entries.push({
    id: nextId("th"),
    kind: "thought",
    summary: streaming ? "Thinking" : "Thought briefly",
    notes: [clean],
    tool: opts?.tool,
    startedAt: now,
  });
  return { ...tl, entries };
}

/** Record a completed tool step; close prior thought as "Thought briefly". */
export function applyTool(
  tl: ThoughtTimeline,
  tool: string,
  ok = true,
  now = Date.now(),
): ThoughtTimeline {
  const entries = tl.entries.map((e) =>
    e.kind === "thought" && !e.endedAt
      ? {
          ...e,
          summary: "Thought briefly",
          endedAt: now,
        }
      : e,
  );

  const chip = toolChipLabel(tool);
  const note = toolNote(tool);
  // Skip trailing empty thought pockets when deduping consecutive tools
  let i = entries.length - 1;
  while (
    i >= 0 &&
    entries[i].kind === "thought" &&
    entries[i].notes.length === 0
  ) {
    i -= 1;
  }
  if (i >= 0 && entries[i].kind === "tool" && entries[i].tool === tool) {
    entries[i] = { ...entries[i], ok, endedAt: now };
    return { ...tl, entries };
  }

  entries.push({
    id: nextId("tool"),
    kind: "tool",
    summary: chip,
    notes: [note],
    tool,
    ok,
    startedAt: now,
    endedAt: now,
  });

  // Fresh thought pocket for the next stage while still streaming
  if (!tl.endedAt) {
    entries.push({
      id: nextId("th"),
      kind: "thought",
      summary: "Thinking",
      notes: [],
      startedAt: now,
    });
  }

  return { ...tl, entries };
}

export function finalizeThoughtTimeline(
  tl: ThoughtTimeline,
  now = Date.now(),
): ThoughtTimeline {
  const entries = tl.entries
    .map((e) =>
      e.kind === "thought"
        ? {
            ...e,
            summary: "Thought briefly",
            endedAt: e.endedAt ?? now,
          }
        : { ...e, endedAt: e.endedAt ?? now },
    )
    .filter((e) => e.kind === "tool" || e.notes.length > 0);

  return {
    ...tl,
    endedAt: now,
    entries,
  };
}

export function workedSeconds(tl: ThoughtTimeline, now = Date.now()): number {
  const end = tl.endedAt ?? now;
  return Math.max(1, Math.round((end - tl.startedAt) / 1000));
}

/** No SSE yet after send — switch label to Reconnecting… */
export const STREAM_SLOW_START_MS = 5_000;
/** Stream was active but stalled — switch label to Reconnecting… */
export const STREAM_STALL_MS = 7_000;

export type StreamConnectionState = "working" | "reconnecting";

/**
 * Derive live header connection label from activity timestamps.
 * `lastActivityAt` is null until the first SSE event (meta/status/token/tool/…).
 */
export function streamConnectionState(input: {
  startedAt: number;
  lastActivityAt: number | null;
  now?: number;
  offline?: boolean;
  /** Transport / fetch failure while still waiting */
  networkIssue?: boolean;
}): StreamConnectionState {
  if (input.offline || input.networkIssue) return "reconnecting";
  const now = input.now ?? Date.now();
  if (input.lastActivityAt == null) {
    return now - input.startedAt >= STREAM_SLOW_START_MS
      ? "reconnecting"
      : "working";
  }
  return now - input.lastActivityAt >= STREAM_STALL_MS
    ? "reconnecting"
    : "working";
}

/** Distinct tool chips for a compact strip (formula · catalog · refine). */
export function timelineToolChips(tl: ThoughtTimeline): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of tl.entries) {
    if (e.kind !== "tool" || !e.tool) continue;
    const chip = toolChipLabel(e.tool);
    if (seen.has(chip)) continue;
    seen.add(chip);
    out.push(chip);
  }
  return out;
}
