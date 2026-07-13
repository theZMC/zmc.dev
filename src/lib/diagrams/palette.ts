// Mermaid bakes literal colors into its SVG output and derives any theme
// variable you leave unset via color math (khroma), which would produce
// hexes nothing in this file knows about. So: every flowchart-relevant
// variable is pinned to a distinct sentinel hex here, the render happens
// with theme "base", and afterwards each sentinel is swapped for a
// var(--diagram-*) reference so one inline SVG follows the data-theme
// toggle exactly like the dual-Shiki code blocks do.
//
// The fallback colors are the light-theme values, so a diagram stays
// legible in any context that lacks the site stylesheet.

interface DiagramToken {
  /** CSS custom property the sentinel becomes (defined in global.css). */
  cssVar: string;
  /** Improbable-but-valid hex mermaid renders literally. */
  sentinel: string;
  /** Light-leaning literal for contexts without the site CSS. */
  fallback: string;
}

export const TOKENS = {
  ink: {
    cssVar: "--diagram-ink",
    sentinel: "#0d1a01",
    fallback: "#1a1e29",
  },
  line: {
    cssVar: "--diagram-line",
    sentinel: "#0d1a02",
    fallback: "#5b5f68",
  },
  nodeBg: {
    cssVar: "--diagram-node-bg",
    sentinel: "#0d1a03",
    fallback: "#fffcf4",
  },
  nodeBorder: {
    cssVar: "--diagram-node-border",
    sentinel: "#0d1a04",
    fallback: "#a98d5f",
  },
  clusterBg: {
    cssVar: "--diagram-cluster-bg",
    sentinel: "#0d1a05",
    fallback: "#f3ecdc",
  },
  clusterBorder: {
    cssVar: "--diagram-cluster-border",
    sentinel: "#0d1a06",
    fallback: "#c9c2b0",
  },
  labelBg: {
    cssVar: "--diagram-label-bg",
    sentinel: "#0d1a07",
    fallback: "#ffffff",
  },
  bg: {
    cssVar: "--diagram-bg",
    sentinel: "#0d1a08",
    fallback: "#ffffff",
  },
} as const satisfies Record<string, DiagramToken>;

type TokenName = keyof typeof TOKENS;

// Which mermaid theme variable draws from which token. Everything mermaid
// would otherwise derive (secondary/tertiary cascades, borders, text
// inversions) is set explicitly so no khroma-computed color can appear.
const THEME_VARIABLE_TOKENS: Record<string, TokenName> = {
  primaryColor: "nodeBg",
  primaryTextColor: "ink",
  primaryBorderColor: "nodeBorder",
  secondaryColor: "clusterBg",
  secondaryBorderColor: "clusterBorder",
  secondaryTextColor: "ink",
  tertiaryColor: "clusterBg",
  tertiaryBorderColor: "clusterBorder",
  tertiaryTextColor: "ink",
  lineColor: "line",
  arrowheadColor: "line",
  defaultLinkColor: "line",
  textColor: "ink",
  mainBkg: "nodeBg",
  nodeBorder: "nodeBorder",
  nodeTextColor: "ink",
  clusterBkg: "clusterBg",
  clusterBorder: "clusterBorder",
  titleColor: "ink",
  edgeLabelBackground: "labelBg",
  background: "bg",
};

// The render browser has the site's mono loaded (fonts.css), so text
// measurement matches what readers see once the SVG inherits page fonts.
export const DIAGRAM_FONT_FAMILY =
  '"Spline Sans Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

export function themeVariables(): Record<string, string> {
  const vars: Record<string, string> = {
    fontFamily: DIAGRAM_FONT_FAMILY,
    fontSize: "15px",
  };
  for (const [themeVar, token] of Object.entries(THEME_VARIABLE_TOKENS)) {
    vars[themeVar] = TOKENS[token].sentinel;
  }
  return vars;
}

function sentinelChannels(sentinel: string): [number, number, number] {
  return [
    parseInt(sentinel.slice(1, 3), 16),
    parseInt(sentinel.slice(3, 5), 16),
    parseInt(sentinel.slice(5, 7), 16),
  ];
}

/**
 * Replace every sentinel with its var(--diagram-*, fallback) form — both
 * the literal hex and the rgba(r, g, b, a) decomposition mermaid emits
 * when it applies its own opacity (e.g. edge label backgrounds), where
 * the alpha is preserved via color-mix.
 */
export function swapSentinels(svg: string): string {
  let out = svg;
  for (const { cssVar, sentinel, fallback } of Object.values(TOKENS)) {
    const varRef = `var(${cssVar}, ${fallback})`;
    const [r, g, b] = sentinelChannels(sentinel);
    out = out
      .replaceAll(new RegExp(sentinel, "gi"), varRef)
      .replaceAll(
        new RegExp(
          String.raw`rgba\(\s*${r}\s*,\s*${g}\s*,\s*${b}\s*,\s*([0-9.]+)\s*\)`,
          "g",
        ),
        (_, alpha: string) =>
          `color-mix(in srgb, ${varRef} ${Number(alpha) * 100}%, transparent)`,
      );
  }
  return out;
}

// Literal colors that may legitimately survive the swap. Populated only
// when a real diagram proves the need — additions should name their source.
const STRAY_ALLOWLIST = new Set<string>([
  // KaTeX default rule mermaid always inlines (`.katex path{fill:#000;
  // stroke:#000}`) — inert unless a diagram embeds math.
  "#000",
  // `[data-look="neo"]` drop-shadow rules and their <filter> flood-color,
  // emitted regardless of look; inert with the default look, and a shadow
  // is theme-neutral anyway.
  "rgba(185,185,185,1)",
  "#000000",
]);

const COLOR_LITERAL = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?)\([^)]*\)/gi;

/**
 * After the swap, no literal color should remain: one would mean mermaid
 * derived or hardcoded something the palette doesn't map, i.e. a diagram
 * that ignores the theme toggle. Fails the build naming the strays so a
 * future diagram type announces exactly which variables to add.
 */
export function assertNoStrayColors(svg: string, context: string): void {
  // Our own swapped-in fallbacks are literals too — blank the known
  // var(--diagram-*, …) substrings before scanning.
  let scrubbed = svg;
  for (const { cssVar, fallback } of Object.values(TOKENS)) {
    scrubbed = scrubbed.replaceAll(`var(${cssVar}, ${fallback})`, "");
  }

  const strays = [...new Set(scrubbed.match(COLOR_LITERAL) ?? [])].filter(
    (color) => !STRAY_ALLOWLIST.has(color.toLowerCase()),
  );
  if (strays.length > 0) {
    throw new Error(
      `[diagrams] ${context}: unmapped colors survived the sentinel swap: ` +
        `${strays.join(", ")}. Map the mermaid theme variables that emit ` +
        `them in src/lib/diagrams/palette.ts (or allowlist deliberately).`,
    );
  }
}
