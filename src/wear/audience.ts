/** Campaign query: `?audience=owner` Wear, `?audience=composer` Compose.
 * Bare `/lab` is Wear. `alyra.audience` is written on toggle, not a load gate. */

export type Audience = "owner" | "composer";

export const AUDIENCE_STORAGE_KEY = "alyra.audience";
export const WEAR_SKU_STORAGE_KEY = "alyra.wear.sku.v1";

export function parseAudienceParam(
  search: string | URLSearchParams,
): Audience | null {
  const params =
    typeof search === "string" ? new URLSearchParams(search) : search;
  const raw = params.get("audience");
  if (raw === "owner" || raw === "wear") return "owner";
  if (raw === "composer" || raw === "lab") return "composer";
  return null;
}

export function loadAudience(): Audience | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUDIENCE_STORAGE_KEY);
    if (raw === "owner" || raw === "composer") return raw;
  } catch {
    /* private mode */
  }
  return null;
}

export function saveAudience(audience: Audience): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AUDIENCE_STORAGE_KEY, audience);
  } catch {
    /* quota / private mode */
  }
}

/**
 * Query wins. Bare `/lab` (no `?audience=`) is Wear, even if Compose
 * was saved. Only `?audience=composer` opens Compose on load.
 */
export function resolveAudience(opts: {
  search?: string;
  stored?: Audience | null;
}): Audience {
  const fromQuery = opts.search ? parseAudienceParam(opts.search) : null;
  if (fromQuery) return fromQuery;
  void opts.stored;
  return "owner";
}
