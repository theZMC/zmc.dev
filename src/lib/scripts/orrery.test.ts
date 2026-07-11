import { describe, expect, it } from "vitest";
// Importing in a plain node environment is itself an invariant: orrery.ts
// must not touch the DOM at module scope (it only does so inside functions).
import {
  COMET,
  cometPosition,
  orreryTargetY,
  type OrreryFrame,
} from "./orrery";

/** Comet track ellipse in wrapper coords: center (695, 500), a=235, b=131.15. */
const CENTER_X = 695;
const CENTER_Y = 500;
const FOCUS = { x: 500, y: 500 };

describe("orreryTargetY", () => {
  /* A homepage-shaped scene in document coords: nav bottom at 70, hero
     anchor centred at 400, dock section top at 900 with a 70px scroll
     margin, so docking completes at scrollY 830. Viewport-relative inputs
     are derived from these for any given real scroll y. */
  const DOCK = 70;
  const ANCHOR_DOC = 400;
  const DOCK_SECTION_DOC = 900;
  const DOCK_MARGIN = 70;
  const DOCK_SCROLL = DOCK_SECTION_DOC - DOCK_MARGIN; // 830

  const frame = (over: Partial<OrreryFrame> = {}): OrreryFrame => {
    const y = over.y ?? 0;
    return {
      dock: DOCK,
      anchorCentre: ANCHOR_DOC - y,
      y,
      smoothY: y,
      dockTop: DOCK_SECTION_DOC - y,
      dockMargin: DOCK_MARGIN,
      reduced: false,
      ...over,
    };
  };

  it("returns the dock when the page has no hero anchor", () => {
    expect(orreryTargetY(frame({ anchorCentre: null, y: 0 }))).toBe(DOCK);
    expect(orreryTargetY(frame({ anchorCentre: null, y: 500 }))).toBe(DOCK);
  });

  it("rides the anchor 1:1 under reduced motion, ignoring the eased scroll", () => {
    const y = 100;
    const f = frame({ y, reduced: true, smoothY: 0 });
    expect(orreryTargetY(f)).toBe(ANCHOR_DOC - y);
  });

  it("clamps at the dock under reduced motion once the anchor passes it", () => {
    const y = ANCHOR_DOC; // anchor centre now at viewport 0, above the nav
    expect(orreryTargetY(frame({ y, reduced: true }))).toBe(DOCK);
  });

  it("starts on the anchor at rest and docks exactly at the dock scroll", () => {
    expect(orreryTargetY(frame({ y: 0 }))).toBe(ANCHOR_DOC);
    expect(orreryTargetY(frame({ y: DOCK_SCROLL }))).toBe(DOCK);
    expect(orreryTargetY(frame({ y: DOCK_SCROLL + 300 }))).toBe(DOCK);
  });

  it("descends monotonically from anchor to dock, never below the dock", () => {
    let prev = Number.POSITIVE_INFINITY;
    for (let y = 0; y <= DOCK_SCROLL + 200; y += 10) {
      const target = orreryTargetY(frame({ y }));
      expect(target, `y=${y}: rose from ${prev}`).toBeLessThanOrEqual(prev);
      expect(target, `y=${y}: sank below the dock`).toBeGreaterThanOrEqual(
        DOCK,
      );
      prev = target;
    }
  });

  it("climbs slower than the document while parallaxing (glide mid-flight)", () => {
    // Real scroll has jumped to 400; the eased value is still catching up.
    const f = frame({ y: 400, smoothY: 200 });
    const p = 200 / DOCK_SCROLL;
    expect(orreryTargetY(f)).toBeCloseTo(
      ANCHOR_DOC + p * (DOCK - ANCHOR_DOC),
      10,
    );
  });

  it("falls back to an eased 1:1 ride when the page has no dock section", () => {
    const f = frame({ y: 250, smoothY: 100, dockTop: null });
    expect(orreryTargetY(f)).toBe(ANCHOR_DOC - 100);
    const past = frame({ y: 500, smoothY: 480, dockTop: null });
    expect(orreryTargetY(past)).toBe(Math.max(DOCK, ANCHOR_DOC - 480));
  });
});

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
      const eq =
        ((x - CENTER_X) / COMET.a) ** 2 + ((y - CENTER_Y) / COMET.b) ** 2;
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
      ).toBeLessThanOrEqual(
        1e-9 * Math.hypot(sunward.x, sunward.y) * COMET.tail,
      );

      // …with positive dot product (points away from the sun, not toward it)
      const dot = tail.x * sunward.x + tail.y * sunward.y;
      expect(
        dot,
        `scrollY=${scrollY}: tail points sunward (dot=${dot})`,
      ).toBeGreaterThan(0);

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
