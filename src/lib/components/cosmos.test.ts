import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Invariant tests for the orrery chart (HANDOFF.md §2, §4.5, §5).
 *
 * These parse the component's TEXT — the SVG geometry is static markup, so
 * string parsing is enough and no DOM is needed. Every body must sit
 * mathematically on its declared path; a free-floating planet was a real bug.
 */
const source = readFileSync(new URL("./Cosmos.astro", import.meta.url), "utf8");

const SUN = { x: 500, y: 500 };

/** Parses `name="value"` attribute pairs out of a single tag's text. */
function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/([\w-]+)="([^"]*)"/g)) out[m[1]] = m[2];
  return out;
}

/** All <circle> tags (as attribute records) within a markup segment. */
function circles(segment: string): Record<string, string>[] {
  return [...segment.matchAll(/<circle\b[^>]*>/g)].map((m) => attrs(m[0]));
}

/** Circles that render a body (anything filled; rings are fill="none"). */
function bodies(segment: string): Record<string, string>[] {
  return circles(segment).filter((c) => c.fill && c.fill !== "none");
}

function distFromSun(c: Record<string, string>): number {
  return Math.hypot(Number(c.cx) - SUN.x, Number(c.cy) - SUN.y);
}

// ---------------------------------------------------------------------------
// Segment extraction: orbit groups appear in document order; the comet wrapper
// (static rotate(25 500 500) — argument of perihelion, not motion) follows the
// last one.
// ---------------------------------------------------------------------------
const groupOpenings = [...source.matchAll(/<g class="orbit-group"[^>]*>/g)];
const cometStart = source.indexOf('<g transform="rotate(25 500 500)">');
const groups = groupOpenings.map((m, i) => {
  const end = i + 1 < groupOpenings.length ? groupOpenings[i + 1].index : cometStart;
  return source.slice(m.index, end);
});
const cometSegment = source.slice(cometStart);

/** Ring radii for the circular orbit groups, by group index. */
const CIRCULAR_RINGS: Record<number, number> = {
  0: 72, // I
  1: 110, // II
  2: 152, // III
  3: 196, // IV
  4: 242, // V
  6: 356, // VI (circularized from the study's 360×352 ellipse: no wobble
  //             under rotation, body exactly on the stroke)
  7: 410, // VII
};

describe("orrery structure", () => {
  it("has exactly 8 orbit groups with the declared data-rate sequence", () => {
    const rates = groups.map((g) => attrs(g.match(/<g class="orbit-group"[^>]*>/)![0])["data-rate"]);
    expect(rates).toEqual(["0.10", "-0.078", "0.058", "-0.044", "0.033", "-0.020", "0.016", "-0.011"]);
  });

  it("gives every gap-ring geometry identical to its group's label path in <defs>", () => {
    const defsBlock = source.slice(source.indexOf("<defs>"), source.indexOf("</defs>"));
    const defPaths = new Map<string, string>(
      [...defsBlock.matchAll(/<path\b[^>]*>/g)].map((m) => {
        const a = attrs(m[0]);
        return [a.id, a.d];
      }),
    );

    const segments = [...groups, cometSegment];
    let checked = 0;
    for (const seg of segments) {
      const ringTag = seg.match(/<path\b[^>]*class="gap-ring"[^>]*>/)?.[0];
      if (!ringTag) continue; // the belt label floats between its boundary rings — no gap-ring
      const href = seg.match(/<textPath[^>]*href="#([\w-]+)"/)?.[1];
      expect(href, "gap-ring group is missing a textPath href").toBeTruthy();
      const defD = defPaths.get(href!);
      expect(defD, `no <defs> path with id="${href}"`).toBeTruthy();
      expect(attrs(ringTag).d, `gap-ring d diverges from #${href} — gaps would land in the wrong place`).toBe(defD);
      checked++;
    }
    expect(checked).toBe(8); // I–V, VI, VII + comet track
  });

  it("contains no decoration in the artwork: no radialGradient, feGaussianBlur, or drop-shadow", () => {
    for (const forbidden of ["radialGradient", "feGaussianBlur", "drop-shadow"]) {
      expect(source.includes(forbidden), `found forbidden "${forbidden}" in Cosmos.astro`).toBe(false);
    }
  });
});

describe("bodies sit on their declared paths", () => {
  it.each(Object.entries(CIRCULAR_RINGS).map(([i, r]) => [Number(i) + 1, r, Number(i)] as const))(
    "circular group %i: every body lies on r=%i within 1 percent",
    (_label, r, index) => {
      // Group III nests the moon-orbit; the moon rides its own ring, not the planet's.
      const seg = groups[index].replace(/<g class="moon-orbit"[\s\S]*?<\/g>/, "");
      const found = bodies(seg);
      expect(found.length).toBeGreaterThan(0);
      for (const c of found) {
        const d = distFromSun(c);
        const rel = Math.abs(d - r) / r;
        expect(
          rel,
          `body at (${c.cx},${c.cy}) sits at hypot=${d.toFixed(4)} vs ring r=${r} ` +
            `(deviation ${(rel * 100).toFixed(4)}%)`,
        ).toBeLessThanOrEqual(0.01);
      }
    },
  );

  it("group VII carries a planet and exactly two trojan dots, all on r=410", () => {
    const found = bodies(groups[7]);
    expect(found.length).toBe(3);
    const trojans = found.filter((c) => c.r === "1.2");
    expect(trojans.length, "expected the two 1.2-radius trojan dots").toBe(2);
    for (const c of found) {
      const d = distFromSun(c);
      expect(
        Math.abs(d - 410) / 410,
        `VII body (${c.cx},${c.cy}) at hypot=${d.toFixed(4)} off r=410`,
      ).toBeLessThanOrEqual(0.01);
    }
  });

  it("group III moon sits at distance 9 from (652,500) and the moon-orbit pivots there", () => {
    const moonOrbitTag = groups[2].match(/<g class="moon-orbit"[^>]*>/)?.[0];
    expect(moonOrbitTag).toBeTruthy();
    const mo = attrs(moonOrbitTag!);
    expect(mo["data-cx"]).toBe("652");
    expect(mo["data-cy"]).toBe("500");

    const moonSeg = groups[2].match(/<g class="moon-orbit"[\s\S]*?<\/g>/)![0];
    const moons = bodies(moonSeg);
    expect(moons.length).toBe(1);
    const d = Math.hypot(Number(moons[0].cx) - 652, Number(moons[0].cy) - 500);
    expect(d, `moon at (${moons[0].cx},${moons[0].cy}) is ${d} from (652,500), not 9`).toBeCloseTo(9, 9);
  });

  it("asteroid belt has 16 dots, all within the 286–302 band", () => {
    const dots = bodies(groups[5]);
    expect(dots.length).toBe(16);
    for (const c of dots) {
      const d = distFromSun(c);
      expect(d, `belt dot (${c.cx},${c.cy}) at hypot=${d.toFixed(4)} below inner ring 286`).toBeGreaterThanOrEqual(286);
      expect(d, `belt dot (${c.cx},${c.cy}) at hypot=${d.toFixed(4)} above outer ring 302`).toBeLessThanOrEqual(302);
    }
  });

  it("comet's initial markup sits at perihelion (460,500) with tail x2/y2=(444,500)", () => {
    const body = attrs(cometSegment.match(/<circle[^>]*id="cometBody"[^>]*>/)![0]);
    expect([body.cx, body.cy]).toEqual(["460", "500"]);
    const tail = attrs(cometSegment.match(/<line[^>]*id="cometTail"[^>]*>/s)![0]);
    expect([tail.x1, tail.y1]).toEqual(["460", "500"]);
    expect([tail.x2, tail.y2]).toEqual(["444", "500"]);
  });
});
