import { describe, expect, it } from "vitest";
import { MOTION_MS } from "@/animation/motion";
import {
  SNAP_GAP_PX,
  SLOT_MOVE_MS,
  SLOT_ORIGIN_DESKTOP,
  SLOT_ORIGIN_PHONE,
  SLOT_ORIGIN_WEAR_PHONE,
  cardsOverlap,
  findFreeSlot,
  separateOverlappingPositions,
  slotInvertDelta,
  slotMoveNeeded,
  snapAlignPosition,
  stampSlotFrom,
  peekSlotFrom,
  takeSlotFrom,
  vesselCardMetrics,
  wearOnlyTins,
  VESSEL_CARD,
  VESSEL_CARD_PHONE_SCALE,
} from "@/desk/vesselLayout";

describe("snapAlignPosition", () => {
  it("aligns Y when cards are nearly in the same row", () => {
    const other = { x: 40, y: 80 };
    const pos = { x: 40 + VESSEL_CARD.width + 20, y: 80 + 12 };
    const snapped = snapAlignPosition(pos, [other]);
    expect(snapped).not.toBeNull();
    expect(snapped!.y).toBe(80);
  });

  it("parks beside a near-overlapping neighbor", () => {
    const other = { x: 100, y: 100 };
    const pos = { x: 120, y: 108 };
    const snapped = snapAlignPosition(pos, [other]);
    expect(snapped).not.toBeNull();
    expect(snapped!.x).toBe(100 + VESSEL_CARD.width + SNAP_GAP_PX);
    expect(snapped!.y).toBe(100);
  });

  it("returns null when nothing is nearby", () => {
    const snapped = snapAlignPosition({ x: 400, y: 400 }, [
      { x: 40, y: 40 },
    ]);
    expect(snapped).toBeNull();
  });

  it("uses phone card width when snapping on < md", () => {
    const phone = vesselCardMetrics(false);
    const other = { x: 8, y: 8 };
    const pos = { x: 20, y: 12 };
    const snapped = snapAlignPosition(pos, [other], phone);
    expect(snapped).not.toBeNull();
    expect(snapped!.x).toBe(8 + phone.width + SNAP_GAP_PX);
  });
});

describe("findFreeSlot", () => {
  const desktop = vesselCardMetrics(true);
  const phone = vesselCardMetrics(false);

  it("keeps preferred when the desk is empty", () => {
    expect(findFreeSlot([], { x: 140, y: 90 }, desktop)).toEqual({
      x: 140,
      y: 90,
    });
  });

  it("uses the desktop origin when no preferred is given", () => {
    expect(findFreeSlot([], undefined, desktop)).toEqual({
      x: SLOT_ORIGIN_DESKTOP.x,
      y: SLOT_ORIGIN_DESKTOP.y,
    });
  });

  it("never returns the same origin as an occupied card", () => {
    const occupied = [{ x: SLOT_ORIGIN_DESKTOP.x, y: SLOT_ORIGIN_DESKTOP.y }];
    const next = findFreeSlot(occupied, occupied[0], desktop);
    expect(next).not.toEqual(occupied[0]);
    expect(cardsOverlap(next, occupied[0], desktop)).toBe(false);
    expect(next.x).toBe(SLOT_ORIGIN_DESKTOP.x + desktop.width + SNAP_GAP_PX);
    expect(next.y).toBe(SLOT_ORIGIN_DESKTOP.y);
  });

  it("parks Wear tin beside a beaker at 140,90 (those rects overlap)", () => {
    const beaker = { x: 140, y: 90 };
    const wearTin = { x: SLOT_ORIGIN_DESKTOP.x, y: SLOT_ORIGIN_DESKTOP.y };
    expect(cardsOverlap(wearTin, beaker, desktop)).toBe(true);
    const next = findFreeSlot([beaker], wearTin, desktop);
    expect(cardsOverlap(next, beaker, desktop)).toBe(false);
  });

  it("uses phone 120px stride so three cards fit a 390px desk", () => {
    const occupied = [{ x: SLOT_ORIGIN_PHONE.x, y: SLOT_ORIGIN_PHONE.y }];
    const next = findFreeSlot(occupied, occupied[0], phone);
    expect(phone.width).toBe(120);
    expect(next.x).toBe(SLOT_ORIGIN_PHONE.x + phone.width + SNAP_GAP_PX);
    expect(next.y).toBe(SLOT_ORIGIN_PHONE.y);
    expect(cardsOverlap(next, occupied[0], phone)).toBe(false);
  });

  it("keeps Wear phone tin below compose slot origin so title can sit above", () => {
    expect(SLOT_ORIGIN_WEAR_PHONE.y).toBeGreaterThan(SLOT_ORIGIN_PHONE.y + 80);
    expect(SLOT_ORIGIN_WEAR_PHONE.x + phone.width).toBeLessThanOrEqual(390);
  });
});

describe("separateOverlappingPositions", () => {
  const desktop = vesselCardMetrics(true);
  const phone = vesselCardMetrics(false);

  it("returns null when cards already sit in a gapped row", () => {
    const a = { id: "a", position: { x: 48, y: 56 } };
    const b = {
      id: "b",
      position: { x: 48 + desktop.width + SNAP_GAP_PX, y: 56 },
    };
    expect(separateOverlappingPositions([a, b], desktop)).toBeNull();
  });

  it("nudges stacked Wear tin + beaker into a row with gap", () => {
    const beaker = { id: "beaker", position: { x: 48, y: 56 } };
    const tin = { id: "tin", position: { x: 56, y: 64 } };
    const next = separateOverlappingPositions([beaker, tin], desktop);
    expect(next).not.toBeNull();
    expect(cardsOverlap(next![0].position, next![1].position, desktop)).toBe(
      false,
    );
    const ys = next!.map((p) => p.position.y);
    expect(ys[0]).toBe(ys[1]);
    const xs = next!.map((p) => p.position.x).sort((a, b) => a - b);
    expect(xs[1] - xs[0]).toBe(desktop.width + SNAP_GAP_PX);
  });

  it("nudges overlapping phone cards using 120px width", () => {
    const a = { id: "a", position: { x: 8, y: 8 } };
    const b = { id: "b", position: { x: 8, y: 8 } };
    const next = separateOverlappingPositions([a, b], phone);
    expect(next).not.toBeNull();
    expect(cardsOverlap(next![0].position, next![1].position, phone)).toBe(
      false,
    );
    const xs = next!.map((p) => p.position.x).sort((x, y) => x - y);
    expect(xs[1] - xs[0]).toBe(phone.width + SNAP_GAP_PX);
  });
});

describe("slot place / nudge motion", () => {
  it("eases 180–220ms (not a teleport, not pour-lift)", () => {
    expect(SLOT_MOVE_MS).toBe(MOTION_MS.chrome);
    expect(SLOT_MOVE_MS).toBeGreaterThanOrEqual(180);
    expect(SLOT_MOVE_MS).toBeLessThanOrEqual(220);
  });

  it("inverts from overlapping origin so the card can ease into the free slot", () => {
    const desktop = vesselCardMetrics(true);
    const origin = { x: SLOT_ORIGIN_DESKTOP.x, y: SLOT_ORIGIN_DESKTOP.y };
    const to = findFreeSlot([origin], origin, desktop);
    expect(slotMoveNeeded(origin, to)).toBe(true);
    const delta = slotInvertDelta(origin, to);
    expect(delta.x + to.x).toBe(origin.x);
    expect(delta.y + to.y).toBe(origin.y);
  });

  it("stamps a from that peek does not consume", () => {
    const from = { x: 48, y: 56 };
    const to = { x: 240, y: 56 };
    stampSlotFrom("slot-test-a", from, to);
    expect(peekSlotFrom("slot-test-a")).toEqual(from);
    expect(peekSlotFrom("slot-test-a")).toEqual(from);
    expect(takeSlotFrom("slot-test-a")).toEqual(from);
    expect(takeSlotFrom("slot-test-a")).toBeUndefined();
  });

  it("does not stamp when from is already the free slot", () => {
    const pos = { x: 48, y: 56 };
    stampSlotFrom("slot-test-b", pos, pos);
    expect(takeSlotFrom("slot-test-b")).toBeUndefined();
  });
});

describe("vesselCardMetrics", () => {
  it("keeps desktop at 184px", () => {
    const desktop = vesselCardMetrics(true);
    expect(desktop.width).toBe(184);
    expect(desktop.scale).toBe(1);
    expect(desktop.glassH).toBe(VESSEL_CARD.glassH);
  });

  it("scales phone cards to 0.65 so three fit a 390px desk", () => {
    const phone = vesselCardMetrics(false);
    expect(phone.scale).toBe(VESSEL_CARD_PHONE_SCALE);
    expect(phone.width).toBe(120);
    expect(phone.height).toBe(156);
    expect(phone.glassH).toBe(98);
    expect(8 + phone.width * 3 + 8 * 2).toBeLessThanOrEqual(390);
  });
});

describe("wearOnlyTins", () => {
  it("drops chemist beakers so Wear never auto-shows leftover glass", () => {
    expect(
      wearOnlyTins([
        { equipmentId: "beaker" },
        { equipmentId: "tin" },
        { equipmentId: "flask" },
      ]),
    ).toEqual([{ equipmentId: "tin" }]);
    expect(wearOnlyTins([{ equipmentId: "beaker" }])).toEqual([]);
  });
});
