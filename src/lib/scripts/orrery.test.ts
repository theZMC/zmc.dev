import { describe, expect, it } from "vitest";
// Importing in a plain node environment is itself an invariant: orrery.ts
// must not touch the DOM at module scope (it only does so inside functions).
import { COMET, cometPosition } from "./orrery";

/** Comet track ellipse in wrapper coords: center (695, 500), a=235, b=131.15. */
const CENTER_X = 695;
const CENTER_Y = 500;
const FOCUS = { x: 500, y: 500 };

describe("COMET elements", () => {
  it("matches the handoff's Keplerian elements", () => {
    expect(COMET.a).toBe(235);
    expect(COMET.b).toBe(131.15);
    expect(COMET.e).toBeCloseTo(195 / 235, 15);
    expect(COMET.tail).toBe(16);
  });
});

describe("cometPosition", () => {
  it("returns exactly the perihelion (460, 500) with tail to (444, 500) at scrollY = 0", () => {
    const p = cometPosition(0);
    expect(p.x).toBe(460);
    expect(p.y).toBe(500);
    expect(p.tailX).toBe(444);
    expect(p.tailY).toBe(500);
  });

  it("keeps the body on the track ellipse for a dense scroll range (|eq − 1| ≤ 1e-9)", () => {
    for (let scrollY = 0; scrollY <= 20000; scrollY += 37) {
      const { x, y } = cometPosition(scrollY);
      const eq = ((x - CENTER_X) / COMET.a) ** 2 + ((y - CENTER_Y) / COMET.b) ** 2;
      expect(
        Math.abs(eq - 1),
        `scrollY=${scrollY}: (x,y)=(${x},${y}) gives ellipse eq ${eq} (deviation ${eq - 1})`,
      ).toBeLessThanOrEqual(1e-9);
    }
  });

  it("keeps the tail at length COMET.tail and pointing anti-sunward for a dense scroll range", () => {
    for (let scrollY = 0; scrollY <= 20000; scrollY += 37) {
      const { x, y, tailX, tailY } = cometPosition(scrollY);
      const tail = { x: tailX - x, y: tailY - y };
      const sunward = { x: x - FOCUS.x, y: y - FOCUS.y };

      const tailLen = Math.hypot(tail.x, tail.y);
      expect(
        Math.abs(tailLen - COMET.tail),
        `scrollY=${scrollY}: tail length ${tailLen} ≠ ${COMET.tail}`,
      ).toBeLessThanOrEqual(1e-9);

      // (tail − body) parallel to (body − focus): zero cross product…
      const cross = tail.x * sunward.y - tail.y * sunward.x;
      expect(
        Math.abs(cross),
        `scrollY=${scrollY}: tail not collinear with the sun line (cross=${cross})`,
      ).toBeLessThanOrEqual(1e-9 * Math.hypot(sunward.x, sunward.y) * COMET.tail);

      // …with positive dot product (points away from the sun, not toward it)
      const dot = tail.x * sunward.x + tail.y * sunward.y;
      expect(dot, `scrollY=${scrollY}: tail points sunward (dot=${dot})`).toBeGreaterThan(0);

      // and therefore the tail tip is strictly farther from the focus than the body
      const bodyDist = Math.hypot(sunward.x, sunward.y);
      const tipDist = Math.hypot(tailX - FOCUS.x, tailY - FOCUS.y);
      expect(
        tipDist,
        `scrollY=${scrollY}: tail tip (${tipDist}) not farther from focus than body (${bodyDist})`,
      ).toBeGreaterThan(bodyDist);
    }
  });
});
