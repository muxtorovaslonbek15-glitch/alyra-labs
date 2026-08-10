import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  CHATS_STORAGE_PREFIX,
  LEGACY_CHATS_STORAGE_KEY,
  bootstrapLocalStore,
  chatsStorageKey,
  clearLegacySharedChats,
  loadLocalStore,
  saveLocalStore,
  storageScope,
} from "./storage";

describe("perfumer chat local storage scoping", () => {
  const mem = new Map<string, string>();

  beforeEach(() => {
    mem.clear();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => mem.get(k) ?? null,
        setItem: (k: string, v: string) => {
          mem.set(k, v);
        },
        removeItem: (k: string) => {
          mem.delete(k);
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("scopes keys by uid", () => {
    expect(chatsStorageKey("uidA")).toBe(`${CHATS_STORAGE_PREFIX}uidA`);
    expect(chatsStorageKey("uidB")).toBe(`${CHATS_STORAGE_PREFIX}uidB`);
    expect(chatsStorageKey(null)).toBe(`${CHATS_STORAGE_PREFIX}guest`);
    expect(storageScope("ab/c!")).toBe("ab_c_");
  });

  it("keeps user A and user B caches isolated", () => {
    const a = bootstrapLocalStore();
    a.chats[0].title = "Alice scent";
    saveLocalStore(a, "alice");

    const b = bootstrapLocalStore();
    b.chats[0].title = "Bob scent";
    saveLocalStore(b, "bob");

    expect(loadLocalStore("alice").chats[0].title).toBe("Alice scent");
    expect(loadLocalStore("bob").chats[0].title).toBe("Bob scent");
    expect(loadLocalStore("carol").chats).toEqual([]);
  });

  it("clears legacy shared bucket so it cannot leak", () => {
    mem.set(LEGACY_CHATS_STORAGE_KEY, JSON.stringify({ leaked: true }));
    clearLegacySharedChats();
    expect(mem.has(LEGACY_CHATS_STORAGE_KEY)).toBe(false);
    // load also clears legacy
    mem.set(LEGACY_CHATS_STORAGE_KEY, "x");
    loadLocalStore("anyone");
    expect(mem.has(LEGACY_CHATS_STORAGE_KEY)).toBe(false);
  });
});
