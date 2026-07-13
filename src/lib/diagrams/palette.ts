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
  // Notes (sequence/state) are annotations in the margin — brass wash,
  // kin to the GFM alert treatment, not mermaid's post-it yellow.
  noteBg: {
    cssVar: "--diagram-note-bg",
    sentinel: "#0d1a09",
    fallback: "#efe6cf",
  },
  noteBorder: {
    cssVar: "--diagram-note-border",
    sentinel: "#0d1a0a",
    fallback: "#c9b183",
  },
  // Categorical hues for pie slices and task states — the site's five
  // chart hues, in the order the alerts escalate them.
  cat1: {
    cssVar: "--diagram-cat-1",
    sentinel: "#0d1a0b",
    fallback: "#4e6685",
  },
  cat2: {
    cssVar: "--diagram-cat-2",
    sentinel: "#0d1a0c",
    fallback: "#40745a",
  },
  cat3: {
    cssVar: "--diagram-cat-3",
    sentinel: "#0d1a0d",
    fallback: "#665792",
  },
  cat4: {
    cssVar: "--diagram-cat-4",
    sentinel: "#0d1a0e",
    fallback: "#8f6f35",
  },
  cat5: {
    cssVar: "--diagram-cat-5",
    sentinel: "#0d1a0f",
    fallback: "#9c4a33",
  },
} as const satisfies Record<string, DiagramToken>;

type TokenName = keyof typeof TOKENS;

// Which mermaid theme variable draws from which token. Everything mermaid
// would otherwise derive (secondary/tertiary cascades, borders, text
// inversions) is set explicitly so no khroma-computed color can appear.
const THEME_VARIABLE_TOKENS: Record<string, TokenName> = {
  // -- shared roots (flowchart and everything derived from them) --
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
  // -- notes (sequence + state) --
  noteBkgColor: "noteBg",
  noteBorderColor: "noteBorder",
  noteTextColor: "ink",
  // -- sequence --
  actorBkg: "nodeBg",
  actorBorder: "nodeBorder",
  actorTextColor: "ink",
  actorLineColor: "line",
  signalColor: "line",
  signalTextColor: "ink",
  labelBoxBkgColor: "clusterBg",
  labelBoxBorderColor: "clusterBorder",
  labelTextColor: "ink",
  loopTextColor: "ink",
  activationBkgColor: "clusterBg",
  activationBorderColor: "clusterBorder",
  sequenceNumberColor: "labelBg",
  // -- class --
  classText: "ink",
  // -- state --
  labelColor: "ink",
  stateLabelColor: "ink",
  stateBkg: "nodeBg",
  labelBackgroundColor: "labelBg",
  altBackground: "clusterBg",
  compositeBackground: "clusterBg",
  compositeTitleBackground: "clusterBg",
  compositeBorder: "clusterBorder",
  innerEndBackground: "line",
  specialStateColor: "line",
  transitionColor: "line",
  transitionLabelColor: "ink",
  // -- pie: the five site hues, cycled to fill mermaid's twelve slots --
  pie1: "cat1",
  pie2: "cat2",
  pie3: "cat3",
  pie4: "cat4",
  pie5: "cat5",
  pie6: "cat1",
  pie7: "cat2",
  pie8: "cat3",
  pie9: "cat4",
  pie10: "cat5",
  pie11: "cat1",
  pie12: "cat2",
  // slices are washed like the alerts (see washPieSlices), so ink reads
  // on them in both themes
  pieTitleTextColor: "ink",
  pieSectionTextColor: "ink",
  pieLegendTextColor: "ink",
  pieStrokeColor: "labelBg",
  pieOuterStrokeColor: "line",
  // -- gantt: state lives in the border hue, fills stay instrument-quiet
  //    (normal brass-dim / active celest / done hairline / crit cinnabar) --
  sectionBkgColor: "clusterBg",
  altSectionBkgColor: "bg",
  sectionBkgColor2: "clusterBg",
  excludeBkgColor: "clusterBg",
  gridColor: "clusterBorder",
  todayLineColor: "cat5",
  taskBkgColor: "nodeBg",
  taskBorderColor: "nodeBorder",
  taskTextColor: "ink",
  taskTextLightColor: "ink",
  taskTextDarkColor: "ink",
  taskTextOutsideColor: "ink",
  taskTextClickableColor: "cat1",
  activeTaskBkgColor: "nodeBg",
  activeTaskBorderColor: "cat1",
  doneTaskBkgColor: "clusterBg",
  doneTaskBorderColor: "clusterBorder",
  critBkgColor: "nodeBg",
  critBorderColor: "cat5",
};

// The render browser has the site's mono loaded (fonts.css), so text
// measurement matches what readers see once the SVG inherits page fonts.
export const DIAGRAM_FONT_FAMILY =
  '"Spline Sans Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

// themeVariables() entries that are not colors and so carry no sentinel.
export const NON_COLOR_THEME_VARIABLES = new Set([
  "fontFamily",
  "fontSize",
  "pieOpacity",
  "pieStrokeWidth",
]);

export function themeVariables(): Record<string, string> {
  const vars: Record<string, string> = {
    fontFamily: DIAGRAM_FONT_FAMILY,
    fontSize: "15px",
    // The wash carries the subduedness (washPieSlices); mermaid's default
    // 0.7 opacity would dim the full-hue edges too.
    pieOpacity: "1",
    pieStrokeWidth: "1.5px",
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
 * Replace every sentinel with its var(--diagram-*, fallback) form — the
 * literal hex plus the rgb(r, g, b) / rgba(r, g, b, a) decompositions
 * mermaid emits for some elements (pie slices, edge label backgrounds),
 * with any alpha preserved via color-mix.
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
          String.raw`rgba?\(\s*${r}\s*,\s*${g}\s*,\s*${b}\s*(?:,\s*([0-9.]+)\s*)?\)`,
          "g",
        ),
        (_, alpha: string | undefined) =>
          alpha === undefined
            ? varRef
            : `color-mix(in srgb, ${varRef} ${Number(alpha) * 100}%, transparent)`,
      );
  }
  return out;
}

// Slice/swatch wash fills. The strength is theme-tuned in global.css
// (--diagram-wash-mix): dark's 12% whisper converges the blues and
// purples on a light ground, so light mixes heavier. Fallbacks are the
// light hues at ~30% over white, for contexts without the site CSS.
export const PIE_WASHES: Record<string, { cssVar: string; fallback: string }> = {
  "1": { cssVar: "--diagram-wash-1", fallback: "#cad1da" },
  "2": { cssVar: "--diagram-wash-2", fallback: "#c6d5ce" },
  "3": { cssVar: "--diagram-wash-3", fallback: "#d1cdde" },
  "4": { cssVar: "--diagram-wash-4", fallback: "#ddd4c2" },
  "5": { cssVar: "--diagram-wash-5", fallback: "#e1c9c2" },
};

function washRef(catNumber: string): string {
  const wash = PIE_WASHES[catNumber];
  return `var(${wash.cssVar}, ${wash.fallback})`;
}

/**
 * Restyle pie slices to the GFM-alert recipe: subdued hue-wash fill with
 * a full-bodied edge in the slice's own hue. Mermaid has no per-slice
 * stroke variable — its uniform `.pieCircle` stroke rule is overridden
 * here with an inline style per slice (inline beats the SVG's own CSS).
 * Runs after swapSentinels, so fills are already var(--diagram-cat-*)
 * references. Non-pie SVGs pass through untouched.
 */
export function washPieSlices(svg: string): string {
  return (
    svg
      .replaceAll(
        /fill="(var\(--diagram-cat-(\d)[^"]*\))" class="pieCircle"/g,
        (_, hue: string, n: string) =>
          `class="pieCircle" style="fill: ${washRef(n)}; stroke: ${hue};"`,
      )
      // legend swatches match their slices
      .replaceAll(
        /style="fill:\s*(var\(--diagram-cat-(\d)[^;]*\));\s*stroke:\s*var\(--diagram-cat-[^;]*\);"/g,
        (_, hue: string, n: string) =>
          `style="fill: ${washRef(n)}; stroke: ${hue};"`,
      )
  );
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
  // sequence-diagram actor drop shadows — theme-neutral like the above
  "rgba(0,0,0,0.2)",
  "rgb(0 0 0 / 0.4)",
  // sequence renderer legacy presentation attributes on actor/note/
  // activation rects and lifelines — inert: the SVG's own themed CSS
  // rules (.actor, .actor-line, .note, .activationN) override them
  "#eaeaea",
  "#666",
  "#999",
  "#edf2ae",
  // state styles emit an .alt-composit fallback rule no element uses
  "#e0e0e0",
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
  for (const { cssVar, fallback } of [
    ...Object.values(TOKENS),
    ...Object.values(PIE_WASHES),
  ]) {
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
