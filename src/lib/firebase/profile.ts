import { getAuthHeaders } from "@/lib/client/authHeaders";
import type { DocumentData } from "firebase/firestore";

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

async function profileRequest(
  method: "GET" | "POST" | "PUT",
  body?: unknown,
): Promise<UserProfile> {
  const headers = await getAuthHeaders();
  if (!headers) throw new Error("Sign in required");
  const res = await fetch("/api/profile", {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = (await res.json().catch(() => ({}))) as DocumentData & {
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || `Profile ${method} failed (${res.status})`);
  }
  return fromDoc(data, typeof data.email === "string" ? data.email : "");
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
  _uid: string,
  emailFallback = "",
): Promise<UserProfile | null> {
  try {
    const profile = await profileRequest("GET");
    if (!profile.email && emailFallback) {
      return { ...profile, email: emailFallback };
    }
    return profile;
  } catch {
    return null;
  }
}

export async function ensureUserProfile(
  _uid: string,
  email: string,
  _local?: { xp: number; discoveredIds: string[]; badgeIds: string[] },
  signup?: SignupProfileFields,
): Promise<UserProfile> {
  return profileRequest("POST", {
    email,
    displayName: signup?.displayName.trim() || "",
    phone: signup?.phone.trim() || "",
  });
}

export async function updateUserProfile(
  _uid: string,
  input: ProfileInput,
): Promise<UserProfile> {
  return profileRequest("PUT", {
    gender: input.gender,
    dob: input.dob,
    address: input.address.trim(),
    pincode: input.pincode.trim(),
    displayName: input.displayName?.trim() || "",
    phone: input.phone?.trim() || "",
  });
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
