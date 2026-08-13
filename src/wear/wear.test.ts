import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AUDIENCE_STORAGE_KEY,
  parseAudienceParam,
  resolveAudience,
  WEAR_SKU_STORAGE_KEY,
} from "./audience";
import { copyLooksLikeCraft, buildWearCard } from "./cannedCopy";
import { clearWearSku, HOUSE_SKUS, loadWearSku, saveWearSku } from "./houseSkus";
import {
  cardKindForLens,
  inferLensFromText,
  pickWearLens,
} from "./wearLens";
import { replyToWearChip } from "./WearCompanion";
import { useWearStore } from "./wearStore";
import { useInterviewStore } from "@/perfumer/interview";

describe("audience", () => {
  it("parses campaign query", () => {
    expect(parseAudienceParam("?audience=owner")).toBe("owner");
    expect(parseAudienceParam("audience=composer")).toBe("composer");
    expect(parseAudienceParam("")).toBeNull();
  });

  it("bare /lab is Wear; composer query still wins", () => {
    expect(resolveAudience({})).toBe("owner");
    expect(resolveAudience({ stored: "composer" })).toBe("owner");
    expect(resolveAudience({ search: "?audience=owner" })).toBe("owner");
    expect(
      resolveAudience({ search: "?audience=composer", stored: "owner" }),
    ).toBe("composer");
  });
});

describe("wear lens", () => {
  it("does not repeat the same lens twice unless the user asked again", () => {
    const second = pickWearLens({
      chip: "wedding",
      lastLenses: ["occasion"],
    });
    expect(second).not.toBe("occasion");

    const sameQ = pickWearLens({
      text: "office wedding commute",
      lastLenses: ["occasion"],
    });
    expect(sameQ).toBe("occasion");
  });

  it("first reply is wear", () => {
    expect(
      pickWearLens({ chip: "wedding", firstReply: true, lastLenses: [] }),
    ).toBe("wear");
    expect(cardKindForLens("wear")).toBe("wear");
  });

  it("maps notes / layer / care from text", () => {
    expect(inferLensFromText("where is the musk")).toBe("notes");
    expect(inferLensFromText("can I layer a moisturizer")).toBe("layer");
    expect(inferLensFromText("will it melt in my bag")).toBe("care");
  });
});

describe("canned Wear copy", () => {
  it("never dumps Galaxolide, HHCB, IFRA, or wholesale ₹", () => {
    for (const sku of [...HOUSE_SKUS, { id: "generic" as const }]) {
      for (const kind of ["wear", "notes", "story", "layer"] as const) {
        const card = buildWearCard({
          skuId: sku.id,
          kind,
          lens: kind === "notes" ? "notes" : kind === "layer" ? "layer" : "wear",
          occasion: "wedding",
          now: new Date("2026-08-13T15:00:00"),
        });
        expect(copyLooksLikeCraft(card.body)).toBe(false);
        expect(card.body).not.toMatch(/Galaxolide/i);
        expect(card.body).not.toMatch(/HHCB/i);
      }
    }
  });

  it("leads WearCard with climate / heat", () => {
    const card = buildWearCard({
      skuId: "fruit-damour",
      kind: "wear",
      lens: "wear",
      occasion: "wedding",
      now: new Date("2026-08-13T15:00:00"),
    });
    expect(card.body.toLowerCase()).toMatch(/heat|humid|monsoon/);
  });
});

describe("Wear SKU back + occasion swap", () => {
  beforeEach(() => {
    useWearStore.setState({
      audience: "owner",
      hydrated: false,
      skuId: "fruit-damour",
      skuChooserNeeded: false,
      occasion: null,
      lastLenses: [],
      messages: [],
      askedPerfumer: false,
    });
    useInterviewStore.getState().reset();
  });

  it("reopens the three-tin chooser, clears sku memory, stays Wear", () => {
    useWearStore.setState({
      occasion: "office",
      messages: [
        {
          id: "chip-office",
          role: "assistant",
          content: "Office copy",
          source: "chip",
        },
      ],
    });
    useWearStore.getState().openSkuChooser();
    const s = useWearStore.getState();
    expect(s.skuChooserNeeded).toBe(true);
    expect(s.skuId).toBeNull();
    expect(s.audience).toBe("owner");
    expect(s.occasion).toBeNull();
    expect(s.messages).toEqual([]);
  });

  it("compose from chooser sets audience composer and does not save a generic sku", () => {
    const mem: Record<string, string> = {};
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => mem[k] ?? null,
        setItem: (k: string, v: string) => {
          mem[k] = v;
        },
        removeItem: (k: string) => {
          delete mem[k];
        },
      },
    });
    useWearStore.setState({
      audience: "owner",
      skuId: null,
      skuChooserNeeded: true,
    });
    useWearStore.getState().setAudience("composer");
    const s = useWearStore.getState();
    expect(s.audience).toBe("composer");
    expect(s.skuChooserNeeded).toBe(false);
    expect(s.skuId).toBeNull();
    expect(mem[WEAR_SKU_STORAGE_KEY]).toBeUndefined();
    vi.unstubAllGlobals();
  });

  it("treats a saved generic sku as no tin so the chooser returns", () => {
    const mem: Record<string, string> = { [WEAR_SKU_STORAGE_KEY]: "generic" };
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => mem[k] ?? null,
        setItem: (k: string, v: string) => {
          mem[k] = v;
        },
        removeItem: (k: string) => {
          delete mem[k];
        },
      },
    });
    expect(loadWearSku()).toBeNull();
    expect(mem[WEAR_SKU_STORAGE_KEY]).toBeUndefined();
    vi.unstubAllGlobals();
  });

  it("clears alyra.wear.sku.v1 so refresh shows the chooser", () => {
    const mem: Record<string, string> = {};
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => mem[k] ?? null,
        setItem: (k: string, v: string) => {
          mem[k] = v;
        },
        removeItem: (k: string) => {
          delete mem[k];
        },
      },
    });
    saveWearSku("fruit-damour");
    expect(mem[WEAR_SKU_STORAGE_KEY]).toBe("fruit-damour");
    clearWearSku();
    expect(mem[WEAR_SKU_STORAGE_KEY]).toBeUndefined();
    vi.unstubAllGlobals();
  });

  it("does not restore a saved SKU when Wear hydrates", () => {
    const mem: Record<string, string> = {
      [AUDIENCE_STORAGE_KEY]: "owner",
      [WEAR_SKU_STORAGE_KEY]: "fruit-damour",
    };
    const storage = {
      getItem: (k: string) => mem[k] ?? null,
      setItem: (k: string, v: string) => {
        mem[k] = v;
      },
      removeItem: (k: string) => {
        delete mem[k];
      },
    };
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("window", {
      location: { search: "", href: "http://localhost/lab", pathname: "/lab" },
      history: { replaceState: () => undefined, state: null },
      localStorage: storage,
    });
    useWearStore.getState().hydrateFromWindow();
    const s = useWearStore.getState();
    expect(s.audience).toBe("owner");
    expect(s.chooserOpen).toBe(false);
    expect(s.skuChooserNeeded).toBe(true);
    expect(s.skuId).toBeNull();
    vi.unstubAllGlobals();
  });

  it("query audience=owner still opens the chooser when a SKU is saved", () => {
    const mem: Record<string, string> = {
      [WEAR_SKU_STORAGE_KEY]: "riva-azul",
    };
    const loc = {
      search: "?audience=owner",
      href: "http://localhost/lab?audience=owner",
      pathname: "/lab",
    };
    const storage = {
      getItem: (k: string) => mem[k] ?? null,
      setItem: (k: string, v: string) => {
        mem[k] = v;
      },
      removeItem: (k: string) => {
        delete mem[k];
      },
    };
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("window", {
      location: loc,
      history: {
        state: null,
        replaceState: (_s: unknown, _t: string, url: string) => {
          loc.href = `http://localhost${url}`;
          loc.search = url.includes("?") ? `?${url.split("?")[1]}` : "";
        },
      },
      localStorage: storage,
    });
    useWearStore.getState().hydrateFromWindow();
    const s = useWearStore.getState();
    expect(s.audience).toBe("owner");
    expect(s.skuChooserNeeded).toBe(true);
    expect(s.skuId).toBeNull();
    vi.unstubAllGlobals();
  });

  it("query audience=composer still opens Compose", () => {
    const mem: Record<string, string> = {};
    const loc = {
      search: "?audience=composer",
      href: "http://localhost/lab?audience=composer",
      pathname: "/lab",
    };
    const storage = {
      getItem: (k: string) => mem[k] ?? null,
      setItem: (k: string, v: string) => {
        mem[k] = v;
      },
      removeItem: (k: string) => {
        delete mem[k];
      },
    };
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("window", {
      location: loc,
      history: {
        state: null,
        replaceState: (_s: unknown, _t: string, url: string) => {
          loc.href = `http://localhost${url}`;
          loc.search = url.includes("?") ? `?${url.split("?")[1]}` : "";
        },
      },
      localStorage: storage,
    });
    useWearStore.getState().hydrateFromWindow();
    const s = useWearStore.getState();
    expect(s.audience).toBe("composer");
    expect(s.skuChooserNeeded).toBe(false);
    expect(s.chooserOpen).toBe(false);
    useWearStore.getState().hydrateFromWindow();
    expect(useWearStore.getState().audience).toBe("composer");
    vi.unstubAllGlobals();
  });

  it("cold /lab with no audience memory opens Wear chooser, not the Labs gate", () => {
    const mem: Record<string, string> = {};
    const storage = {
      getItem: (k: string) => mem[k] ?? null,
      setItem: (k: string, v: string) => {
        mem[k] = v;
      },
      removeItem: (k: string) => {
        delete mem[k];
      },
    };
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("window", {
      location: { search: "", href: "http://localhost/lab", pathname: "/lab" },
      history: { replaceState: () => undefined, state: null },
      localStorage: storage,
    });
    useWearStore.getState().hydrateFromWindow();
    const s = useWearStore.getState();
    expect(s.audience).toBe("owner");
    expect(s.chooserOpen).toBe(false);
    expect(s.skuChooserNeeded).toBe(true);
    expect(s.skuId).toBeNull();
    expect(mem[AUDIENCE_STORAGE_KEY]).toBe("owner");
    vi.unstubAllGlobals();
  });

  it("bare /lab opens Wear even if Compose was saved", () => {
    const mem: Record<string, string> = {
      [AUDIENCE_STORAGE_KEY]: "composer",
      [WEAR_SKU_STORAGE_KEY]: "fruit-damour",
    };
    const storage = {
      getItem: (k: string) => mem[k] ?? null,
      setItem: (k: string, v: string) => {
        mem[k] = v;
      },
      removeItem: (k: string) => {
        delete mem[k];
      },
    };
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("window", {
      location: { search: "", href: "http://localhost/lab", pathname: "/lab" },
      history: { replaceState: () => undefined, state: null },
      localStorage: storage,
    });
    useWearStore.getState().hydrateFromWindow();
    const s = useWearStore.getState();
    expect(s.audience).toBe("owner");
    expect(s.skuChooserNeeded).toBe(true);
    expect(s.skuId).toBeNull();
    vi.unstubAllGlobals();
  });

  it("toggling Wear from Compose opens the chooser even with a sku in memory", () => {
    useWearStore.setState({
      audience: "composer",
      skuId: "fruit-damour",
      skuChooserNeeded: false,
    });
    useWearStore.getState().setAudience("owner");
    const s = useWearStore.getState();
    expect(s.audience).toBe("owner");
    expect(s.skuChooserNeeded).toBe(true);
    expect(s.skuId).toBeNull();
  });

  it("picking a tin leaves the chooser for the ritual", () => {
    useWearStore.setState({
      audience: "owner",
      skuId: null,
      skuChooserNeeded: true,
    });
    useWearStore.getState().setSku("fruit-damour");
    const s = useWearStore.getState();
    expect(s.skuChooserNeeded).toBe(false);
    expect(s.skuId).toBe("fruit-damour");
  });

  it("desk chips answer the occasion slot instead of stacking WearCards", () => {
    replyToWearChip("office");
    replyToWearChip("evening");
    expect(useWearStore.getState().occasion).toBe("evening");
    expect(useInterviewStore.getState().answers.occasion).toBe("evening");
    expect(useWearStore.getState().messages.some((m) => m.card)).toBe(false);
    expect(
      useInterviewStore.getState().messages.filter((m) => m.role === "user"),
    ).toHaveLength(2);
  });
});
