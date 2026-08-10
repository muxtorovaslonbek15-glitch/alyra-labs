import { describe, expect, it } from "vitest";
import {
  applyStatus,
  applyTool,
  createThoughtTimeline,
  finalizeThoughtTimeline,
  STREAM_SLOW_START_MS,
  STREAM_STALL_MS,
  streamConnectionState,
  timelineToolChips,
  toolChipLabel,
  workedSeconds,
} from "./thoughtTimeline";

describe("thoughtTimeline", () => {
  it("maps tools to calm chips", () => {
    expect(toolChipLabel("generate_formula")).toBe("formula");
    expect(toolChipLabel("search_alyra_catalog")).toBe("catalog");
    expect(toolChipLabel("refine_formula")).toBe("refine");
  });

  it("folds status into an open thought and records tools", () => {
    let tl = createThoughtTimeline(1_000);
    tl = applyStatus(tl, "Listening to the brief...", { now: 1_100 });
    tl = applyStatus(tl, "Composing the formula...", {
      now: 1_200,
      tool: "generate_formula",
    });
    tl = applyTool(tl, "generate_formula", true, 1_500);
    tl = applyStatus(tl, "Here's what I'd do...", { now: 1_600 });
    tl = finalizeThoughtTimeline(tl, 2_000);

    expect(tl.endedAt).toBe(2_000);
    expect(workedSeconds(tl, 2_000)).toBe(1);
    expect(timelineToolChips(tl)).toEqual(["formula"]);

    const thoughts = tl.entries.filter((e) => e.kind === "thought");
    const tools = tl.entries.filter((e) => e.kind === "tool");
    expect(tools).toHaveLength(1);
    expect(tools[0].summary).toBe("formula");
    expect(thoughts.every((t) => t.summary === "Thought briefly")).toBe(true);
    expect(thoughts.some((t) => t.notes.includes("Composing the formula"))).toBe(
      true,
    );
  });

  it("dedupes consecutive identical tool events", () => {
    let tl = createThoughtTimeline(0);
    tl = applyTool(tl, "refine_formula", true, 10);
    tl = applyTool(tl, "refine_formula", true, 20);
    const tools = tl.entries.filter((e) => e.kind === "tool");
    expect(tools).toHaveLength(1);
  });

  it("flags reconnecting on slow start, stall, offline, and recovery", () => {
    const startedAt = 10_000;
    expect(
      streamConnectionState({
        startedAt,
        lastActivityAt: null,
        now: startedAt + STREAM_SLOW_START_MS - 1,
      }),
    ).toBe("working");
    expect(
      streamConnectionState({
        startedAt,
        lastActivityAt: null,
        now: startedAt + STREAM_SLOW_START_MS,
      }),
    ).toBe("reconnecting");

    const activeAt = startedAt + 1_000;
    expect(
      streamConnectionState({
        startedAt,
        lastActivityAt: activeAt,
        now: activeAt + STREAM_STALL_MS - 1,
      }),
    ).toBe("working");
    expect(
      streamConnectionState({
        startedAt,
        lastActivityAt: activeAt,
        now: activeAt + STREAM_STALL_MS,
      }),
    ).toBe("reconnecting");

    expect(
      streamConnectionState({
        startedAt,
        lastActivityAt: activeAt,
        now: activeAt + 100,
        offline: true,
      }),
    ).toBe("reconnecting");
    expect(
      streamConnectionState({
        startedAt,
        lastActivityAt: null,
        now: startedAt + 100,
        networkIssue: true,
      }),
    ).toBe("reconnecting");

    // Fresh activity recovers to working
    expect(
      streamConnectionState({
        startedAt,
        lastActivityAt: activeAt + STREAM_STALL_MS + 500,
        now: activeAt + STREAM_STALL_MS + 600,
      }),
    ).toBe("working");
  });
});
