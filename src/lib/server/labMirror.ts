/**
 * Dual-write helper: Perfumer MySQL is canonical; Firestore is the cutover mirror.
 */
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/server/firebaseAdmin";
import type { LabProfile } from "@/lib/server/perfumerLab";

export function firestoreUserToLab(
  uid: string,
  data: Record<string, unknown>,
): LabProfile {
  return {
    uid,
    email: typeof data.email === "string" ? data.email : "",
    displayName: typeof data.displayName === "string" ? data.displayName : "",
    phone: typeof data.phone === "string" ? data.phone : "",
    gender: typeof data.gender === "string" ? data.gender : "",
    dob: typeof data.dob === "string" ? data.dob : "",
    age: typeof data.age === "number" ? data.age : null,
    ageBand: typeof data.ageBand === "string" ? data.ageBand : "",
    address: typeof data.address === "string" ? data.address : "",
    pincode: typeof data.pincode === "string" ? data.pincode : "",
    xp: typeof data.xp === "number" ? data.xp : 0,
    stars: typeof data.stars === "number" ? data.stars : 0,
    lastDailyStarAt:
      typeof data.lastDailyStarAt === "number" ? data.lastDailyStarAt : 0,
    discoveredIds: Array.isArray(data.discoveredIds)
      ? (data.discoveredIds as string[])
      : [],
    badgeIds: Array.isArray(data.badgeIds) ? (data.badgeIds as string[]) : [],
    unlockedShopItemIds: Array.isArray(data.unlockedShopItemIds)
      ? (data.unlockedShopItemIds as string[])
      : [],
    completedPerfumeIds: Array.isArray(data.completedPerfumeIds)
      ? (data.completedPerfumeIds as string[])
      : [],
    inventions: Array.isArray(data.inventions) ? data.inventions : [],
    lastSeenAt: typeof data.lastSeenAt === "number" ? data.lastSeenAt : 0,
    createdAt: typeof data.createdAt === "number" ? data.createdAt : Date.now(),
    updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : Date.now(),
  };
}

export async function readFirestoreUser(
  uid: string,
): Promise<LabProfile | null> {
  if (!isFirebaseAdminConfigured()) return null;
  const snap = await getAdminDb().collection("users").doc(uid).get();
  if (!snap.exists) return null;
  return firestoreUserToLab(uid, snap.data() ?? {});
}

export async function dualWriteFirestore(
  uid: string,
  patch: Record<string, unknown>,
): Promise<void> {
  if (!isFirebaseAdminConfigured()) return;
  try {
    await getAdminDb()
      .collection("users")
      .doc(uid)
      .set({ ...patch, updatedAt: Date.now() }, { merge: true });
  } catch {
    /* best-effort mirror */
  }
}

export function labToFirestorePatch(profile: LabProfile): Record<string, unknown> {
  return {
    email: profile.email ?? "",
    displayName: profile.displayName || null,
    phone: profile.phone || null,
    gender: profile.gender ?? "",
    dob: profile.dob ?? "",
    age: profile.age ?? null,
    address: profile.address ?? "",
    pincode: profile.pincode ?? "",
    xp: profile.xp ?? 0,
    stars: profile.stars ?? 0,
    lastDailyStarAt: profile.lastDailyStarAt ?? 0,
    discoveredIds: profile.discoveredIds ?? [],
    badgeIds: profile.badgeIds ?? [],
    unlockedShopItemIds: profile.unlockedShopItemIds ?? [],
    completedPerfumeIds: profile.completedPerfumeIds ?? [],
    inventions: profile.inventions ?? [],
    lastSeenAt: profile.lastSeenAt ?? Date.now(),
    createdAt: profile.createdAt ?? Date.now(),
    updatedAt: profile.updatedAt ?? Date.now(),
  };
}
