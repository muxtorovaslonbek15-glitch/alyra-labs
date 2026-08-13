/** Owner-facing Lab/Chat/Wear must not render ₹ / INR / batch cost. */

const COST_COPY_RE =
  /₹|totalCostInr|costPerGram|cost per gram|\/\s*\d+\s*g(?:rams?)?\s*batch|\bINR\b/i;

const COST_HEADING_RE = /^Cost(\s+estimate)?\s*:?\s*$/i;

export function looksLikeCostCopy(text: string): boolean {
  return COST_COPY_RE.test(text) || COST_HEADING_RE.test(text.trim());
}

function stripCostSentences(line: string): string {
  return line
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => sentence.trim() && !looksLikeCostCopy(sentence))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Drop cost headings and ₹ lines from a prose block. Null if nothing remains. */
export function stripCostCopy(text: string): string | null {
  const kept = text
    .split("\n")
    .map((line) => stripCostSentences(line))
    .filter((line) => line && !looksLikeCostCopy(line))
    .join("\n")
    .trim();
  return kept || null;
}
