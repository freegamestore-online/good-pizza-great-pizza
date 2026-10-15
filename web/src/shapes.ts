import type kaplay from "kaplay";
type K = ReturnType<typeof kaplay>;

/**
 * KAPLAY's collision code (worldArea) only accepts Polygon and Rect shapes,
 * so a Circle passed to k.area({ shape }) throws as soon as the game checks
 * collisions. Approximate a circle with a polygon of the same radius.
 */
export function circleArea(k: K, radius: number, segments = 32) {
  const pts = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push(k.vec2(Math.cos(a) * radius, Math.sin(a) * radius));
  }
  return new k.Polygon(pts);
}
