/**
 * Ro'yxatdan o'tish olib tashlandi — profil endi serverga emas,
 * faqat shu brauzerning localStorage'iga saqlanadi.
 * Eksportlar va tiplar o'zgarmadi, shuning uchun qolgan kod ishlashda davom etadi.
 */

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

const PROFILE_KEY = "alyra-local-profile";

function emptyProfile(email = ""): UserProfile {
  const now = Date.now();
  return {
    email,
    displayName: "",
    phone: "",
    gender: "",
    dob: "",
    address: "",
    pincode: "",
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
}

function readLocal(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<UserProfile>;
    return { ...emptyProfile(), ...data } as UserProfile;
  } catch {
    return null;
  }
}

function writeLocal(profile: UserProfile): UserProfile {
  if (typeof window === "undefined") return profile;
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    /* localStorage to'lgan / o'chirilgan bo'lishi mumkin */
  }
  return profile;
}

export async function getUserProfile(
  _uid: string,
  emailFallback = "",
): Promise<UserProfile | null> {
  const profile = readLocal();
  if (!profile) return null;
  if (!profile.email && emailFallback) {
    return { ...profile, email: emailFallback };
  }
  return profile;
}

export async function ensureUserProfile(
  _uid: string,
  email: string,
  _local?: { xp: number; discoveredIds: string[]; badgeIds: string[] },
  signup?: SignupProfileFields,
): Promise<UserProfile> {
  const current = readLocal() ?? emptyProfile(email);
  return writeLocal({
    ...current,
    email: email || current.email,
    displayName: signup?.displayName.trim() || current.displayName,
    phone: signup?.phone.trim() || current.phone,
    updatedAt: Date.now(),
  });
}

export async function updateUserProfile(
  _uid: string,
  input: ProfileInput,
): Promise<UserProfile> {
  const current = readLocal() ?? emptyProfile();
  return writeLocal({
    ...current,
    gender: input.gender,
    dob: input.dob,
    age: ageFromDob(input.dob),
    address: input.address.trim(),
    pincode: input.pincode.trim(),
    displayName: input.displayName?.trim() || current.displayName,
    phone: input.phone?.trim() || current.phone,
    updatedAt: Date.now(),
  });
}

/**
 * Bulutga sinxronizatsiya o'chirilgan — progress zustand `persist` orqali
 * allaqachon localStorage'da saqlanadi.
 */
export async function syncProgressToFirestore(
  _uid: string,
  progress: {
    xp: number;
    discoveredIds: string[];
    badgeIds: string[];
    completedPerfumeIds?: string[];
    starsDelta?: number;
  },
): Promise<void> {
  const current = readLocal();
  if (!current) return;
  writeLocal({
    ...current,
    xp: Math.max(current.xp, progress.xp),
    discoveredIds: Array.from(
      new Set([...current.discoveredIds, ...progress.discoveredIds]),
    ),
    badgeIds: Array.from(new Set([...current.badgeIds, ...progress.badgeIds])),
    completedPerfumeIds: Array.from(
      new Set([
        ...current.completedPerfumeIds,
        ...(progress.completedPerfumeIds ?? []),
      ]),
    ),
    updatedAt: Date.now(),
  });
}
