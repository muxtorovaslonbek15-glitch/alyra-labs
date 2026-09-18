"use client";

const GUEST_KEY = "alyra-guest-id";

/** Brauzerga bog'liq doimiy anonim ID (faqat rate-limit uchun). */
function guestId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = window.localStorage.getItem(GUEST_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `guest-${Date.now()}`;
      window.localStorage.setItem(GUEST_KEY, id);
    }
    return id;
  } catch {
    return `guest-${Date.now()}`;
  }
}

/**
 * Ro'yxatdan o'tish olib tashlangani uchun Firebase ID token yo'q.
 * Har doim oddiy JSON header qaytadi — API chaqiruvlari mehmon sifatida ishlaydi.
 */
export async function getAuthHeaders(): Promise<
  Record<string, string> | null
> {
  return {
    "Content-Type": "application/json",
    "X-Guest-Id": guestId(),
  };
}
