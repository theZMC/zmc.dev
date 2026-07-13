import { describe, expect, it } from "vitest";
import {
  NON_COLOR_THEME_VARIABLES,
  PIE_WASHES,
  TOKENS,
  assertNoStrayColors,
  swapSentinels,
  themeVariables,
  washPieSlices,
} from "./palette";

describe("sentinel table", () => {
  it("is bijective: no sentinel or css var serves two tokens", () => {
    const sentinels = Object.values(TOKENS).map((t) => t.sentinel);
    const cssVars = Object.values(TOKENS).map((t) => t.cssVar);
    expect(new Set(sentinels).size).toBe(sentinels.length);
    expect(new Set(cssVars).size).toBe(cssVars.length);
  });

  it("pins every color-bearing theme variable to a sentinel", () => {
    const vars = themeVariables();
    for (const [name, value] of Object.entries(vars)) {
      if (NON_COLOR_THEME_VARIABLES.has(name)) continue;
      const isSentinel = Object.values(TOKENS).some(
        (t) => t.sentinel === value,
      );
      expect(isSentinel, `${name}=${value} is not a sentinel`).toBe(true);
    }
    // The derivation roots mermaid computes everything else from.
    for (const root of ["primaryColor", "background", "lineColor"]) {
      expect(vars).toHaveProperty(root);
    }
  });
});

describe("swapSentinels", () => {
  it("replaces every sentinel with its var() form, case-insensitively", () => {
    const svg = Object.values(TOKENS)
      .map((t, i) =>
        i % 2 === 0
          ? `fill="${t.sentinel}"`
          : `stroke:${t.sentinel.toUpperCase()};`,
      )
      .join(" ");
    const out = swapSentinels(svg);
    for (const { sentinel, cssVar, fallback } of Object.values(TOKENS)) {
      expect(out.toLowerCase()).not.toContain(sentinel);
      expect(out).toContain(`var(${cssVar}, ${fallback})`);
    }
  });

  it("converts rgba-decomposed sentinels to alpha-preserving color-mix", () => {
    // #0d1a07 → rgb(13, 26, 7); mermaid emits this form when it applies
    // its own opacity, e.g. edge label backgrounds.
    const out = swapSentinels(`fill:rgba(13, 26, 7, 0.5);`);
    expect(out).toBe(
      `fill:color-mix(in srgb, var(${TOKENS.labelBg.cssVar}, ${TOKENS.labelBg.fallback}) 50%, transparent);`,
    );
  });
});

describe("washPieSlices", () => {
  const hue = `var(${TOKENS.cat1.cssVar}, ${TOKENS.cat1.fallback})`;
  const wash = `var(${PIE_WASHES["1"].cssVar}, ${PIE_WASHES["1"].fallback})`;

  it("gives slices the alert recipe: hue-wash fill, full-hue edge", () => {
    const out = washPieSlices(
      `<path d="M0,0" fill="${hue}" class="pieCircle">`,
    );
    expect(out).toBe(
      `<path d="M0,0" class="pieCircle" style="fill: ${wash}; stroke: ${hue};">`,
    );
  });

  it("matches legend swatches to their slices", () => {
    const out = washPieSlices(
      `<rect width="18" style="fill: ${hue}; stroke: ${hue};"></rect>`,
    );
    expect(out).toBe(
      `<rect width="18" style="fill: ${wash}; stroke: ${hue};"></rect>`,
    );
  });

  it("keeps wash fallbacks scrubbed from the stray-color guard", () => {
    expect(() =>
      assertNoStrayColors(washPieSlices(`fill="${hue}" class="pieCircle"`), "t"),
    ).not.toThrow();
  });

  it("leaves non-pie markup alone", () => {
    const svg = `<rect fill="${hue}" class="node"/>`;
    expect(washPieSlices(svg)).toBe(svg);
  });
});

describe("assertNoStrayColors", () => {
  it("accepts a fully swapped document (own fallbacks are not strays)", () => {
    const svg = swapSentinels(
      `<svg><rect fill="${TOKENS.nodeBg.sentinel}" stroke="${TOKENS.nodeBorder.sentinel}"/></svg>`,
    );
    expect(() => assertNoStrayColors(svg, "test")).not.toThrow();
  });

  it("names a planted stray hex and the offending context", () => {
    const svg = `<svg><rect fill="#deadbe"/></svg>`;
    expect(() => assertNoStrayColors(svg, "post.md diagram 2")).toThrow(
      /post\.md diagram 2.*#deadbe/s,
    );
  });

  it("catches functional color literals too", () => {
    const svg = `<svg><rect style="fill:rgba(1, 2, 3, 0.5)"/></svg>`;
    expect(() => assertNoStrayColors(svg, "test")).toThrow(/rgba\(1, 2, 3/);
  });
});
