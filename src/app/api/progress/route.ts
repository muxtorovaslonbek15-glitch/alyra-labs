import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/server/firebaseAdmin";
import {
  enforceRateLimit,
  requireFirebaseUser,
} from "@/lib/server/requireAuth";
import {
  mergeInventions,
  mergeProgress,
  sanitizeInventionsInput,
  sanitizeProgressInput,
  type SanitizedInvention,
} from "@/lib/server/progressValidate";
import {
  isPerfumerLabConfigured,
  perfumerLab,
  type LabProfile,
} from "@/lib/server/perfumerLab";
import {
  dualWriteFirestore,
  firestoreUserToLab,
  labToFirestorePatch,
} from "@/lib/server/labMirror";

export const maxDuration = 15;

type ProgressFields = {
  xp: number;
  discoveredIds: string[];
  badgeIds: string[];
  completedPerfumeIds: string[];
  stars: number;
  lastDailyStarAt: number;
  unlockedShopItemIds: string[];
  inventions: SanitizedInvention[];
};

function fromLab(p: LabProfile | null): ProgressFields | null {
  if (!p) return null;
  return {
    xp: p.xp ?? 0,
    discoveredIds: p.discoveredIds ?? [],
    badgeIds: p.badgeIds ?? [],
    completedPerfumeIds: p.completedPerfumeIds ?? [],
    stars: p.stars ?? 0,
    lastDailyStarAt: p.lastDailyStarAt ?? 0,
    unlockedShopItemIds: p.unlockedShopItemIds ?? [],
    inventions: Array.isArray(p.inventions)
      ? (p.inventions as SanitizedInvention[])
      : [],
  };
}

async function loadExisting(
  req: Request,
  uid: string,
): Promise<ProgressFields | null> {
  if (isPerfumerLabConfigured()) {
    const remote = await perfumerLab<{
      xp?: number;
      discoveredIds?: string[];
      badgeIds?: string[];
      completedPerfumeIds?: string[];
      stars?: number;
      lastDailyStarAt?: number;
      unlockedShopItemIds?: string[];
      inventions?: unknown[];
      profile?: LabProfile;
    }>(req, "/lab/progress");
    if (remote.ok) {
      const p = remote.json.profile ?? remote.json;
      return fromLab(p);
    }
    if (remote.status === 404) {
      if (!isFirebaseAdminConfigured()) return null;
      const snap = await getAdminDb().collection("users").doc(uid).get();
      if (!snap.exists) return null;
      const fs = fromLab(firestoreUserToLab(uid, snap.data() ?? {}));
      if (fs) {
        await perfumerLab(req, "/lab/account", {
          method: "POST",
          body: JSON.stringify(firestoreUserToLab(uid, snap.data() ?? {})),
        });
      }
      return fs;
    }
    if (!remote.unavailable) return null;
  }

  if (!isFirebaseAdminConfigured()) return null;
  const snap = await getAdminDb().collection("users").doc(uid).get();
  if (!snap.exists) return null;
  return fromLab(firestoreUserToLab(uid, snap.data() ?? {}));
}

export async function POST(req: Request) {
  const auth = await requireFirebaseUser(req);
  if ("response" in auth) return auth.response;

  const limited = enforceRateLimit(req, auth.uid, "progress");
  if (limited) return limited.response;

  let body: {
    xp?: number;
    discoveredIds?: string[];
    badgeIds?: string[];
    completedPerfumeIds?: string[];
    starsDelta?: number;
    inventions?: unknown;
    inventionsOnly?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const inventionsOnly = Boolean(body.inventionsOnly);
  const sanitized = sanitizeProgressInput({
    xp: body.xp ?? 0,
    discoveredIds: body.discoveredIds ?? [],
    badgeIds: body.badgeIds ?? [],
    completedPerfumeIds: body.completedPerfumeIds,
    starsDelta: body.starsDelta,
    inventionsOnly,
  });
  if ("error" in sanitized) {
    return Response.json({ error: sanitized.error }, { status: 400 });
  }

  const inventionsSanitized = sanitizeInventionsInput(body.inventions);
  if ("error" in inventionsSanitized) {
    return Response.json({ error: inventionsSanitized.error }, { status: 400 });
  }

  const existing = await loadExisting(req, auth.uid);
  if (!existing) {
    return Response.json(
      { error: "Profile not found. Complete signup first." },
      { status: 404 },
    );
  }

  const { inventions, improveStarEligible } = mergeInventions(
    existing.inventions,
    inventionsSanitized,
  );

  const merged = mergeProgress(existing, sanitized, {
    improveStarEligible,
  });

  const next: ProgressFields = inventionsOnly
    ? {
        ...existing,
        stars: merged.stars,
        inventions,
      }
    : {
        ...existing,
        xp: merged.xp,
        discoveredIds: merged.discoveredIds,
        badgeIds: merged.badgeIds,
        completedPerfumeIds: merged.completedPerfumeIds,
        stars: merged.stars,
        inventions:
          inventionsSanitized.length > 0 ? inventions : existing.inventions,
      };

  if (isPerfumerLabConfigured()) {
    const remote = await perfumerLab(req, "/lab/progress", {
      method: "POST",
      body: JSON.stringify(next),
    });
    if (remote.ok) {
      const saved = fromLab(remote.json) ?? next;
      await dualWriteFirestore(auth.uid, labToFirestorePatch(saved));
      return Response.json({
        xp: inventionsOnly ? existing.xp : saved.xp,
        discoveredIds: inventionsOnly
          ? existing.discoveredIds
          : saved.discoveredIds,
        badgeIds: inventionsOnly ? existing.badgeIds : saved.badgeIds,
        completedPerfumeIds: inventionsOnly
          ? existing.completedPerfumeIds
          : saved.completedPerfumeIds,
        stars: saved.stars,
        starsGranted: merged.starsGranted,
        inventions: saved.inventions,
      });
    }
    if (!remote.unavailable) {
      return Response.json(
        { error: "Could not save progress" },
        { status: remote.status || 502 },
      );
    }
  }

  if (!isFirebaseAdminConfigured()) {
    return Response.json({ error: "Progress store unavailable" }, { status: 503 });
  }

  const update: Record<string, unknown> = {
    updatedAt: Date.now(),
    lastSeenAt: Date.now(),
    stars: next.stars,
    inventions: next.inventions,
  };
  if (!inventionsOnly) {
    update.xp = next.xp;
    update.discoveredIds = next.discoveredIds;
    update.badgeIds = next.badgeIds;
    update.completedPerfumeIds = next.completedPerfumeIds;
  }
  await getAdminDb().collection("users").doc(auth.uid).update(update);

  return Response.json({
    xp: inventionsOnly ? existing.xp : next.xp,
    discoveredIds: inventionsOnly
      ? existing.discoveredIds
      : next.discoveredIds,
    badgeIds: inventionsOnly ? existing.badgeIds : next.badgeIds,
    completedPerfumeIds: inventionsOnly
      ? existing.completedPerfumeIds
      : next.completedPerfumeIds,
    stars: next.stars,
    starsGranted: merged.starsGranted,
    inventions: next.inventions,
  });
}

export async function GET(req: Request) {
  const auth = await requireFirebaseUser(req);
  if ("response" in auth) return auth.response;

  const existing = await loadExisting(req, auth.uid);
  if (!existing) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  return Response.json({
    xp: existing.xp,
    discoveredIds: existing.discoveredIds,
    badgeIds: existing.badgeIds,
    completedPerfumeIds: existing.completedPerfumeIds,
    stars: existing.stars,
    lastDailyStarAt: existing.lastDailyStarAt,
    unlockedShopItemIds: existing.unlockedShopItemIds,
    inventions: existing.inventions,
  });
}
