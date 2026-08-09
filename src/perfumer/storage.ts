import type { ChatSession } from "./types";

const STORAGE_KEY = "alyra-perfumer-chats-v1";

export interface LocalStore {
  version: 1;
  activeId: string | null;
  chats: ChatSession[];
}

function emptyStore(): LocalStore {
  return { version: 1, activeId: null, chats: [] };
}

export function loadLocalStore(): LocalStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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

export function saveLocalStore(store: LocalStore) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
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
