"use client";

import { useEffect, useState } from "react";

/** Staged brainstorm labels — superpowers-inspired progressive thinking, Alyra-calm. */
const FALLBACK_STAGES = [
  "Listening to the brief…",
  "Brainstorming accords…",
  "Pulling materials…",
  "Weighing IFRA / solid constraints…",
  "Composing formula…",
];

export function ThinkingPanel({
  label,
  tools,
}: {
  label?: string;
  tools?: Array<{ tool: string; ok?: boolean }>;
}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (label) return;
    const id = setInterval(() => {
      setTick((t) => (t + 1) % FALLBACK_STAGES.length);
    }, 2400);
    return () => clearInterval(id);
  }, [label]);

  const display = label || FALLBACK_STAGES[tick];

  return (
    <div
      className="rounded-2xl rounded-bl-md border border-lab-line/80 bg-gradient-to-br from-lab-wash/90 to-white/40 px-3.5 py-3 transition-opacity duration-500"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lab-amber/50 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-lab-amber" />
        </span>
        <p className="font-display text-[15px] text-lab-ink transition-opacity duration-500">
          {display}
        </p>
      </div>
      {tools?.length ? (
        <ul className="mt-2.5 space-y-1 border-t border-lab-line/60 pt-2">
          {tools.map((t, i) => (
            <li
              key={`${t.tool}-${i}`}
              className="flex items-center gap-2 font-mono text-[10px] text-lab-muted"
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  t.ok === false ? "bg-lab-hazard" : "bg-lab-ink/40"
                }`}
              />
              {humanTool(t.tool)}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function humanTool(name: string) {
  const map: Record<string, string> = {
    retrieve_alyra_formulas: "Alyra formula library",
    search_ingredients: "Ingredient search",
    generate_formula: "Formula generator",
    calculate_formula_cost: "Cost estimate",
    apply_solid_constraints: "Solid constraints",
    analyze_dupe: "Inspired-by analysis",
    web_search: "Live research",
    validate_materials: "IFRA / materials check",
  };
  return map[name] || name.replace(/_/g, " ");
}
