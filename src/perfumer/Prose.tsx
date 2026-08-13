"use client";

import { stripCostCopy } from "./hideCost";

/** Light prose renderer: paragraphs, bold/italic, lists. No ATX heading chrome. */
export function Prose({ text }: { text: string }) {
  if (!text) return null;
  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/);

  return (
    <div className="space-y-2.5 text-[13px] leading-relaxed text-lab-ink">
      {blocks.map((block, i) => {
        const stripped = stripCostCopy(block);
        if (!stripped) return null;
        const lines = stripped.split("\n").map((l) => l.trimEnd());
        const isList = lines.every(
          (l) => !l.trim() || /^[-*•]\s+/.test(l.trim()) || /^\d+\.\s+/.test(l.trim()),
        );
        const labelOnly =
          lines.length === 1 &&
          /^(Accord|Formula|Explanation|Improvements|Sources)\s*:?\s*$/i.test(
            lines[0].trim(),
          );

        if (labelOnly) {
          return (
            <p
              key={i}
              className="pt-1 text-[11px] font-semibold uppercase tracking-label text-lab-muted"
            >
              {lines[0].replace(/:$/, "")}
            </p>
          );
        }

        if (isList && lines.some((l) => l.trim())) {
          return (
            <ul key={i} className="space-y-1.5 pl-0">
              {lines
                .filter((l) => l.trim())
                .map((l, j) => (
                  <li key={j} className="flex gap-2">
                    <span className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-lab-muted/70" />
                    <span className="min-w-0">
                      {inline(
                        l.replace(/^[-*•]\s+/, "").replace(/^\d+\.\s+/, ""),
                      )}
                    </span>
                  </li>
                ))}
            </ul>
          );
        }

        return (
          <p key={i} className="whitespace-pre-wrap">
            {lines.map((line, j) => (
              <span key={j}>
                {j > 0 ? <br /> : null}
                {inline(line)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function inline(s: string) {
  // **bold** and *italic* only
  const parts = s.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        <em key={i} className="italic text-lab-ink/90">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
