import type { Invention } from "@/domains/chemistry/invention";

/**
 * Ro'yxatdan o'tish olib tashlangani uchun ixtirolar bulutga yuborilmaydi —
 * ular `inventionStore` orqali brauzerda saqlanadi.
 */
export async function syncInventionsToFirestore(
  _uid: string,
  _inventions: Invention[],
  _starsDelta = 0,
): Promise<{ stars?: number; starsGranted?: number } | void> {
  return;
}
