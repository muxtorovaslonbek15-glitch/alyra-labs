/**
 * Chemistry Next → Perfumer lab APIs (MySQL). Forwards the caller's Firebase token.
 * No MySQL credentials in this repo.
 */

export type LabProfile = {
  uid?: string;
  email?: string;
  displayName?: string;
  phone?: string;
  gender?: string;
  dob?: string;
  age?: number | null;
  ageBand?: string;
  address?: string;
  pincode?: string;
  xp?: number;
  stars?: number;
  lastDailyStarAt?: number;
  discoveredIds?: string[];
  badgeIds?: string[];
  unlockedShopItemIds?: string[];
  completedPerfumeIds?: string[];
  inventions?: unknown[];
  lastSeenAt?: number;
  createdAt?: number;
  updatedAt?: number;
};

export type PerfumerLabResult<T = Record<string, unknown>> = {
  ok: boolean;
  status: number;
  json: T;
  unavailable?: boolean;
};

function baseUrl(): string {
  return (
    process.env.PERFUMER_LAB_URL ||
    process.env.NEXT_PUBLIC_PERFUMER_API_URL ||
    process.env.NEXT_PUBLIC_ZPL_API_URL ||
    "http://localhost:3001/api/perfumer"
  ).replace(/\/$/, "");
}

export function isPerfumerLabConfigured(): boolean {
  return Boolean(
    process.env.PERFUMER_LAB_URL ||
      process.env.NEXT_PUBLIC_PERFUMER_API_URL ||
      process.env.NODE_ENV !== "production",
  );
}

export async function perfumerLab<T = Record<string, unknown>>(
  req: Request,
  path: string,
  init?: RequestInit,
): Promise<PerfumerLabResult<T>> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return { ok: false, status: 401, json: { error: "Sign in required" } as T };
  }
  const url = `${baseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: auth,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as T;
    return { ok: res.ok, status: res.status, json };
  } catch {
    return {
      ok: false,
      status: 503,
      unavailable: true,
      json: { error: "Perfumer lab API unreachable" } as T,
    };
  }
}
