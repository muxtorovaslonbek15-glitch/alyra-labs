"use client";

import { create } from "zustand";
import {
  parseAudienceParam,
  saveAudience,
  type Audience,
} from "./audience";
import {
  clearWearSku,
  saveWearSku,
  type HouseSkuId,
  type OccasionChip,
} from "./houseSkus";
import type { WearCardPayload } from "./cannedCopy";
import type { WearLens } from "./wearLens";

export interface WearMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  card?: WearCardPayload;
  lens?: WearLens;
  /** Chip taps are a selector, not a transcript. */
  source?: "chip" | "typed";
}

interface WearState {
  audience: Audience;
  /** Unused. First visit is Wear; gate stays wired if something sets this. */
  chooserOpen: boolean;
  hydrated: boolean;
  skuId: HouseSkuId | null;
  /** True until a tin is picked this Wear visit. Not restored from storage. */
  skuChooserNeeded: boolean;
  occasion: OccasionChip | null;
  lastLenses: WearLens[];
  messages: WearMessage[];
  sheetOpen: boolean;
  askedPerfumer: boolean;

  hydrateFromWindow: () => void;
  setAudience: (audience: Audience, opts?: { persist?: boolean }) => void;
  dismissChooserAsComposer: () => void;
  setSku: (id: HouseSkuId) => void;
  /** Return to the three house tins without leaving Wear. */
  openSkuChooser: () => void;
  setOccasion: (chip: OccasionChip | null) => void;
  pushLens: (lens: WearLens) => void;
  addMessage: (msg: WearMessage) => void;
  /** One active occasion thread. Replaces prior chip cards. */
  setOccasionThread: (
    chip: OccasionChip,
    msgs: WearMessage[],
    lens: WearLens,
  ) => void;
  setSheetOpen: (open: boolean) => void;
  setAskedPerfumer: (asked: boolean) => void;
  resetWearSession: () => void;
}

function stripAudienceFromUrl() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("audience")) return;
  url.searchParams.delete("audience");
  const qs = url.searchParams.toString();
  const path = qs ? `${url.pathname}?${qs}` : url.pathname;
  window.history.replaceState(window.history.state, "", path);
}

/** Wear always opens on Which compact? Saved SKU is not restored. */
function wearChooserStart() {
  return {
    skuId: null as HouseSkuId | null,
    skuChooserNeeded: true,
    occasion: null as OccasionChip | null,
    lastLenses: [] as WearLens[],
    messages: [] as WearMessage[],
    askedPerfumer: false,
    sheetOpen: false,
  };
}

export const useWearStore = create<WearState>((set, get) => ({
  audience: "owner",
  chooserOpen: false,
  hydrated: false,
  skuId: null,
  skuChooserNeeded: true,
  occasion: null,
  lastLenses: [],
  messages: [],
  sheetOpen: false,
  askedPerfumer: false,

  hydrateFromWindow: () => {
    if (typeof window === "undefined") return;
    // One-shot: stripping ?audience=composer then remounting (Strict Mode)
    // must not treat the bare URL as Wear.
    if (get().hydrated) return;
    const fromQuery = parseAudienceParam(window.location.search);

    if (fromQuery === "composer") {
      saveAudience("composer");
      stripAudienceFromUrl();
      set({
        audience: "composer",
        chooserOpen: false,
        hydrated: true,
        skuId: null,
        skuChooserNeeded: false,
      });
      return;
    }

    if (fromQuery) stripAudienceFromUrl();
    saveAudience("owner");
    set({
      audience: "owner",
      chooserOpen: false,
      hydrated: true,
      ...wearChooserStart(),
    });
  },

  setAudience: (audience, opts) => {
    if (opts?.persist !== false) saveAudience(audience);
    if (audience === "owner") {
      set({
        audience,
        chooserOpen: false,
        ...wearChooserStart(),
      });
      return;
    }
    set({
      audience,
      chooserOpen: false,
      skuChooserNeeded: false,
    });
  },

  dismissChooserAsComposer: () => {
    saveAudience("composer");
    set({ audience: "composer", chooserOpen: false });
  },

  setSku: (id) => {
    saveWearSku(id);
    set({
      skuId: id,
      skuChooserNeeded: false,
      occasion: null,
      lastLenses: [],
      messages: [],
      askedPerfumer: false,
    });
  },

  openSkuChooser: () => {
    clearWearSku();
    set({
      skuId: null,
      skuChooserNeeded: true,
      occasion: null,
      lastLenses: [],
      messages: [],
      askedPerfumer: false,
      sheetOpen: false,
    });
  },

  setOccasion: (occasion) => set({ occasion }),

  pushLens: (lens) =>
    set((s) => ({ lastLenses: [...s.lastLenses.slice(-3), lens] })),

  addMessage: (msg) =>
    set((s) => ({ messages: [...s.messages, msg] })),

  setOccasionThread: (chip, msgs, lens) =>
    set({
      occasion: chip,
      lastLenses: [lens],
      messages: msgs,
    }),

  setSheetOpen: (sheetOpen) => set({ sheetOpen }),

  setAskedPerfumer: (askedPerfumer) => set({ askedPerfumer }),

  resetWearSession: () =>
    set({
      occasion: null,
      lastLenses: [],
      messages: [],
      askedPerfumer: false,
    }),
}));

export function isWearAudience(): boolean {
  return useWearStore.getState().audience === "owner";
}
