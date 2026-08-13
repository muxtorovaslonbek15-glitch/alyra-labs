/**
 * Simple in-memory sliding window. Soft-launch OK (per-instance).
 * Replace with Upstash Redis when you need multi-instance accuracy.
 */

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSec: number };

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);

  if (bucket.timestamps.length >= limit) {
    const oldest = bucket.timestamps[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    buckets.set(key, bucket);
    return { ok: false, retryAfterSec };
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return { ok: true, remaining: limit - bucket.timestamps.length };
}

export const RATE_LIMITS = {
  explain: { limit: 30, windowMs: 60_000 },
  ocr: { limit: 10, windowMs: 60_000 },
  progress: { limit: 60, windowMs: 60_000 },
  profile: { limit: 30, windowMs: 60_000 },
  "daily-star": { limit: 20, windowMs: 60_000 },
  "stars-unlock": { limit: 30, windowMs: 60_000 },
  "study-rate": { limit: 20, windowMs: 60_000 },
  "ifra-check": { limit: 60, windowMs: 60_000 },
  waitlist: { limit: 8, windowMs: 60_000 },
} as const;
