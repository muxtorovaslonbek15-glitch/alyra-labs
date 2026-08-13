/** Classic upward-scroll fire buffer, seeded as a narrow Bunsen column. */

export const FIRE_W = 96;
export const FIRE_H = 52;

const CX = (FIRE_W / 2) | 0;
/** Half-width of one jet mouth in buffer cells. */
const MOUTH = 5;
/** Three jets along a full-width lab rail (not a campfire bed). */
export const RAIL_MOUTHS = [18, CX, 78] as const;

export function makeBunsenPalette(): Uint8ClampedArray {
  const p = new Uint8ClampedArray(256 * 4);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let r = 0;
    let g = 0;
    let b = 0;
    let a = 0;
    if (t < 0.07) {
      a = 0;
    } else if (t < 0.2) {
      const u = (t - 0.07) / 0.13;
      r = 22 + u * 18;
      g = 72 + u * 70;
      b = 196 + u * 48;
      a = 50 + u * 130;
    } else if (t < 0.38) {
      const u = (t - 0.2) / 0.18;
      r = 48 + u * 90;
      g = 140 + u * 55;
      b = 232 - u * 70;
      a = 180 + u * 40;
    } else if (t < 0.58) {
      const u = (t - 0.38) / 0.2;
      // lab-amber → luminous yellow
      r = 184 + u * 62;
      g = 149 + u * 70;
      b = 108 - u * 40;
      a = 220;
    } else if (t < 0.8) {
      const u = (t - 0.58) / 0.22;
      r = 255;
      g = 224 + u * 22;
      b = 150 + u * 70;
      a = 235;
    } else {
      const u = (t - 0.8) / 0.2;
      r = 255;
      g = 250;
      b = 232 + u * 18;
      a = 230 - u * 90;
    }
    const o = i * 4;
    p[o] = r;
    p[o + 1] = g;
    p[o + 2] = b;
    p[o + 3] = a;
  }
  return p;
}

export function allocFireBuf(): Uint8Array {
  return new Uint8Array(FIRE_W * FIRE_H);
}

function nearestMouth(x: number, mouths: readonly number[]): number {
  let best = mouths[0] ?? CX;
  let d = Math.abs(x - best);
  for (let i = 1; i < mouths.length; i++) {
    const m = mouths[i]!;
    const nd = Math.abs(x - m);
    if (nd < d) {
      d = nd;
      best = m;
    }
  }
  return best;
}

/**
 * One simulation tick. Heat is injected at jet mouths; cells far from a
 * mouth cool fast so it reads as lab jets, not a campfire bed.
 */
export function stepFire(
  buf: Uint8Array,
  rng: () => number,
  intensity = 1,
  mouths: readonly number[] = [CX],
): void {
  const w = FIRE_W;
  const h = FIRE_H;
  const gain = 0.72 + intensity * 0.28;

  for (const mouth of mouths) {
    for (let x = mouth - MOUTH; x <= mouth + MOUTH; x++) {
      if (x < 1 || x > w - 2) continue;
      const falloff = 1 - Math.abs(x - mouth) / (MOUTH + 0.5);
      const spark = 168 + rng() * 88 * falloff * gain;
      buf[(h - 1) * w + x] = Math.min(255, spark);
      if (h > 2) {
        buf[(h - 2) * w + x] = Math.min(
          255,
          buf[(h - 2) * w + x] * 0.45 + spark * 0.55,
        );
      }
    }
    if (rng() > 0.72) {
      const side = mouth + (rng() > 0.5 ? -MOUTH - 1 : MOUTH + 1);
      if (side > 0 && side < w - 1) {
        buf[(h - 1) * w + side] = 90 + rng() * 70 * gain;
      }
    }
  }

  for (let y = 0; y < h - 2; y++) {
    for (let x = 1; x < w - 1; x++) {
      const below = (y + 1) * w;
      const avg =
        (buf[below + x - 1] +
          buf[below + x] +
          buf[below + x + 1] +
          buf[(y + 2) * w + x]) *
        0.25;
      const mouth = nearestMouth(x, mouths);
      const edge = Math.abs(x - mouth) / Math.max(8, w / (mouths.length * 2));
      const height = 1 - y / h;
      const cool = 1.08 + edge * 1.45 + height * 0.2;
      const decay = 1.1 + rng() * 0.5;
      buf[y * w + x] = Math.max(0, Math.min(255, (avg / cool) * gain - decay));
    }
  }
}

export function blitFire(
  image: ImageData,
  buf: Uint8Array,
  palette: Uint8ClampedArray,
): void {
  const { data, width, height } = image;
  const w = FIRE_W;
  const h = FIRE_H;
  for (let y = 0; y < height; y++) {
    const sy = Math.min(h - 1, ((y * h) / height) | 0);
    for (let x = 0; x < width; x++) {
      const sx = Math.min(w - 1, ((x * w) / width) | 0);
      const heat = buf[sy * w + sx];
      const po = heat * 4;
      const o = (y * width + x) * 4;
      data[o] = palette[po];
      data[o + 1] = palette[po + 1];
      data[o + 2] = palette[po + 2];
      data[o + 3] = palette[po + 3];
    }
  }
}

/** Wide rail envelope — flames stay in the lower card, not a fireworks bloom. */
export function flameRailEnvelope(width: number, height: number): Path2D {
  const p = new Path2D();
  const base = height * 0.98;
  p.moveTo(width * 0.02, base);
  p.bezierCurveTo(
    width * 0.08,
    height * 0.42,
    width * 0.18,
    height * 0.08,
    width * 0.28,
    height * 0.22,
  );
  p.bezierCurveTo(
    width * 0.4,
    height * -0.02,
    width * 0.6,
    height * -0.02,
    width * 0.72,
    height * 0.22,
  );
  p.bezierCurveTo(
    width * 0.82,
    height * 0.08,
    width * 0.92,
    height * 0.42,
    width * 0.98,
    base,
  );
  p.closePath();
  return p;
}
