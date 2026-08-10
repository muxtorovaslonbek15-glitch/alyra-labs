"use client";

/**
 * @deprecated Prefer AgentTimeline. Kept as a minimal fallback spinner.
 */
import { AgentTimeline } from "./AgentTimeline";
import { createThoughtTimeline, applyStatus } from "./thoughtTimeline";

export function ThinkingPanel({
  label,
}: {
  label?: string;
  tools?: Array<{ tool: string; ok?: boolean }>;
}) {
  let tl = createThoughtTimeline();
  if (label) tl = applyStatus(tl, label);
  return <AgentTimeline timeline={tl} live />;
}
