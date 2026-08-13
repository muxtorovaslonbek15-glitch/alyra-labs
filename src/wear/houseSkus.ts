/** Alyra house lineup - public alyra.in copy, not secret formulas. */

import { WEAR_SKU_STORAGE_KEY } from "./audience";

export type HouseSkuId =
  | "fruit-damour"
  | "riva-azul"
  | "ecos-de-lisboa"
  | "generic";

export type OccasionChip = "office" | "evening" | "wedding" | "skin";

export interface HouseSku {
  id: HouseSkuId;
  number: string;
  name: string;
  italic: string;
  tagline: string;
  mood: string[];
  notes: { top: string[]; heart: string[]; base: string[] };
  story: string;
  photo: string;
}

export const HOUSE_SKUS: Array<
  HouseSku & { id: Exclude<HouseSkuId, "generic"> }
> = [
  {
    id: "fruit-damour",
    number: "No. 01",
    name: "Fruit d’Amour",
    italic: "d’Amour",
    tagline: "Fruit of love · flirtatious · fruity-floral · warm",
    mood: ["Flirtatious", "Sweet", "Magnetic"],
    notes: {
      top: ["red berries", "mandarin", "saffron"],
      heart: ["rose", "ylang-ylang", "vanilla"],
      base: ["oud", "amber", "musk"],
    },
    story:
      "A first-blush kind of scent. Sun-warmed berries and mandarin spill into a rose-and-vanilla heart, then settle into warm amber, musk and a whisper of oud. Soft enough for daylight, magnetic enough to be remembered by.",
    photo: "https://www.alyra.in/assets/CHOOSE-FRUIT-BLACK-B2_mNJvT.jpg",
  },
  {
    id: "riva-azul",
    number: "No. 02",
    name: "Riva Azul",
    italic: "Azul",
    tagline: "Blue shore · fresh · citrus-aromatic · unisex",
    mood: ["Fresh", "Calm", "Effortless"],
    notes: {
      top: ["pepper", "mandarin", "bergamot"],
      heart: ["jasmine", "lavender"],
      base: ["cedarwood", "sandalwood"],
    },
    story:
      "The blue hour on a Mediterranean coast, pressed into balm. Bright bergamot and a flick of pepper drift over jasmine and calming lavender, settling into clean cedar and sandalwood. Clear, breezy and quietly confident.",
    photo: "https://www.alyra.in/assets/CHOOSE-RIVA-BLACK-DT1u46Ri.jpg",
  },
  {
    id: "ecos-de-lisboa",
    number: "No. 03",
    name: "Ecos de Lisboa",
    italic: "Lisboa",
    tagline: "Echoes of Lisbon · warm · woody-green · evening",
    mood: ["Grounded", "Earthy", "Magnetic"],
    notes: {
      top: ["grapefruit", "sage", "bergamot"],
      heart: ["nutmeg", "cypress", "rosemary"],
      base: ["sandalwood", "tonka bean", "oakmoss"],
    },
    story:
      "Terracotta rooftops at golden hour. Bright grapefruit and green sage drift over warm nutmeg and herbal cypress, settling into sandalwood, tonka and mossy depth. Sun-warmed stone, worn leather, the sea somewhere on the breeze.",
    photo: "https://www.alyra.in/assets/CHOOSE-ECOS-BLACK-BniLhJF5.jpg",
  },
];

export const GENERIC_SKU: HouseSku = {
  id: "generic",
  number: "Alyra",
  name: "Your compact",
  italic: "compact",
  tagline: "Fine perfume, in solid form",
  mood: ["Close", "Quiet", "Lasting"],
  notes: {
    top: ["brightness"],
    heart: ["the heart of the blend"],
    base: ["musk on skin"],
  },
  story:
    "Solid perfume is fine fragrance set into a balm. No alcohol, no spray, no spill. Never sharp, never loud. Press. Warm. Wear.",
  photo: "",
};

export const OCCASION_CHIPS: Array<{ id: OccasionChip; label: string }> = [
  { id: "office", label: "Office" },
  { id: "evening", label: "Evening" },
  { id: "wedding", label: "Wedding" },
  { id: "skin", label: "Just skin" },
];

export function getHouseSku(id: HouseSkuId | null | undefined): HouseSku {
  if (!id || id === "generic") return GENERIC_SKU;
  return HOUSE_SKUS.find((s) => s.id === id) ?? GENERIC_SKU;
}

export function loadWearSku(): HouseSkuId | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(WEAR_SKU_STORAGE_KEY);
    if (raw === "generic") {
      window.localStorage.removeItem(WEAR_SKU_STORAGE_KEY);
      return null;
    }
    if (
      raw === "fruit-damour" ||
      raw === "riva-azul" ||
      raw === "ecos-de-lisboa"
    ) {
      return raw;
    }
  } catch {
    /* private mode */
  }
  return null;
}

export function saveWearSku(id: HouseSkuId): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WEAR_SKU_STORAGE_KEY, id);
  } catch {
    /* quota */
  }
}

/** Back to the three-tin chooser. Clears memory so refresh does not skip it. */
export function clearWearSku(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(WEAR_SKU_STORAGE_KEY);
  } catch {
    /* private mode */
  }
}
