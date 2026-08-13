import { describe, expect, it } from "vitest";
import {
  FIRE_H,
  FIRE_W,
  RAIL_MOUTHS,
  allocFireBuf,
  makeBunsenPalette,
  stepFire,
} from "./fireSim";

function rngSeq(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s & 0xffff) / 0xffff;
  };
}

describe("bunsen fire buffer", () => {
  it("keeps a Bunsen palette: blue base, amber body, white tip", () => {
    const p = makeBunsenPalette();
    const blue = 48 * 4;
    const amber = 150 * 4;
    const tip = 240 * 4;
    expect(p[blue + 2]).toBeGreaterThan(p[blue]);
    expect(p[amber]).toBeGreaterThan(p[amber + 2]);
    expect(p[tip]).toBeGreaterThan(240);
    expect(p[tip + 1]).toBeGreaterThan(240);
  });

  it("seeds a center column, not a full-width campfire bed", () => {
    const buf = allocFireBuf();
    const rng = rngSeq(3);
    for (let i = 0; i < 12; i++) stepFire(buf, rng, 1);
    const bottom = FIRE_H - 1;
    const cx = (FIRE_W / 2) | 0;
    const center = buf[bottom * FIRE_W + cx];
    const edge = buf[bottom * FIRE_W + 2];
    expect(center).toBeGreaterThan(120);
    expect(center).toBeGreaterThan(edge + 40);
  });

  it("cools edges so heat rises as a cone", () => {
    const buf = allocFireBuf();
    const rng = rngSeq(11);
    for (let i = 0; i < 24; i++) stepFire(buf, rng, 1);
    const midY = (FIRE_H * 0.72) | 0;
    const cx = (FIRE_W / 2) | 0;
    const core = buf[midY * FIRE_W + cx];
    const wing = buf[midY * FIRE_W + 8];
    expect(core).toBeGreaterThan(0);
    expect(core).toBeGreaterThan(wing);
  });

  it("rail mouths seed three lab jets, not a continuous bed", () => {
    const buf = allocFireBuf();
    const rng = rngSeq(5);
    for (let i = 0; i < 10; i++) stepFire(buf, rng, 1, RAIL_MOUTHS);
    const bottom = FIRE_H - 1;
    const midJet = buf[bottom * FIRE_W + RAIL_MOUTHS[1]];
    const between = buf[bottom * FIRE_W + 33];
    expect(midJet).toBeGreaterThan(120);
    expect(midJet).toBeGreaterThan(between);
  });
});
