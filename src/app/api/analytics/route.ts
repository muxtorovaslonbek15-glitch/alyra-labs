import { ANALYTICS_EVENT_NAMES } from "@/lib/analytics/events";
import {
  logAnalyticsEvent,
  touchLastSeen,
} from "@/lib/server/analytics";
import { rateLimit } from "@/lib/server/rateLimit";
import {
  getAdminAuth,
  isFirebaseAdminConfigured,
} from "@/lib/server/firebaseAdmin";

export const maxDuration = 10;

function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

async function optionalUid(req: Request): Promise<string | null> {
  if (!isFirebaseAdminConfigured()) return null;
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(
      header.slice("Bearer ".length).trim(),
    );
    return decoded.uid;
  } catch {
    return null;
  }
}

const FORBIDDEN_PROP = /key|secret|token|phone|email|dob|address|gsk_/i;

function sanitizeProps(
  props: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!props || typeof props !== "object") return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props).slice(0, 20)) {
    if (FORBIDDEN_PROP.test(k)) continue;
    if (typeof v === "string" && /gsk_/i.test(v)) continue;
    if (typeof v === "string") out[k] = v.slice(0, 80);
    else if (typeof v === "number" || typeof v === "boolean") out[k] = v;
    else if (v == null) continue;
    else out[k] = String(v).slice(0, 80);
  }
  return out;
}

export async function POST(req: Request) {
  let body: {
    name?: string;
    path?: string;
    anonId?: string;
    props?: Record<string, unknown>;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.name || !ANALYTICS_EVENT_NAMES.has(body.name)) {
    return Response.json({ error: "Invalid event name" }, { status: 400 });
  }

  const uid = await optionalUid(req);
  const key = uid ?? body.anonId ?? clientIp(req);
  const limited = rateLimit(`analytics:${key}`, 120, 60_000);
  if (!limited.ok) {
    return Response.json(
      { error: "Too many events" },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  logAnalyticsEvent({
    name: body.name,
    uid,
    anonId: body.anonId ?? null,
    path: typeof body.path === "string" ? body.path.slice(0, 200) : undefined,
    props: sanitizeProps(
      body.props && typeof body.props === "object" ? body.props : undefined,
    ),
  });

  if (uid) void touchLastSeen(uid);

  return Response.json({ ok: true });
}
