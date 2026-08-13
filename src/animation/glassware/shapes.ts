/** Shared SVG viewBox for all glassware: 0 0 100 140 */

export type GlassShapeId =
  | "beaker"
  | "flask"
  | "test-tube"
  | "graduated-cylinder"
  | "cup";

export interface GlassGeometry {
  id: GlassShapeId;
  /** Outer silhouette path (for stroke / fill of glass body) */
  outline: string;
  /** Interior well used as clipPath for liquid */
  well: string;
  /** Optional rim highlight path */
  rim: string;
  /** Optional graduation tick marks */
  ticks?: string;
  /** Left-wall refraction caustic */
  caustic: string;
  /** Lip / pour spout tip in local SVG coords (for stream origin) */
  lip: { x: number; y: number };
  /** Mouth center (smoke / pour target) */
  mouth: { x: number; y: number };
  /** Mouth ellipse radii — glass lip in slight perspective */
  mouthRx: number;
  mouthRy: number;
  /** Liquid well bounding box for fill math */
  wellBounds: { x: number; y: number; width: number; height: number };
  /** Optional foot ring under the glass */
  foot?: { cx: number; cy: number; rx: number; ry: number };
}

/**
 * Cup silhouette — keep paths aligned with `cupSet/cupGeometry.ts`.
 * Walls are thick enough to punch a see-through well (evenodd).
 */
export const GLASS_SHAPES: Record<GlassShapeId, GlassGeometry> = {
  beaker: {
    id: "beaker",
    outline:
      "M21 26 L20 114 Q20 128 34 128 L66 128 Q80 128 80 114 L79 30 L87 20 L85 17 L79 24 L21 24 Z",
    well: "M26 34 L25 112 Q25 122 34 122 L66 122 Q75 122 75 112 L74 34 Z",
    rim: "M21 24 L79 24 L87 20",
    ticks: "M28 52 H36 M28 72 H36 M28 92 H36 M28 110 H34",
    caustic: "M28 38 C29 72 29 98 27 114",
    lip: { x: 87, y: 18 },
    mouth: { x: 50, y: 24 },
    mouthRx: 29,
    mouthRy: 3.1,
    wellBounds: { x: 25, y: 34, width: 50, height: 88 },
    foot: { cx: 50, cy: 128, rx: 26, ry: 3.2 },
  },
  flask: {
    id: "flask",
    outline:
      "M42 16 L42 44 L22 114 Q20 128 34 128 L66 128 Q80 128 78 114 L58 44 L58 16 L61 14 L39 14 Z",
    well: "M45 24 L45 46 L28 112 Q27 122 36 122 L64 122 Q73 122 72 112 L55 46 L55 24 Z",
    rim: "M39 14 L61 14",
    caustic: "M46 28 L33 108",
    lip: { x: 61, y: 14 },
    mouth: { x: 50, y: 16 },
    mouthRx: 11,
    mouthRy: 2.4,
    wellBounds: { x: 28, y: 24, width: 44, height: 98 },
    foot: { cx: 50, cy: 128, rx: 24, ry: 3.2 },
  },
  "test-tube": {
    id: "test-tube",
    outline:
      "M39 14 L39 106 Q39 130 50 130 Q61 130 61 106 L61 14 L63 12 L37 12 Z",
    well: "M42 20 L42 106 Q42 124 50 124 Q58 124 58 106 L58 20 Z",
    rim: "M37 12 L63 12",
    caustic: "M44 24 L44 108",
    lip: { x: 63, y: 13 },
    mouth: { x: 50, y: 14 },
    mouthRx: 12.5,
    mouthRy: 2.2,
    wellBounds: { x: 42, y: 20, width: 16, height: 104 },
  },
  "graduated-cylinder": {
    id: "graduated-cylinder",
    outline:
      "M36 18 L36 116 Q36 128 50 128 Q64 128 64 116 L64 18 L70 10 L74 8 L26 8 L30 10 Z",
    well: "M40 22 L40 114 Q40 122 50 122 Q60 122 60 114 L60 22 Z",
    rim: "M26 8 L74 8",
    ticks: "M42 40 H50 M42 55 H52 M42 70 H50 M42 85 H52 M42 100 H50",
    caustic: "M43 28 L43 112",
    lip: { x: 74, y: 9 },
    mouth: { x: 50, y: 12 },
    mouthRx: 22,
    mouthRy: 2.6,
    wellBounds: { x: 40, y: 22, width: 20, height: 100 },
    foot: { cx: 50, cy: 128, rx: 16, ry: 2.8 },
  },
  cup: {
    id: "cup",
    outline:
      "M26 40 L30 118 Q30 126 38 126 L62 126 Q70 126 70 118 L74 40 Q74 34 68 34 L32 34 Q26 34 26 40 Z",
    well: "M30 42 L33 116 Q33 122 39 122 L61 122 Q67 122 67 116 L70 42 Z",
    rim: "M26 40 Q50 36 74 40",
    caustic: "M33 48 C34 78 34 104 35 116",
    lip: { x: 74, y: 40 },
    mouth: { x: 50, y: 40 },
    mouthRx: 24,
    mouthRy: 3.2,
    wellBounds: { x: 28, y: 44, width: 44, height: 76 },
    foot: { cx: 50, cy: 126, rx: 17, ry: 2.6 },
  },
};

/**
 * Scale an SVG path in viewBox units into 0–1 objectBoundingBox space.
 * Used to clip HTML (WebGL) to the well silhouette.
 */
export function pathToUnitBox(d: string, vbW = 100, vbH = 140): string {
  const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+/g);
  if (!tokens) return d;
  let cmd = "";
  let pairIsX = true;
  const out: string[] = [];
  for (const tok of tokens) {
    if (/^[A-Za-z]$/.test(tok)) {
      cmd = tok.toUpperCase();
      out.push(cmd);
      pairIsX = cmd !== "V";
      continue;
    }
    const n = Number(tok);
    if (cmd === "H") {
      out.push((n / vbW).toFixed(4));
    } else if (cmd === "V") {
      out.push((n / vbH).toFixed(4));
    } else {
      out.push((pairIsX ? n / vbW : n / vbH).toFixed(4));
      pairIsX = !pairIsX;
    }
  }
  return out.join(" ");
}

export function resolveGlassShape(equipmentId: string): GlassGeometry {
  if (equipmentId in GLASS_SHAPES) {
    return GLASS_SHAPES[equipmentId as GlassShapeId];
  }
  return GLASS_SHAPES.beaker;
}
