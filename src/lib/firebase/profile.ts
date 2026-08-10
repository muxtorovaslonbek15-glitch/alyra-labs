import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  type DocumentData,
} from "firebase/firestore";
import { getFirebaseDb } from "./client";

export type Gender = "male" | "female" | "other" | "prefer_not_to_say";

export interface UserProfile {
  email: string;
  displayName?: string;
  phone?: string;
  gender: Gender | "";
  dob: string;
  age?: number;
  address: string;
  pincode: string;
  xp: number;
  discoveredIds: string[];
  badgeIds: string[];
  stars: number;
  lastDailyStarAt: number;
  unlockedShopItemIds: string[];
  completedPerfumeIds: string[];
  createdAt: number;
  updatedAt: number;
}

export type ProfileInput = {
  gender: Gender;
  dob: string;
  address: string;
  pincode: string;
  displayName?: string;
  phone?: string;
};

export type SignupProfileFields = {
  displayName: string;
  phone: string;
};

export function ageFromDob(dob: string): number | undefined {
  if (!dob) return undefined;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return undefined;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? age : undefined;
}

/**
 * Soft completeness for Settings / prompts — NOT a Lab or Chat gate.
 * Lab unlock = signed-in; Chat = signed-in + BYOK. Prefer ageBand over DOB in P1.
 */
export function isProfileComplete(profile: UserProfile | null | undefined): boolean {
  if (!profile) return false;
  return Boolean(
    profile.displayName?.trim() &&
      profile.phone &&
      profile.phone.replace(/\D/g, "").length >= 8 &&
      profile.gender &&
      profile.dob,
  );
}

function usersRef(uid: string) {
  return doc(getFirebaseDb(), "users", uid);
}

function fromDoc(data: DocumentData, emailFallback: string): UserProfile {
  return {
    email: typeof data.email === "string" ? data.email : emailFallback,
    displayName: typeof data.displayName === "string" ? data.displayName : undefined,
    phone: typeof data.phone === "string" ? data.phone : undefined,
    gender: (data.gender as Gender | "") || "",
    dob: typeof data.dob === "string" ? data.dob : "",
    age: typeof data.age === "number" ? data.age : ageFromDob(data.dob ?? ""),
    address: typeof data.address === "string" ? data.address : "",
    pincode: typeof data.pincode === "string" ? data.pincode : "",
    xp: typeof data.xp === "number" ? data.xp : 0,
    discoveredIds: Array.isArray(data.discoveredIds) ? data.discoveredIds : [],
    badgeIds: Array.isArray(data.badgeIds) ? data.badgeIds : [],
    stars: typeof data.stars === "number" ? data.stars : 0,
    lastDailyStarAt:
      typeof data.lastDailyStarAt === "number" ? data.lastDailyStarAt : 0,
    unlockedShopItemIds: Array.isArray(data.unlockedShopItemIds)
      ? data.unlockedShopItemIds
      : [],
    completedPerfumeIds: Array.isArray(data.completedPerfumeIds)
      ? data.completedPerfumeIds
      : [],
    createdAt: typeof data.createdAt === "number" ? data.createdAt : Date.now(),
    updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : Date.now(),
  };
}

export async function getUserProfile(
  uid: string,
  emailFallback = "",
): Promise<UserProfile | null> {
  const snap = await getDoc(usersRef(uid));
  if (!snap.exists()) return null;
  return fromDoc(snap.data(), emailFallback);
}

export async function ensureUserProfile(
  uid: string,
  email: string,
  _local?: { xp: number; discoveredIds: string[]; badgeIds: string[] },
  signup?: SignupProfileFields,
): Promise<UserProfile> {
  const existing = await getUserProfile(uid, email);
  if (existing) {
    const displayName =
      existing.displayName?.trim() || signup?.displayName.trim() || undefined;
    const phone = existing.phone?.trim() || signup?.phone.trim() || undefined;
    const needsMeta =
      (!existing.displayName && displayName) || (!existing.phone && phone);
    if (needsMeta) {
      const updatedAt = Date.now();
      await updateDoc(usersRef(uid), {
        ...(displayName ? { displayName } : {}),
        ...(phone ? { phone } : {}),
        updatedAt,
      });
      return {
        ...existing,
        displayName,
        phone,
        updatedAt,
      };
    }
    return existing;
  }

  const now = Date.now();
  const profile: UserProfile = {
    email,
    displayName: signup?.displayName.trim() || undefined,
    phone: signup?.phone.trim() || undefined,
    gender: "",
    dob: "",
    address: "",
    pincode: "",
    // Progress starts empty; merge guest XP via /api/progress (Admin).
    xp: 0,
    discoveredIds: [],
    badgeIds: [],
    stars: 0,
    lastDailyStarAt: 0,
    unlockedShopItemIds: [],
    completedPerfumeIds: [],
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(usersRef(uid), profile);
  return profile;
}

export async function updateUserProfile(
  uid: string,
  input: ProfileInput,
): Promise<UserProfile> {
  const age = ageFromDob(input.dob);
  const updatedAt = Date.now();
  const patch = {
    gender: input.gender,
    dob: input.dob,
    age: age ?? null,
    address: input.address.trim(),
    pincode: input.pincode.trim(),
    displayName: input.displayName?.trim() || null,
    phone: input.phone?.trim() || null,
    updatedAt,
  };
  await updateDoc(usersRef(uid), patch);
  const next = await getUserProfile(uid);
  if (!next) throw new Error("Profile missing after update");
  return next;
}

export async function syncProgressToFirestore(
  uid: string,
  progress: {
    xp: number;
    discoveredIds: string[];
    badgeIds: string[];
    completedPerfumeIds?: string[];
    starsDelta?: number;
  },
): Promise<void> {
  // Prefer server Admin path when running in the browser.
  if (typeof window !== "undefined") {
    const { getAuthHeaders } = await import("@/lib/client/authHeaders");
    const headers = await getAuthHeaders();
    if (!headers) return;
    const res = await fetch("/api/progress", {
      method: "POST",
      headers,
      body: JSON.stringify(progress),
    });
    if (!res.ok) {
      throw new Error(`Progress sync failed (${res.status})`);
    }
    return;
  }

  // Server-side fallback (should use Admin route instead).
  void uid;
  void progress;
  throw new Error("syncProgressToFirestore must be called from the client");
}
