import {
  enforceRateLimit,
  requireFirebaseUser,
} from "@/lib/server/requireAuth";
import { isFirebaseAdminConfigured } from "@/lib/server/firebaseAdmin";
import {
  isPerfumerLabConfigured,
  perfumerLab,
  type LabProfile,
} from "@/lib/server/perfumerLab";
import {
  dualWriteFirestore,
  labToFirestorePatch,
  readFirestoreUser,
} from "@/lib/server/labMirror";
function ageFromDob(dob: string): number | undefined {
  if (!dob) return undefined;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return undefined;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? age : undefined;
}

export const maxDuration = 15;

type AccountBody = {
  email?: string;
  displayName?: string;
  phone?: string;
  gender?: string;
  dob?: string;
  address?: string;
  pincode?: string;
  ageBand?: string;
};

function profileFromJson(json: Record<string, unknown>): LabProfile | null {
  const profile = (json.profile ?? json) as LabProfile;
  if (!profile || typeof profile !== "object") return null;
  return profile;
}

async function seedMysqlFromFirestore(
  req: Request,
  uid: string,
  email: string,
): Promise<LabProfile | null> {
  const fsUser = await readFirestoreUser(uid);
  if (!fsUser) return null;
  const seeded = await perfumerLab(req, "/lab/account", {
    method: "POST",
    body: JSON.stringify({ ...fsUser, email: fsUser.email || email }),
  });
  if (!seeded.ok) return fsUser;
  return profileFromJson(seeded.json as Record<string, unknown>) ?? fsUser;
}

export async function GET(req: Request) {
  const auth = await requireFirebaseUser(req);
  if ("response" in auth) return auth.response;

  if (isPerfumerLabConfigured()) {
    const remote = await perfumerLab(req, "/lab/account");
    if (remote.ok) {
      const profile = profileFromJson(remote.json as Record<string, unknown>);
      if (profile) return Response.json(profile);
    }
    if (remote.status === 404 || remote.unavailable) {
      const seeded = await seedMysqlFromFirestore(
        req,
        auth.uid,
        auth.email ?? "",
      );
      if (seeded) return Response.json(seeded);
    }
    if (!remote.unavailable && remote.status !== 404) {
      return Response.json(
        { error: "Could not read profile" },
        { status: remote.status || 502 },
      );
    }
  }

  const fsUser = await readFirestoreUser(auth.uid);
  if (!fsUser) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(fsUser);
}

export async function POST(req: Request) {
  const auth = await requireFirebaseUser(req);
  if ("response" in auth) return auth.response;

  const limited = enforceRateLimit(req, auth.uid, "profile");
  if (limited) return limited.response;

  let body: AccountBody = {};
  try {
    body = (await req.json()) as AccountBody;
  } catch {
    body = {};
  }

  const now = Date.now();
  const email = (body.email || auth.email || "").trim();
  const payload: LabProfile = {
    uid: auth.uid,
    email,
    displayName: body.displayName?.trim() || "",
    phone: body.phone?.trim() || "",
    gender: body.gender || "",
    dob: body.dob || "",
    age: ageFromDob(body.dob || "") ?? null,
    address: body.address?.trim() || "",
    pincode: body.pincode?.trim() || "",
    ageBand: body.ageBand,
    createdAt: now,
    updatedAt: now,
    lastSeenAt: now,
  };

  let profile: LabProfile | null = null;
  if (isPerfumerLabConfigured()) {
    const remote = await perfumerLab(req, "/lab/account", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (remote.ok) {
      profile = profileFromJson(remote.json as Record<string, unknown>);
    } else if (!remote.unavailable && remote.status !== 404) {
      return Response.json(
        { error: "Could not save profile" },
        { status: remote.status || 502 },
      );
    }
  }

  if (!profile && isFirebaseAdminConfigured()) {
    const existing = await readFirestoreUser(auth.uid);
    profile = existing
      ? {
          ...existing,
          displayName: payload.displayName || existing.displayName,
          phone: payload.phone || existing.phone,
          email: existing.email || email,
          updatedAt: now,
        }
      : {
          ...payload,
          xp: 0,
          stars: 0,
          lastDailyStarAt: 0,
          discoveredIds: [],
          badgeIds: [],
          unlockedShopItemIds: [],
          completedPerfumeIds: [],
          inventions: [],
        };
  }

  if (!profile) {
    return Response.json({ error: "Profile store unavailable" }, { status: 503 });
  }

  await dualWriteFirestore(auth.uid, labToFirestorePatch(profile));
  return Response.json(profile);
}

export async function PUT(req: Request) {
  const auth = await requireFirebaseUser(req);
  if ("response" in auth) return auth.response;

  const limited = enforceRateLimit(req, auth.uid, "profile");
  if (limited) return limited.response;

  let body: AccountBody;
  try {
    body = (await req.json()) as AccountBody;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const age = ageFromDob(body.dob || "");
  const payload = {
    email: (body.email || auth.email || "").trim(),
    displayName: body.displayName?.trim() || "",
    phone: body.phone?.trim() || "",
    gender: body.gender || "",
    dob: body.dob || "",
    age: age ?? null,
    address: body.address?.trim() || "",
    pincode: body.pincode?.trim() || "",
    ageBand: body.ageBand,
  };

  let profile: LabProfile | null = null;
  if (isPerfumerLabConfigured()) {
    const remote = await perfumerLab(req, "/lab/account", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    if (remote.ok) {
      profile = profileFromJson(remote.json as Record<string, unknown>);
    } else if (remote.status === 404) {
      const created = await perfumerLab(req, "/lab/account", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (created.ok) {
        profile = profileFromJson(created.json as Record<string, unknown>);
      }
    } else if (!remote.unavailable) {
      return Response.json(
        { error: "Could not save profile" },
        { status: remote.status || 502 },
      );
    }
  }

  if (!profile) {
    const existing = await readFirestoreUser(auth.uid);
    if (!existing) {
      return Response.json({ error: "Profile not found" }, { status: 404 });
    }
    profile = { ...existing, ...payload, updatedAt: Date.now() };
  }

  await dualWriteFirestore(auth.uid, labToFirestorePatch(profile));
  return Response.json(profile);
}
