import { describe, expect, it } from "vitest";
// Importing in a plain node environment is itself an invariant: orrery.ts
// must not touch the DOM at module scope (it only does so inside functions).
import {
  COMET,
  COMET_OFFSET_PATH,
  COMET_PERIOD,
  COMET_STOPS,
  cometKeyframesCSS,
  cometPosition,
  cometScrollValues,
  cometTable,
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

  it("rides the anchor 1:1 under reduced motion (no parallax)", () => {
    const y = 100;
    const f = frame({ y, reduced: true });
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

  it("climbs slower than the document while parallaxing", () => {
    const y = 200;
    const f = frame({ y });
    const p = y / DOCK_SCROLL;
    expect(orreryTargetY(f)).toBeCloseTo(
      ANCHOR_DOC + p * (DOCK - ANCHOR_DOC),
      10,
    );
    // parallax: the orrery has climbed less than the document scrolled
    expect(ANCHOR_DOC - orreryTargetY(f)).toBeLessThan(y);
  });

  it("falls back to a 1:1 ride when the page has no dock section", () => {
    const f = frame({ y: 250, dockTop: null });
    expect(orreryTargetY(f)).toBe(ANCHOR_DOC - 250);
    const past = frame({ y: 500, dockTop: null });
    expect(orreryTargetY(past)).toBe(Math.max(DOCK, ANCHOR_DOC - 500));
  });
});

describe("COMET elements", () => {
  it("matches the handoff's Keplerian elements", () => {
    expect(COMET.a).toBe(235);
    expect(COMET.b).toBe(131.15);
    expect(COMET.e).toBeCloseTo(195 / 235, 15);
    expect(COMET.tail).toBe(16);
  });

  it("derives the period from the mean-anomaly rate", () => {
    expect(COMET_PERIOD).toBeCloseTo((2 * Math.PI) / COMET.mRate, 9);
  });

  it("offset-path starts at perihelion, keeps the track radii, and closes", () => {
    expect(COMET_OFFSET_PATH.startsWith("M 460 500 A 235 131.15 ")).toBe(true);
    expect(COMET_OFFSET_PATH.endsWith("Z")).toBe(true);
    // the arc's endpoint sits on the ellipse, a hair from the start
    const m = COMET_OFFSET_PATH.match(/1 1 ([\d.]+) ([\d.]+) Z$/);
    expect(m).toBeTruthy();
    const [x, y] = [Number(m![1]), Number(m![2])];
    const eq = ((x - CENTER_X) / COMET.a) ** 2 + ((y - CENTER_Y) / COMET.b) ** 2;
    expect(Math.abs(eq - 1)).toBeLessThanOrEqual(1e-6);
    expect(Math.hypot(x - 460, y - 500)).toBeLessThanOrEqual(0.1);
    expect(Math.hypot(x - 460, y - 500)).toBeGreaterThan(0);
  });
});

describe("cometTable", () => {
  it("runs offset 0→1 strictly increasing at equal timeline steps", () => {
    expect(COMET_STOPS.length).toBe(49);
    expect(COMET_STOPS[0].t).toBe(0);
    expect(COMET_STOPS[0].offset).toBe(0);
    expect(COMET_STOPS[48].t).toBe(1);
    expect(COMET_STOPS[48].offset).toBeCloseTo(1, 9);
    for (let k = 1; k < COMET_STOPS.length; k++) {
      expect(COMET_STOPS[k].t).toBeCloseTo(k / 48, 12);
      expect(
        COMET_STOPS[k].offset,
        `stop ${k}: offset not increasing`,
      ).toBeGreaterThan(COMET_STOPS[k - 1].offset);
    }
  });

  it("unwraps the tail angle monotonically from 180 to 540", () => {
    expect(COMET_STOPS[0].angle).toBeCloseTo(180, 9);
    expect(COMET_STOPS[48].angle).toBeCloseTo(540, 9);
    for (let k = 1; k < COMET_STOPS.length; k++) {
      expect(
        COMET_STOPS[k].angle,
        `stop ${k}: angle not increasing`,
      ).toBeGreaterThan(COMET_STOPS[k - 1].angle);
    }
  });

  it("agrees with cometPosition on the anti-sunward direction at every stop", () => {
    for (const s of COMET_STOPS) {
      const { x, y } = cometPosition(s.t * COMET_PERIOD);
      const expected = (Math.atan2(y - 500, x - 500) * 180) / Math.PI;
      // compare mod 360: the table's angle is unwrapped
      const diff = (((s.angle - expected) % 360) + 540) % 360 - 180;
      expect(
        Math.abs(diff),
        `t=${s.t}: table angle ${s.angle} vs position angle ${expected}`,
      ).toBeLessThanOrEqual(1e-6);
    }
  });

  it("spaces offsets by arc length: fine-table deltas match the chords", () => {
    // Independent discretization: chords between successive positions on a
    // dense table approximate arcs, and both should be the same fraction of
    // an independently integrated perimeter.
    const fine = cometTable(480);
    let perimeter = 0;
    const STEPS = 1 << 16;
    let prev = Math.hypot(0, COMET.b);
    for (let i = 1; i <= STEPS; i++) {
      const E = (2 * Math.PI * i) / STEPS;
      const f = Math.hypot(COMET.a * Math.sin(E), COMET.b * Math.cos(E));
      perimeter += (((f + prev) / 2) * 2 * Math.PI) / STEPS;
      prev = f;
    }
    for (let k = 1; k < fine.length; k++) {
      const a = cometPosition(fine[k - 1].t * COMET_PERIOD);
      const b = cometPosition(fine[k].t * COMET_PERIOD);
      const chord = Math.hypot(b.x - a.x, b.y - a.y);
      const arc = (fine[k].offset - fine[k - 1].offset) * perimeter;
      expect(
        Math.abs(arc - chord) / Math.max(chord, 1e-6),
        `stop ${k}: arc ${arc} vs chord ${chord}`,
      ).toBeLessThanOrEqual(0.01);
    }
  });
});

describe("cometKeyframesCSS", () => {
  const css = cometKeyframesCSS(COMET_STOPS);

  it("emits both keyframe blocks with perihelion endpoints", () => {
    expect(css).toContain("@keyframes cometa-track{");
    expect(css).toContain("@keyframes cometa-tail{");
    expect(css).toContain("0.0000%{offset-distance:0.0000%}");
    expect(css).toContain("100.0000%{offset-distance:100.0000%}");
    expect(css).toContain("0.0000%{rotate:180.000deg}");
    expect(css).toContain("100.0000%{rotate:540.000deg}");
  });

  it("carries one stop per table entry in each block", () => {
    expect(css.match(/offset-distance:/g)?.length).toBe(COMET_STOPS.length);
    expect(css.match(/rotate:/g)?.length).toBe(COMET_STOPS.length);
  });
});

describe("cometScrollValues", () => {
  it("starts at perihelion and completes a period at 100%/+360°", () => {
    expect(cometScrollValues(0)).toEqual({ offset: 0, angle: 180 });
    const end = cometScrollValues(COMET_PERIOD);
    expect(end.offset).toBeCloseTo(100, 6);
    expect(end.angle).toBeCloseTo(540, 6);
  });

  it("grows without wrapping across period seams (transition-safe)", () => {
    let prevOffset = -1;
    let prevAngle = 179;
    for (let y = 0; y <= 3 * COMET_PERIOD; y += 7) {
      const { offset, angle } = cometScrollValues(y);
      expect(offset, `y=${y}: offset went backwards`).toBeGreaterThan(
        prevOffset,
      );
      expect(angle, `y=${y}: angle went backwards`).toBeGreaterThan(prevAngle);
      prevOffset = offset;
      prevAngle = angle;
    }
    expect(cometScrollValues(3 * COMET_PERIOD).offset).toBeCloseTo(300, 6);
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
