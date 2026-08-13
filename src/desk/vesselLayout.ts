/** Shared vessel card geometry — keep layout, overlap, and pour streams in sync. */

import { MOTION_MS } from "@/animation/motion";

export const VESSEL_CARD = {
  /** Matches `w-[11.5rem]` on VesselSlot (11.5 * 16 = 184). Desktop only. */
  width: 184,
  /** Approximate card height including chrome + glass (actions live in bottom bar). */
  height: 240,
  /** Horizontal padding inside card before the SVG glass. */
  glassInsetX: 10,
  /** Offset from card top to the glass SVG. */
  glassTop: 36,
  /** Glass SVG render height in the slot. */
  glassH: 150,
} as const;

/**
 * Phone (`< md`) uniform scale vs desktop. 0.65 → 120×156px so 2–3 cards
 * sit on a 390px desk without overlapping. Card width is `vesselCardMetrics`;
 * glass / tin / cup-set are `w-full` so they shrink with the card.
 * snap / pour / place must use `vesselCardMetrics`, not `VESSEL_CARD` raw.
 */
export const VESSEL_CARD_PHONE_SCALE = 0.65;

export type VesselCardMetrics = {
  width: number;
  height: number;
  glassInsetX: number;
  glassTop: number;
  glassH: number;
  scale: number;
};

export function readMdUp(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(min-width: 768px)").matches
  );
}

export function vesselCardMetrics(mdUp: boolean): VesselCardMetrics {
  const scale = mdUp ? 1 : VESSEL_CARD_PHONE_SCALE;
  if (scale === 1) {
    return { ...VESSEL_CARD, scale: 1 };
  }
  return {
    width: Math.round(VESSEL_CARD.width * scale),
    height: Math.round(VESSEL_CARD.height * scale),
    glassInsetX: Math.round(VESSEL_CARD.glassInsetX * scale),
    glassTop: Math.round(VESSEL_CARD.glassTop * scale),
    glassH: Math.round(VESSEL_CARD.glassH * scale),
    scale,
  };
}

/** Layout metrics for the current viewport. Safe in store actions / drop handlers. */
export function currentVesselCard(): VesselCardMetrics {
  return vesselCardMetrics(readMdUp());
}

export const LAB_GLASS_FALLBACK = "var(--lab-glass, #c4b49a)";

/** How close edges must be to magnet into a tidy side-by-side / stacked layout. */
export const SNAP_EDGE_PX = 36;
/** How close axes must be to snap into the same row or column. */
export const SNAP_ALIGN_PX = 44;
/** Gap left between snapped cards. */
export const SNAP_GAP_PX = 8;
/**
 * Place / nudge-apart settle into a free slot.
 * Transform only (not pour-lift). DESIGN chrome 150–250ms.
 */
export const SLOT_MOVE_MS = MOTION_MS.chrome;

/** First-slot origin — desktop instrument bench. */
export const SLOT_ORIGIN_DESKTOP = { x: 48, y: 56 } as const;
/** First-slot origin — phone desk (120px cards). */
export const SLOT_ORIGIN_PHONE = { x: 8, y: 8 } as const;
/** Wear phone: tin under the SKU title, not jammed in the first compose slot. */
export const SLOT_ORIGIN_WEAR_PHONE = { x: 135, y: 132 } as const;

export type VesselPosition = { x: number; y: number };

/** True when a card should ease rather than sit still. */
export function slotMoveNeeded(
  from: VesselPosition,
  to: VesselPosition,
): boolean {
  return Math.abs(from.x - to.x) > 0.5 || Math.abs(from.y - to.y) > 0.5;
}

/** FLIP invert: paint at `from` while left/top already equal `to`. */
export function slotInvertDelta(
  from: VesselPosition,
  to: VesselPosition,
): VesselPosition {
  return { x: from.x - to.x, y: from.y - to.y };
}

/**
 * One-shot visual start for place / nudge. Store keeps `to` immediately so
 * sequential placeEquipment calls do not collide; VesselSlot eases from here.
 */
const pendingSlotFrom = new Map<string, VesselPosition>();

export function stampSlotFrom(
  id: string,
  from: VesselPosition,
  to: VesselPosition,
): void {
  if (slotMoveNeeded(from, to)) pendingSlotFrom.set(id, from);
  else pendingSlotFrom.delete(id);
}

export function peekSlotFrom(id: string): VesselPosition | undefined {
  return pendingSlotFrom.get(id);
}

export function clearSlotFrom(id: string): void {
  pendingSlotFrom.delete(id);
}

export function takeSlotFrom(id: string): VesselPosition | undefined {
  const from = pendingSlotFrom.get(id);
  if (from) pendingSlotFrom.delete(id);
  return from;
}

export function slotOrigin(card: VesselCardMetrics): VesselPosition {
  return card.scale < 1
    ? { x: SLOT_ORIGIN_PHONE.x, y: SLOT_ORIGIN_PHONE.y }
    : { x: SLOT_ORIGIN_DESKTOP.x, y: SLOT_ORIGIN_DESKTOP.y };
}

/**
 * True when two cards occupy the same origin or their rects would collide
 * (including the snap gap). Pour lift is a CSS transform — stored positions
 * must still stay non-overlapping except during the transfer window.
 */
export function cardsOverlap(
  a: VesselPosition,
  b: VesselPosition,
  card: Pick<VesselCardMetrics, "width" | "height">,
  gap = SNAP_GAP_PX,
): boolean {
  return (
    a.x < b.x + card.width + gap &&
    a.x + card.width + gap > b.x &&
    a.y < b.y + card.height + gap &&
    a.y + card.height + gap > b.y
  );
}

function slotStride(card: Pick<VesselCardMetrics, "width" | "height">) {
  return {
    x: card.width + SNAP_GAP_PX,
    y: card.height + SNAP_GAP_PX,
  };
}

function slotCols(card: VesselCardMetrics): number {
  return card.scale < 1 ? 3 : 4;
}

/**
 * Next empty desk slot. Never returns the same origin as an occupied card.
 * Preferred drop coords are kept when they do not collide; otherwise park
 * in a row to the right (wrap to the next row on phone's 3-col / desktop 4-col).
 */
export function findFreeSlot(
  occupied: VesselPosition[],
  preferred: VesselPosition | undefined,
  card: VesselCardMetrics,
): VesselPosition {
  const origin = slotOrigin(card);
  const candidate: VesselPosition = preferred
    ? { x: Math.max(8, preferred.x), y: Math.max(8, preferred.y) }
    : origin;

  const blocked = (pos: VesselPosition) =>
    occupied.some((o) => cardsOverlap(pos, o, card));

  if (!blocked(candidate)) return candidate;

  const stride = slotStride(card);
  const cols = slotCols(card);
  const maxX = origin.x + (cols - 1) * stride.x;

  const neighbors = occupied.filter((o) => cardsOverlap(candidate, o, card));
  if (neighbors.length > 0) {
    const anchor = neighbors.reduce((a, b) => (a.x >= b.x ? a : b));
    const toRight = { x: anchor.x + stride.x, y: anchor.y };
    if (toRight.x <= maxX + 0.5 && !blocked(toRight)) return toRight;
    const wrapped = { x: origin.x, y: anchor.y + stride.y };
    if (!blocked(wrapped)) return wrapped;
  }

  for (let i = 0; i < cols * 8; i++) {
    const pos = {
      x: origin.x + (i % cols) * stride.x,
      y: origin.y + Math.floor(i / cols) * stride.y,
    };
    if (!blocked(pos)) return pos;
  }

  const rightmost =
    occupied.length > 0
      ? occupied.reduce((a, b) => (a.x >= b.x ? a : b))
      : origin;
  return { x: rightmost.x + stride.x, y: rightmost.y };
}

export type PlacedVessel = { id: string; position: VesselPosition };

/**
 * If any pair overlaps, park later cards in a row with SNAP_GAP.
 * Returns null when the layout is already clear (no move).
 */
export function separateOverlappingPositions(
  items: PlacedVessel[],
  card: VesselCardMetrics,
): PlacedVessel[] | null {
  if (items.length < 2) return null;

  let anyOverlap = false;
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (cardsOverlap(items[i].position, items[j].position, card)) {
        anyOverlap = true;
        break;
      }
    }
    if (anyOverlap) break;
  }
  if (!anyOverlap) return null;

  const sorted = [...items].sort(
    (a, b) => a.position.y - b.position.y || a.position.x - b.position.x,
  );
  const resolved: PlacedVessel[] = [];
  for (const item of sorted) {
    resolved.push({
      id: item.id,
      position: findFreeSlot(
        resolved.map((r) => r.position),
        item.position,
        card,
      ),
    });
  }

  const byId = new Map(resolved.map((r) => [r.id, r.position]));
  const next = items.map((item) => ({
    id: item.id,
    position: byId.get(item.id) ?? item.position,
  }));
  const changed = next.some(
    (n, i) =>
      Math.abs(n.position.x - items[i].position.x) > 0.5 ||
      Math.abs(n.position.y - items[i].position.y) > 0.5,
  );
  return changed ? next : null;
}

/**
 * If `pos` is near another vessel, return a tidy snapped position (aligned row
 * or column with a small gap). Returns null when nothing is close enough.
 */
export function snapAlignPosition(
  pos: VesselPosition,
  others: VesselPosition[],
  card: { width: number; height: number } = VESSEL_CARD,
): VesselPosition | null {
  if (others.length === 0) return null;

  const w = card.width;
  const h = card.height;
  let bestScore = Infinity;
  let bestX = pos.x;
  let bestY = pos.y;
  let found = false;

  const consider = (x: number, y: number, score: number) => {
    if (score < bestScore) {
      bestScore = score;
      bestX = x;
      bestY = y;
      found = true;
    }
  };

  for (const other of others) {
    const dx = pos.x - other.x;
    const dy = pos.y - other.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    const overlapW =
      Math.min(pos.x + w, other.x + w) - Math.max(pos.x, other.x);
    const overlapH =
      Math.min(pos.y + h, other.y + h) - Math.max(pos.y, other.y);
    const messyOverlap = overlapW > w * 0.12 && overlapH > h * 0.12;

    // Soft axis align when roughly in the same row / column (not stacked on top)
    if (!messyOverlap) {
      if (absDy <= SNAP_ALIGN_PX && absDx < w * 2.2) {
        consider(pos.x, other.y, absDy + absDx * 0.05);
      }
      if (absDx <= SNAP_ALIGN_PX && absDy < h * 2.2) {
        consider(other.x, pos.y, absDx + absDy * 0.05);
      }
    }

    // Side-by-side: right of other
    const gapRight = pos.x - (other.x + w);
    if (
      Math.abs(gapRight - SNAP_GAP_PX) <= SNAP_EDGE_PX &&
      absDy <= SNAP_ALIGN_PX * 1.4
    ) {
      consider(
        other.x + w + SNAP_GAP_PX,
        other.y,
        Math.abs(gapRight - SNAP_GAP_PX) + absDy,
      );
    }
    // Side-by-side: left of other
    const gapLeft = other.x - (pos.x + w);
    if (
      Math.abs(gapLeft - SNAP_GAP_PX) <= SNAP_EDGE_PX &&
      absDy <= SNAP_ALIGN_PX * 1.4
    ) {
      consider(
        other.x - w - SNAP_GAP_PX,
        other.y,
        Math.abs(gapLeft - SNAP_GAP_PX) + absDy,
      );
    }
    // Stacked: below other
    const gapBelow = pos.y - (other.y + h);
    if (
      Math.abs(gapBelow - SNAP_GAP_PX) <= SNAP_EDGE_PX &&
      absDx <= SNAP_ALIGN_PX * 1.4
    ) {
      consider(
        other.x,
        other.y + h + SNAP_GAP_PX,
        Math.abs(gapBelow - SNAP_GAP_PX) + absDx,
      );
    }
    // Stacked: above other
    const gapAbove = other.y - (pos.y + h);
    if (
      Math.abs(gapAbove - SNAP_GAP_PX) <= SNAP_EDGE_PX &&
      absDx <= SNAP_ALIGN_PX * 1.4
    ) {
      consider(
        other.x,
        other.y - h - SNAP_GAP_PX,
        Math.abs(gapAbove - SNAP_GAP_PX) + absDx,
      );
    }

    // Near-overlap / proximity: park beside (or above/below) instead of leaving a mess
    const near =
      (overlapW > -SNAP_EDGE_PX && overlapH > h * 0.2) ||
      (overlapH > -SNAP_EDGE_PX && overlapW > w * 0.2);
    if (near) {
      if (absDx >= absDy) {
        const toRight = dx >= 0;
        consider(
          toRight ? other.x + w + SNAP_GAP_PX : other.x - w - SNAP_GAP_PX,
          other.y,
          (messyOverlap ? 0 : 4) + absDy * 0.5,
        );
      } else {
        const below = dy >= 0;
        consider(
          other.x,
          below ? other.y + h + SNAP_GAP_PX : other.y - h - SNAP_GAP_PX,
          (messyOverlap ? 0 : 4) + absDx * 0.5,
        );
      }
    }
  }

  if (!found) return null;
  if (Math.abs(bestX - pos.x) < 0.5 && Math.abs(bestY - pos.y) < 0.5) {
    return null;
  }
  return {
    x: Math.max(8, bestX),
    y: Math.max(8, bestY),
  };
}

/** Wear wood is a tin, never leftover chemist glass from Compose. */
export function wearOnlyTins<T extends { equipmentId: string }>(
  vessels: T[],
): T[] {
  return vessels.filter((v) => v.equipmentId === "tin");
}