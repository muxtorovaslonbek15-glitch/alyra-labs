import { describe, expect, it } from "vitest";
import {
  composeOverlayOpen,
  costumeFadeClass,
  costumeLayoutClass,
  costumeLeftWidthVar,
} from "@/animation/CostumeLayer";

describe("costumeFadeClass", () => {
  it("is opacity classes only — no translate helper", () => {
    expect(costumeFadeClass(true)).toBe("lab-costume lab-costume-in");
    expect(costumeFadeClass(false)).toBe("lab-costume lab-costume-out");
    expect(costumeFadeClass(true)).not.toContain("crossfade");
  });

  it("keeps overlay extras so the incoming rail owns layout", () => {
    expect(costumeFadeClass(false, "pointer-events-none absolute inset-0")).toBe(
      "lab-costume lab-costume-out pointer-events-none absolute inset-0",
    );
  });
});

describe("costumeLayoutClass", () => {
  it("lets the active audience occupy flex; outgoing right rail overlays", () => {
    expect(costumeLayoutClass(true, "right")).toContain("md:shrink-0");
    expect(costumeLayoutClass(true, "right")).not.toContain("absolute");
    expect(costumeLayoutClass(false, "right")).toContain("md:absolute");
  });

  it("collapses the Oils rail in-flow so Wear → Compose does not jump the desk", () => {
    expect(costumeLayoutClass(true, "left")).toContain("lab-costume-left");
    expect(costumeLayoutClass(false, "left")).toContain("lab-costume-left");
    expect(costumeLayoutClass(false, "left")).not.toContain("absolute");
    expect(
      (costumeLeftWidthVar(true, true, 240) as Record<string, string>)[
        "--lab-costume-left-w"
      ],
    ).toBe("240px");
    expect(
      (costumeLeftWidthVar(false, true, 240) as Record<string, string>)[
        "--lab-costume-left-w"
      ],
    ).toBe("0px");
    expect(
      (costumeLeftWidthVar(true, false, 240) as Record<string, string>)[
        "--lab-costume-left-w"
      ],
    ).toBe("0px");
  });
});

describe("composeOverlayOpen", () => {
  it("keeps Compose overlays live until Wear costume owns the fade", () => {
    expect(composeOverlayOpen(false, true)).toBe(true);
    expect(composeOverlayOpen(true, true)).toBe(false);
    expect(composeOverlayOpen(false, false)).toBe(false);
  });
});
