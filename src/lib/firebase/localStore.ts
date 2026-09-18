"use client";

/**
 * Ro'yxatdan o'tish olib tashlangani uchun Market (formulalar, panel-study,
 * baholar) Firestore o'rniga shu brauzerning localStorage'ida saqlanadi.
 * Bu yerda faqat oddiy o'qish/yozish yordamchilari bor.
 */

export function readCollection<T>(key: string): Record<string, T> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    const data = JSON.parse(raw) as Record<string, T>;
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

export function writeCollection<T>(key: string, rows: Record<string, T>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(rows));
  } catch {
    /* localStorage to'lgan / o'chirilgan bo'lishi mumkin */
  }
}

export function newLocalId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID().slice(0, 12)}`;
  }
  return `${prefix}_${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}
