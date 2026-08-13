import { FieldValue } from "firebase-admin/firestore";
import {
  getAdminDb,
  isFirebaseAdminConfigured,
} from "@/lib/server/firebaseAdmin";
import { ANALYTICS_EVENT_NAMES } from "@/lib/analytics/events";

export type LlmRoute = "explain" | "ocr";

function dayKey(ts = Date.now()): string {
  return new Date(ts).toISOString().slice(0, 10);
}

/** Fire-and-forget LLM usage log. Never throws to callers. */
export function logLlmUsage(input: {
  uid: string;
  route: LlmRoute;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  ms?: number;
  ok: boolean;
}): void {
  if (!isFirebaseAdminConfigured()) return;
  const ts = Date.now();
  const promptTokens = Math.max(0, Math.floor(input.promptTokens ?? 0));
  const completionTokens = Math.max(0, Math.floor(input.completionTokens ?? 0));
  const totalTokens = Math.max(
    0,
    Math.floor(input.totalTokens ?? promptTokens + completionTokens),
  );

  void (async () => {
    try {
      const db = getAdminDb();
      await db.collection("llm_usage").add({
        uid: input.uid,
        route: input.route,
        model: input.model,
        promptTokens,
        completionTokens,
        totalTokens,
        ms: input.ms ?? null,
        ok: input.ok,
        ts,
      });

      const dailyRef = db.collection("metrics_daily").doc(dayKey(ts));
      const bumps: Record<string, FieldValue | number> = {
        totalTokens: FieldValue.increment(totalTokens),
        updatedAt: ts,
      };
      if (input.route === "explain") {
        bumps.explainCalls = FieldValue.increment(1);
      } else {
        bumps.ocrCalls = FieldValue.increment(1);
      }
      await dailyRef.set(bumps, { merge: true });
    } catch (err) {
      console.error("[analytics] llm_usage", err);
    }
  })();
}

/** Fire-and-forget product event. */
export function logAnalyticsEvent(input: {
  name: string;
  uid?: string | null;
  anonId?: string | null;
  path?: string;
  props?: Record<string, unknown>;
}): void {
  if (!isFirebaseAdminConfigured()) return;
  if (!ANALYTICS_EVENT_NAMES.has(input.name)) return;
  const ts = Date.now();

  void (async () => {
    try {
      const db = getAdminDb();
      await db.collection("analytics_events").add({
        name: input.name,
        uid: input.uid ?? null,
        anonId: input.anonId ?? null,
        path: input.path ?? null,
        props: input.props ?? {},
        ts,
      });

      const bumps: Record<string, FieldValue | number> = {
        clicks: FieldValue.increment(1),
        updatedAt: ts,
      };
      if (input.name === "signup_complete") {
        bumps.signups = FieldValue.increment(1);
      }
      await db.collection("metrics_daily").doc(dayKey(ts)).set(bumps, {
        merge: true,
      });
    } catch (err) {
      console.error("[analytics] event", err);
    }
  })();
}

export async function touchLastSeen(uid: string): Promise<void> {
  if (!isFirebaseAdminConfigured()) return;
  try {
    await getAdminDb().collection("users").doc(uid).set(
      { lastSeenAt: Date.now() },
      { merge: true },
    );
  } catch {
    /* best-effort Firestore mirror */
  }
}
