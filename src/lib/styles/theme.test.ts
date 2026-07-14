import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Invariant tests for the theme architecture.
 *
 * The light-dark() block in global.css is the single source of truth; the
 * plain :root chart before it is the legacy fallback for engines without
 * light-dark(). These parse the stylesheet's TEXT and hold the two in
 * lockstep, so the fallback stays safe to forget about.
 */
const css = readFileSync(new URL("./global.css", import.meta.url), "utf8");
const layout = readFileSync(
  new URL("../layouts/BaseLayout.astro", import.meta.url),
  "utf8",
);

const squash = (s: string): string => s.replace(/\s+/g, " ").trim();

/** Splits light-dark()'s two arguments at the top-level comma. */
function splitArgs(inner: string): [string, string] {
  let depth = 0;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === "," && depth === 0) {
      return [squash(inner.slice(0, i)), squash(inner.slice(i + 1))];
    }
  }
  throw new Error(`no top-level comma in light-dark(${inner})`);
}

/** Every `--token: light-dark(light, dark)` declaration in the sheet. */
const pairs = [...css.matchAll(/--([\w-]+):\s*light-dark\(([\s\S]*?)\);/g)].map(
  (m) => {
    const [light, dark] = splitArgs(m[2]);
    return { name: m[1], light, dark };
  },
);

/** The legacy fallback chart: everything before the @supports gate. */
const gateIndex = css.indexOf("@supports (color: light-dark(red, tan))");
const fallback = css.slice(0, gateIndex);

describe("theme token parity", () => {
  it("has the gated light-dark() block", () => {
    expect(gateIndex).toBeGreaterThan(-1);
    expect(pairs.length).toBeGreaterThanOrEqual(20);
  });

  it.each(pairs.map((p) => [p.name, p] as const))(
    "--%s falls back to its dark value on pre-light-dark engines",
    (_name, pair) => {
      const decl = fallback.match(
        new RegExp(`--${pair.name}:\\s*([^;]+);`),
      )?.[1];
      expect(
        decl,
        `--${pair.name} is light-dark() gated but missing from the ungated fallback chart`,
      ).toBeTruthy();
      expect(
        squash(decl!),
        `--${pair.name} fallback diverges from its light-dark() dark argument`,
      ).toBe(pair.dark);
    },
  );

  it('keeps light values out of the fallback: no [data-theme="light"] token block remains', () => {
    // The attribute may still scope non-color rules (wash mix, moon
    // position, the color-scheme pin) — but never a color token that
    // light-dark() should own.
    for (const block of css.matchAll(/\[data-theme="light"\][^{]*{([^}]*)}/g)) {
      for (const pair of pairs) {
        expect(
          block[1].includes(`--${pair.name}:`),
          `--${pair.name} is declared under [data-theme="light"] AND light-dark() — two sources of truth`,
        ).toBe(false);
      }
    }
  });

  it('twins every non-color [data-theme="light"] custom property for auto', () => {
    // Auto is html:not([data-theme]) under the OS media query; a light-pinned
    // token without its twin leaves auto-light visitors on the dark value.
    const autoTwin = css.match(
      /@media \(prefers-color-scheme: light\)\s*{\s*html:not\(\[data-theme\]\)\s*{([^}]*)}/,
    )?.[1];
    const pinned = [...css.matchAll(/\[data-theme="light"\]\s*{([^}]*)}/g)]
      .flatMap((m) => [...m[1].matchAll(/--[\w-]+:[^;]+;/g)])
      .map((m) => squash(m[0]))
      .filter((decl) => !decl.startsWith("--shiki"));
    expect(pinned.length).toBeGreaterThan(0);
    for (const decl of pinned) {
      expect(
        squash(autoTwin ?? ""),
        `"${decl}" is pinned for [data-theme="light"] but has no html:not([data-theme]) auto twin`,
      ).toContain(decl);
    }
  });
});

describe("auto is a real state", () => {
  it("BaseLayout ships no data-theme in the static markup", () => {
    expect(layout).toMatch(/<html lang="en">/);
    expect(layout.includes('<html lang="en" data-theme')).toBe(false);
  });

  it("the pre-paint script both pins and clears the attribute", () => {
    const inline = layout.match(/<script is:inline>([\s\S]*?)<\/script>/)?.[1];
    expect(inline).toBeTruthy();
    expect(inline).toContain('setAttribute("data-theme", stored)');
    expect(inline).toContain('removeAttribute("data-theme")');
  });

  it("color-scheme drives: auto is light dark, the attribute pins one side", () => {
    expect(squash(css)).toContain(":root { color-scheme: light dark; }");
    expect(squash(css)).toContain(
      '[data-theme="dark"] { color-scheme: dark; }',
    );
    expect(squash(css)).toContain(
      '[data-theme="light"] { color-scheme: light; }',
    );
  });

  it("print forces the light resolution of every token", () => {
    const print = css.slice(css.indexOf("@media print"));
    expect(squash(print)).toContain("color-scheme: light !important");
  });

  it("hides the toggle where it cannot act: no JS, or no light-dark()", () => {
    expect(squash(css)).toContain(
      "html:not(.js-sky) .eclipse { display: none; }",
    );
    expect(squash(css)).toMatch(
      /@supports not \(color: light-dark\(red, tan\)\) { \.eclipse { display: none; } }/,
    );
  });
});
