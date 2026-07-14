import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Invariant tests for the reading dial / back-to-top control.
 *
 * The dial is CSS scroll-timeline-driven — zero JS where the platform has
 * timelines — so its contract spans three texts: the component's static
 * SVG geometry, the dial layers in global.css, and the fallback threshold
 * site.ts mirrors for engines without timeline support. String parsing is
 * enough; no DOM is needed.
 */
const source = readFileSync(
  new URL("./ProgressDial.astro", import.meta.url),
  "utf8",
);
const css = readFileSync(
  new URL("../styles/global.css", import.meta.url),
  "utf8",
);
const script = readFileSync(
  new URL("../scripts/site.ts", import.meta.url),
  "utf8",
);

/** Parses `name="value"` attribute pairs out of a single tag's text. */
function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/([\w-]+)="([^"]*)"/g)) out[m[1]] = m[2];
  return out;
}

/** Every brace-matched block opened by a header containing `opener`. */
function blocks(text: string, opener: string): string[] {
  const out: string[] = [];
  let from = 0;
  for (;;) {
    const start = text.indexOf(opener, from);
    if (start === -1) return out;
    let i = text.indexOf("{", start) + 1;
    let depth = 1;
    while (depth > 0 && i < text.length) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}") depth--;
      i++;
    }
    out.push(text.slice(start, i));
    from = i;
  }
}

function circle(cls: string): Record<string, string> {
  const tag = source.match(new RegExp(`<circle class="${cls}"[^>]*>`))?.[0];
  if (!tag) throw new Error(`no <circle class="${cls}"> in ProgressDial.astro`);
  return attrs(tag);
}

const track = circle("track");
const arc = circle("arc");
const body = circle("body");
const CX = Number(track.cx);
const CY = Number(track.cy);
const R = Number(track.r);

describe("dial geometry", () => {
  it("track and arc share one centre and radius", () => {
    expect([arc.cx, arc.cy, arc.r]).toEqual([track.cx, track.cy, track.r]);
  });

  it("arc sweep starts at twelve o'clock: rotated -90 about the centre", () => {
    expect(arc.transform).toBe(`rotate(-90 ${CX} ${CY})`);
  });

  it("CSS dash geometry equals the markup circumference (2πr)", () => {
    const arcBlock = blocks(css, ".progress-dial .arc")[0];
    expect(arcBlock).toBeTruthy();
    const dash = Number(arcBlock.match(/stroke-dasharray:\s*([\d.]+)/)?.[1]);
    const offset = Number(arcBlock.match(/stroke-dashoffset:\s*([\d.]+)/)?.[1]);
    const circumference = 2 * Math.PI * R;
    expect(dash).toBe(offset); // fully retired at rest
    expect(
      Math.abs(dash - circumference) / circumference,
      `dasharray ${dash} vs 2π·${R} = ${circumference.toFixed(4)}`,
    ).toBeLessThanOrEqual(0.001);
  });

  it("the body waits at twelve o'clock, exactly on the ring", () => {
    expect(source).toMatch(/<g class="dial-orbit">\s*<circle class="body"/);
    const d = Math.hypot(Number(body.cx) - CX, Number(body.cy) - CY);
    expect(
      d,
      `body at (${body.cx},${body.cy}) is ${d} from centre, not ${R}`,
    ).toBeCloseTo(R, 9);
    expect(Number(body.cx)).toBe(CX);
    expect(Number(body.cy)).toBeLessThan(CY);
  });

  it("the orbit group pivots on the view-box centre so the ride stays on the ring", () => {
    const orbit = blocks(css, ".dial-orbit")[0];
    expect(orbit).toContain("transform-box: view-box");
    expect(orbit).toContain("transform-origin: center");
    expect(css).toMatch(/@keyframes dial-ride\s*{[^}]*{\s*rotate:\s*1turn/);
  });

  it("two identical chevrons, pointing up, centred on the dial", () => {
    const group = source.match(/<g class="dial-chevrons">[\s\S]*?<\/g>/)?.[0];
    expect(group).toBeTruthy();
    const paths = [...group!.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1]);
    expect(paths.length).toBe(2);
    expect(
      new Set(paths).size,
      "chevrons must share one geometry — CSS owns the offsets",
    ).toBe(1);
    const pts = paths[0]
      .match(/M([\d.]+) ([\d.]+) L([\d.]+) ([\d.]+) L([\d.]+) ([\d.]+)/)!
      .slice(1)
      .map(Number);
    const [x1, y1, x2, y2, x3, y3] = pts;
    expect(y2, "apex must sit above the feet (upward chevron)").toBeLessThan(
      y1,
    );
    expect(y2).toBeLessThan(y3);
    expect((x1 + x3) / 2, "feet straddle the vertical axis").toBeCloseTo(CX, 9);
    expect(x2).toBeCloseTo(CX, 9);
    expect(
      (y2 + Math.max(y1, y3)) / 2,
      "chevron ink box centres on the dial",
    ).toBeCloseTo(CY, 9);
  });
});

describe("control semantics", () => {
  it("is a link home with a real accessible name, artwork hidden from AT", () => {
    expect(source).toContain(
      '<a class="dial-return" href="#top" aria-label="Back to top">',
    );
    expect(source).toMatch(/<svg class="progress-dial"[^>]*aria-hidden="true"/);
  });
});

describe("css architecture", () => {
  const supportBlocks = blocks(css, "@supports (animation-timeline: scroll())");
  const dialBlock = supportBlocks.find((b) => b.includes("dial-sweep"));

  it("every scroll-driven dial animation lives behind the timeline @supports gate", () => {
    expect(
      dialBlock,
      "no @supports (animation-timeline: scroll()) block animates the dial",
    ).toBeTruthy();
    for (const anim of ["dial-sweep", "dial-ride", "dial-summon", "dial-arm"]) {
      expect(dialBlock).toContain(`animation: ${anim} 1s linear both`);
    }
    // the sky's idiom: the longhand timeline follows the shorthand
    expect(dialBlock).toContain("animation-timeline: scroll(root)");
    expect(dialBlock).toContain("animation-range: 0 var(--return-range)");
  });

  it("stays live under reduced motion — information, not decoration", () => {
    // Unlike the sky layer, the dial's scroll-driven block carries no
    // reduced-motion gate, and no reduce block stills its animations.
    expect(dialBlock).not.toContain("prefers-reduced-motion");
    for (const b of blocks(css, "@media (prefers-reduced-motion: reduce)")) {
      for (const anim of [
        "dial-sweep",
        "dial-ride",
        "dial-summon",
        "dial-arm",
      ]) {
        expect(b, `reduce block must not touch ${anim}`).not.toContain(anim);
      }
    }
  });

  it("reduced motion stills only the chevron formation curves", () => {
    const reduce = blocks(css, "@media (prefers-reduced-motion: reduce)");
    expect(reduce.some((b) => b.includes(".dial-chevrons path"))).toBe(true);
  });

  it("formation curves ride the --return tokens, no bare literals", () => {
    expect(css).toContain("--return-dur:");
    expect(css).toContain("--return-ease:");
    expect(css).toContain(
      "transition: translate var(--return-dur) var(--return-ease)",
    );
  });

  it("engines without timelines get an honest fallback tier", () => {
    const fallback = blocks(
      css,
      "@supports not (animation-timeline: scroll())",
    )[0];
    expect(fallback, "no @supports not tier for the dial").toBeTruthy();
    // the frozen body would lie; the JS summon only exists where JS runs
    expect(fallback).toMatch(/\.progress-dial \.body\s*{\s*display:\s*none/);
    expect(fallback).toContain("html.js-sky .dial-return");
    expect(fallback).toContain(".dial-return.dial-summoned");
  });
});

describe("fallback threshold", () => {
  it("site.ts mirrors --return-range exactly", () => {
    const range = Number(css.match(/--return-range:\s*(\d+)px/)?.[1]);
    const threshold = Number(script.match(/DIAL_SUMMON_Y = (\d+)/)?.[1]);
    expect(range).toBeGreaterThan(0);
    expect(threshold, "DIAL_SUMMON_Y must match --return-range").toBe(range);
  });

  it("site.ts only steps in where the platform can't, and never writes the arc", () => {
    expect(script).toContain('CSS.supports("animation-timeline", "scroll()")');
    expect(script).toContain('classList.toggle("dial-summoned"');
    for (const leftover of [
      "progressArc",
      "progressBody",
      "strokeDashoffset",
      "DIAL_CIRC",
    ]) {
      expect(script, `stale dial JS: ${leftover}`).not.toContain(leftover);
    }
  });
});
