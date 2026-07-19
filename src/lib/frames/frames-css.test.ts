import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Invariant tests for the frame affordances (expand/collapse + edge
 * fades) on code blocks, tables, and diagram plates.
 *
 * The system is CSS scroll-timeline-driven — each frame's scroller
 * defines a private timeline, and an INACTIVE timeline (no overflow, or
 * an engine without timelines) must reveal hidden underlying values.
 * That contract spans the post page's style block and the little JS
 * that remains in site.ts. String parsing is enough; no DOM is needed.
 */
const css = readFileSync(
  new URL("../../pages/posts/[slug]/index.astro", import.meta.url),
  "utf8",
);
const script = readFileSync(
  new URL("../scripts/site.ts", import.meta.url),
  "utf8",
);

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

const supportBlocks = blocks(css, "@supports (animation-timeline: scroll())");
const fadeBlock = supportBlocks.find((b) => b.includes("frame-fade-in"));
const armBlock = supportBlocks.find((b) => b.includes("frame-arm"));

describe("scroll-timeline architecture", () => {
  it("every frame animation lives behind the timeline @supports gate", () => {
    expect(fadeBlock, "no @supports block animates the fades").toBeTruthy();
    expect(armBlock, "no @supports block arms the button").toBeTruthy();
    for (const [block, anims] of [
      [fadeBlock, ["frame-fade-in", "frame-fade-out"]],
      [armBlock, ["frame-arm"]],
    ] as const) {
      for (const anim of anims) {
        // the sky's idiom: the longhand timeline follows the shorthand
        expect(block).toContain(`animation: ${anim} 1s linear both`);
      }
      expect(block).toContain("animation-timeline: --frame-scroll");
    }
  });

  it("scroller defines the timeline; frame scopes it for pseudos and button", () => {
    expect(fadeBlock).toContain("scroll-timeline: --frame-scroll inline");
    expect(fadeBlock).toContain("timeline-scope: --frame-scroll");
  });

  it("fades ramp at the clip edges over matching ranges", () => {
    expect(fadeBlock).toContain("animation-range: 0 3rem");
    expect(fadeBlock).toContain("animation-range: calc(100% - 3rem) 100%");
  });

  it("underlying values are hidden, so an inactive timeline hides too", () => {
    // fade pseudos rest at opacity 0; the armed button rests invisible
    // AND out of the tab order (visibility, not opacity)
    const pseudoBase = blocks(css, ".post-body .code-frame::before,")[0];
    expect(pseudoBase).toBeTruthy();
    expect(pseudoBase).toContain("opacity: 0");
    expect(armBlock).toContain("visibility: hidden");
    expect(css).toMatch(
      /@keyframes frame-arm\s*{\s*from,\s*to\s*{\s*visibility: visible/,
    );
  });

  it("copy is JS-gated behavior; expand and the fades are not", () => {
    expect(css).toMatch(/html\.js-sky \.post-body \.copy-code/);
    expect(armBlock).not.toContain("js-sky");
    expect(fadeBlock).not.toContain("js-sky");
  });

  it("the toggle is a real checkbox — expand/collapse needs no JS", () => {
    expect(css).toContain(":has(.expand-toggle:checked)");
    expect(css, "stale data-expanded plumbing").not.toContain("data-expanded");
    // the input stays focusable (display:none would drop it from the
    // tab order) while the pill label paints for it
    const input = blocks(css, ".post-body .expand-toggle")[0];
    expect(input).toBeTruthy();
    expect(input).toContain("appearance: none");
    expect(input).toContain("opacity: 0");
    expect(input).not.toContain("display: none");
    // state-flipped label text with empty alt — the input carries the name
    expect(css).toContain('content: "Expand" / ""');
    expect(css).toContain('content: "Collapse" / ""');
  });

  it("expanded frames always keep their way back to the measure", () => {
    // the escape hatch must kill the arming animation and out-specify
    // the armed rule — :has(:checked) carries the winning specificity
    const hatch = blocks(
      css,
      ":has(.expand-toggle:checked)\n    .expand-code {",
    )[0];
    expect(hatch, "no :checked .expand-code escape hatch").toBeTruthy();
    expect(hatch).toContain("animation: none");
    expect(hatch).toContain("visibility: visible");
  });

  it("stays live under reduced motion — information, not decoration", () => {
    for (const b of blocks(css, "@media (prefers-reduced-motion: reduce)")) {
      for (const anim of ["frame-fade-in", "frame-fade-out", "frame-arm"]) {
        expect(b, `reduce block must not touch ${anim}`).not.toContain(anim);
      }
    }
  });
});

describe("remaining JS", () => {
  it("site.ts keeps only polish: the scrollbar layout-shift lock", () => {
    expect(script).toContain('closest(".expand-toggle")');
    expect(script).toContain("minHeight");
    for (const leftover of [
      "frameBlock",
      "updateFrameState",
      "updatePlateState",
      "ResizeObserver",
      "data-clipped",
      "data-overflowing",
      "data-expandable",
      "data-expanded",
      "aria-expanded",
      "--plate-head-h",
    ]) {
      expect(script, `stale frame JS: ${leftover}`).not.toContain(leftover);
    }
  });
});
