import { describe, expect, it } from "vitest";
import gameSource from "./game.ts?raw";
import { circleArea } from "./shapes";

// Minimal stand-in for the KAPLAY context: only what circleArea touches.
class FakePolygon {
  constructor(public pts: { x: number; y: number }[]) {}
}
const fakeK = {
  Polygon: FakePolygon,
  vec2: (x: number, y: number) => ({ x, y }),
} as unknown as Parameters<typeof circleArea>[0];

describe("circleArea", () => {
  it("returns a polygon, the only curved-area shape KAPLAY's collisions accept", () => {
    expect(circleArea(fakeK, 68)).toBeInstanceOf(FakePolygon);
  });

  it("places every vertex on the circle at the requested radius", () => {
    const poly = circleArea(fakeK, 68) as unknown as FakePolygon;
    expect(poly.pts).toHaveLength(32);
    for (const { x, y } of poly.pts) {
      expect(Math.hypot(x, y)).toBeCloseTo(68, 6);
    }
  });

  it("is centred on the origin so it matches the dough's anchor", () => {
    const poly = circleArea(fakeK, 10, 4) as unknown as FakePolygon;
    const cx = poly.pts.reduce((s, p) => s + p.x, 0) / poly.pts.length;
    const cy = poly.pts.reduce((s, p) => s + p.y, 0) / poly.pts.length;
    expect(cx).toBeCloseTo(0, 6);
    expect(cy).toBeCloseTo(0, 6);
  });
});

describe("game area shapes", () => {
  it("never passes a Circle as an area shape (KAPLAY throws on it)", () => {
    expect(gameSource).not.toMatch(/area\(\{\s*shape:\s*new k\.Circle/);
  });
});
