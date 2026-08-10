import type { ChatSession } from "./types";

/** Per-UID local cache — never share one key across Firebase accounts. */
export const CHATS_STORAGE_PREFIX = "alyra.chats.v1.";
/** Pre-isolation key (shared across users on one browser) — ignored / cleared. */
export const LEGACY_CHATS_STORAGE_KEY = "alyra-perfumer-chats-v1";

export interface LocalStore {
  version: 1;
  activeId: string | null;
  chats: ChatSession[];
}

function emptyStore(): LocalStore {
  return { version: 1, activeId: null, chats: [] };
}

/** Sanitize uid for localStorage key segment. */
export function storageScope(uid: string | null | undefined): string {
  const raw = String(uid || "").trim();
  if (!raw) return "guest";
  return raw.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128);
}

export function chatsStorageKey(uid: string | null | undefined): string {
  return `${CHATS_STORAGE_PREFIX}${storageScope(uid)}`;
}

/** Drop the pre-isolation shared bucket so it cannot leak across accounts. */
export function clearLegacySharedChats(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LEGACY_CHATS_STORAGE_KEY);
  } catch {
    /* private mode */
  }
}

export function loadLocalStore(uid?: string | null): LocalStore {
  if (typeof window === "undefined") return emptyStore();
  clearLegacySharedChats();
  try {
    const raw = window.localStorage.getItem(chatsStorageKey(uid));
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as LocalStore;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.chats)) {
      return emptyStore();
    }
    return parsed;
  } catch {
    return emptyStore();
  }
}

export function saveLocalStore(store: LocalStore, uid?: string | null) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(chatsStorageKey(uid), JSON.stringify(store));
  } catch {
    /* quota / private mode */
  }
}

export function uid(prefix = "id") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function newLocalChat(title = "New chat"): ChatSession {
  const now = new Date().toISOString();
  return {
    id: uid("local"),
    serverId: null,
    title,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

/** Bootstrap an empty atelier for a scope (new user / guest). */
export function bootstrapLocalStore(): LocalStore {
  const fresh = newLocalChat();
  return { version: 1, activeId: fresh.id, chats: [fresh] };
}
