import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/server/firebaseAdmin";
import {
  enforceRateLimit,
  requireFirebaseUser,
} from "@/lib/server/requireAuth";
import { nextDailyClaimState } from "@/lib/stars/dailyStar";
import { MAX_STARS } from "@/lib/server/progressValidate";
import { isPerfumerLabConfigured, perfumerLab } from "@/lib/server/perfumerLab";
import { dualWriteFirestore, readFirestoreUser } from "@/lib/server/labMirror";

export const maxDuration = 15;

type ClaimResult = {
  granted: boolean;
  stars: number;
  lastDailyStarAt: number;
  nextClaimInMs: number;
};

async function claimOnFirestore(uid: string): Promise<
  | { missing: true }
  | ({ missing: false } & ClaimResult)
> {
  if (!isFirebaseAdminConfigured()) return { missing: true };
  const now = Date.now();
  const ref = getAdminDb().collection("users").doc(uid);
  return getAdminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return { missing: true as const };
    const data = snap.data() ?? {};
    const lastDailyStarAt =
      typeof data.lastDailyStarAt === "number" ? data.lastDailyStarAt : 0;
    const stars = typeof data.stars === "number" ? data.stars : 0;
    const claim = nextDailyClaimState(lastDailyStarAt, now);
    if (!claim.canClaim) {
      return {
        missing: false as const,
        granted: false,
        stars,
        lastDailyStarAt,
        nextClaimInMs: claim.nextClaimInMs,
      };
    }
    const nextStars = Math.min(MAX_STARS, stars + 1);
    tx.update(ref, {
      stars: nextStars,
      lastDailyStarAt: now,
      updatedAt: now,
      lastSeenAt: now,
    });
    return {
      missing: false as const,
      granted: true,
      stars: nextStars,
      lastDailyStarAt: now,
      nextClaimInMs: nextDailyClaimState(now, now).nextClaimInMs,
    };
  });
}

export async function POST(req: Request) {
  const auth = await requireFirebaseUser(req);
  if ("response" in auth) return auth.response;

  const limited = enforceRateLimit(req, auth.uid, "daily-star");
  if (limited) return limited.response;

  try {
    if (isPerfumerLabConfigured()) {
      const remote = await perfumerLab<{
        granted?: boolean;
        stars?: number;
        lastDailyStarAt?: number;
        nextClaimInMs?: number;
        message?: string;
      }>(req, "/lab/daily-star", {
        method: "POST",
        body: "{}",
      });
      if (remote.ok && typeof remote.json.stars === "number") {
        await dualWriteFirestore(auth.uid, {
          stars: remote.json.stars,
          lastDailyStarAt: remote.json.lastDailyStarAt ?? Date.now(),
          lastSeenAt: Date.now(),
        });
        return Response.json({
          granted: Boolean(remote.json.granted),
          stars: remote.json.stars,
          lastDailyStarAt: remote.json.lastDailyStarAt,
          nextClaimInMs: remote.json.nextClaimInMs,
          message: remote.json.message,
        });
      }
      if (remote.status === 404) {
        const fsUser = await readFirestoreUser(auth.uid);
        if (fsUser) {
          await perfumerLab(req, "/lab/account", {
            method: "POST",
            body: JSON.stringify(fsUser),
          });
          const retry = await perfumerLab<{
            granted?: boolean;
            stars?: number;
            lastDailyStarAt?: number;
            nextClaimInMs?: number;
            message?: string;
          }>(req, "/lab/daily-star", { method: "POST", body: "{}" });
          if (retry.ok && typeof retry.json.stars === "number") {
            await dualWriteFirestore(auth.uid, {
              stars: retry.json.stars,
              lastDailyStarAt: retry.json.lastDailyStarAt ?? Date.now(),
              lastSeenAt: Date.now(),
            });
            return Response.json({
              granted: Boolean(retry.json.granted),
              stars: retry.json.stars,
              lastDailyStarAt: retry.json.lastDailyStarAt,
              nextClaimInMs: retry.json.nextClaimInMs,
              message: retry.json.message,
            });
          }
        }
      }
      if (!remote.unavailable && remote.status !== 404) {
        return Response.json(
          { error: "Try again shortly" },
          { status: remote.status || 503 },
        );
      }
    }

    const result = await claimOnFirestore(auth.uid);
    if (result.missing) {
      return Response.json(
        { error: "Profile not found. Complete signup first." },
        { status: 404 },
      );
    }
    return Response.json({
      granted: result.granted,
      stars: result.stars,
      lastDailyStarAt: result.lastDailyStarAt,
      nextClaimInMs: result.nextClaimInMs,
      message: result.granted
        ? "Welcome back — +1★ for returning today."
        : "Already counted for today. Come back tomorrow.",
    });
  } catch {
    return Response.json({ error: "Try again shortly" }, { status: 503 });
  }
}

export async function GET(req: Request) {
  const auth = await requireFirebaseUser(req);
  if ("response" in auth) return auth.response;

  if (isPerfumerLabConfigured()) {
    const remote = await perfumerLab<{
      stars?: number;
      lastDailyStarAt?: number;
      canClaim?: boolean;
      nextClaimInMs?: number;
    }>(req, "/lab/daily-star");
    if (remote.ok) {
      return Response.json({
        stars: remote.json.stars ?? 0,
        lastDailyStarAt: remote.json.lastDailyStarAt ?? 0,
        canClaim: remote.json.canClaim,
        nextClaimInMs: remote.json.nextClaimInMs,
      });
    }
  }

  const fsUser = await readFirestoreUser(auth.uid);
  if (!fsUser) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  const now = Date.now();
  const lastDailyStarAt = fsUser.lastDailyStarAt ?? 0;
  const { canClaim, nextClaimInMs } = nextDailyClaimState(lastDailyStarAt, now);
  return Response.json({
    stars: fsUser.stars ?? 0,
    lastDailyStarAt,
    canClaim,
    nextClaimInMs,
  });
}
