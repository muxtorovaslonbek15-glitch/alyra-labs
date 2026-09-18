import { rateLimit, RATE_LIMITS } from "./rateLimit";

export type AuthOk = { uid: string; email?: string };

export type AuthFail = {
  response: Response;
};

function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/** Faqat harf/raqam — header orqali kelgan qiymatni tozalaymiz. */
function safeGuestId(raw: string | null): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  return cleaned.length >= 6 ? cleaned : null;
}

/**
 * Ro'yxatdan o'tish tizimi olib tashlandi: endi bu funksiya hech kimni
 * rad etmaydi. Har bir tashrifchi mehmon (guest) ID oladi — u faqat
 * rate-limit va log uchun ishlatiladi.
 */
export async function requireFirebaseUser(
  req: Request,
): Promise<AuthOk | AuthFail> {
  const guest =
    safeGuestId(req.headers.get("x-guest-id")) ?? `ip-${clientIp(req)}`;
  return { uid: `guest:${guest}` };
}

export function enforceRateLimit(
  req: Request,
  uid: string,
  kind: keyof typeof RATE_LIMITS,
): AuthFail | null {
  const cfg = RATE_LIMITS[kind];
  const result = rateLimit(`${kind}:${uid}`, cfg.limit, cfg.windowMs);
  if (result.ok) return null;

  // Also touch IP bucket so anonymous scanners don't share one uid forever
  rateLimit(`${kind}:ip:${clientIp(req)}`, cfg.limit, cfg.windowMs);

  return {
    response: Response.json(
      {
        error: "Too many requests. Please wait a moment and try again.",
        code: "rate_limited",
      },
      {
        status: 429,
        headers: { "Retry-After": String(result.retryAfterSec) },
      },
    ),
  };
}
