"use client";

import { useEffect, useState } from "react";

const FALLBACK_STAGES = [
  "Listening to the brief...",
  "Brainstorming accords...",
  "Pulling materials...",
  "Weighing constraints...",
  "Composing...",
];

export function ThinkingPanel({
  label,
}: {
  label?: string;
  tools?: Array<{ tool: string; ok?: boolean }>;
}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (label) return;
    const id = setInterval(() => {
      setTick((t) => (t + 1) % FALLBACK_STAGES.length);
    }, 2800);
    return () => clearInterval(id);
  }, [label]);

  const display = label || FALLBACK_STAGES[tick];

  return (
    <div className="flex items-center gap-2.5 py-1" role="status" aria-live="polite">
      <span className="inline-flex gap-1">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lab-muted/50 [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lab-muted/50 [animation-delay:160ms]" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lab-muted/50 [animation-delay:320ms]" />
      </span>
      <p className="font-display text-sm text-lab-muted transition-opacity duration-500">
        {display}
      </p>
    </div>
  );
}
