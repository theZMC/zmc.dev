import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  createMermaidRenderer,
  type MermaidRenderer,
  type RenderOptions,
  type RenderResult,
} from "mermaid-isomorphic";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import {
  DIAGRAM_FONT_FAMILY,
  groundNamedColors,
  swapSentinels,
  washPieSlices,
  assertNoStrayColors,
  themeVariables,
} from "./palette";

export interface PreparedDiagram {
  /** Source handed to mermaid, with the frontmatter title removed. */
  source: string;
  /** Frontmatter title, destined for the figure caption. */
  title?: string;
}

export interface RenderedDiagram {
  svg: string;
  width: number;
  height: number;
  title?: string;
  /** accDescr, when the author provided one. */
  description?: string;
}

// Same shape mermaid itself accepts as fence frontmatter.
const FRONTMATTER = /^\s*---\r?\n([\s\S]*?)\r?\n\s*---\r?\n?/;

/**
 * Pull the frontmatter `title:` out of a fence. Mermaid would otherwise
 * draw it as text inside the SVG, duplicating the figcaption the plugin
 * builds; any other frontmatter keys (config:, displayMode:) are kept
 * for mermaid to honor.
 */
export function prepareDiagram(raw: string): PreparedDiagram {
  const match = FRONTMATTER.exec(raw);
  if (!match) return { source: raw };

  const data: unknown = parseYaml(match[1]);
  if (typeof data !== "object" || data === null || !("title" in data)) {
    return { source: raw };
  }

  const { title, ...rest } = data as { title?: unknown };
  const body = raw.slice(match[0].length);
  const source =
    Object.keys(rest).length > 0
      ? `---\n${stringifyYaml(rest)}---\n${body}`
      : body;

  return {
    source,
    title: typeof title === "string" ? title : String(title),
  };
}

// One renderer (and one headless browser) per process: astro dev re-renders
// on every save and a per-render launch would crawl. process.cwd() is the
// repo root for astro/vitest either way; import.meta.url is not stable here
// because the astro config bundle relocates this module.
let renderer: MermaidRenderer | undefined;

function getRenderer(): MermaidRenderer {
  renderer ??= createMermaidRenderer();
  return renderer;
}

function fontsCssUrl(): URL {
  return pathToFileURL(
    path.resolve(process.cwd(), "src/lib/diagrams/fonts.css"),
  );
}

// State diagrams read the flowchart spacing config, so they render in
// their own pass with tighter ranks (see nodeSpacing/rankSpacing below).
function needsStateSpacing(source: string): boolean {
  return /^\s*stateDiagram/.test(source);
}

function renderOptions(stateSpacing: boolean): RenderOptions {
  return {
    css: fontsCssUrl(),
    // Each render pass restarts mermaid's id counter at 0. Without
    // distinct prefixes the two passes mint colliding ids, and one
    // diagram's #id-scoped stylesheet bleeds into the other (a
    // flowchart's text-anchor rule shoved state labels out of their
    // boxes half a word to the left).
    prefix: stateSpacing ? "mermaid-state" : "mermaid",
    mermaidConfig: {
        theme: "base" as const,
        themeVariables: themeVariables(),
        // The sequence renderer ignores themeVariables.fontFamily and its
        // own sequence.*FontFamily keys are schema-stripped — only the
        // top-level config font reaches its inline styles. Without this,
        // sequence text renders in arial while everything else is mono.
        fontFamily: DIAGRAM_FONT_FAMILY,
        fontSize: 15,
        // Pure <text>/<tspan> labels: no <foreignObject> XHTML for
        // Astro's later rehype-raw pass to mangle, and label colors
        // stay in fill attributes the sentinel swap covers. Mermaid 11
        // only honors the top-level key; the flowchart-scoped one is
        // kept for when that changes.
        htmlLabels: false,
        // useMaxWidth:false everywhere: numeric width/height attributes
        // instead of an injected max-width style — the plate CSS owns
        // sizing. Spacing is opened up from mermaid's cramped defaults,
        // and mermaid's own outer padding shrinks because the figure
        // plate already provides the frame's breathing room.
        flowchart: {
          htmlLabels: false,
          useMaxWidth: false,
          // 70 gives flowcharts air, but state diagrams read this same
          // config and five states ballooned past 800px tall — state
          // fences render in their own pass with tighter ranks.
          nodeSpacing: stateSpacing ? 50 : 70,
          rankSpacing: stateSpacing ? 35 : 70,
          curve: "basis",
          diagramPadding: 8, // default 20
          // top clears the title's band; bottom is NOT title clearance —
          // mermaid pads every cluster's bottom edge with it (dead band)
          subGraphTitleMargin: { top: 8, bottom: 0 },
        },
        sequence: {
          useMaxWidth: false,
          actorMargin: 90, // default 50 — actors were shoulder-to-shoulder
          messageMargin: 46, // default 35
          boxMargin: 14, // default 10 — loop/alt frames clear their content
          noteMargin: 14,
          diagramMarginX: 8, // default 50
          diagramMarginY: 12,
          height: 48, // default 65 — one line of 15px mono swam in the box
          // the loop/alt legend pentagon hugged its word at 50×20
          labelBoxWidth: 70,
          labelBoxHeight: 26,
          // the mirrored bottom actor row double-spends vertical space
          mirrorActors: false,
          bottomMarginAdj: 10,
        },
        class: { htmlLabels: false, useMaxWidth: false },
        state: { useMaxWidth: false },
        er: {
          useMaxWidth: false,
          diagramPadding: 8, // default 20
          entityPadding: 18, // default 15
          minEntityWidth: 120,
        },
        pie: { useMaxWidth: false },
        gantt: {
          useMaxWidth: false,
          barHeight: 26, // default 20 — task text sat on the bar's edges
          barGap: 8, // default 4
          // 60 left a dead band under the eyebrow once titles moved to
          // the figcaption; just enough for the axis' breathing room now
          topPadding: 40,
          fontSize: 13, // default 11 — axis ticks were squinting material
          sectionFontSize: 13,
        },
      },
    };
}

/**
 * Render a batch of fences (all diagrams of one document) to theme-aware
 * SVG strings. Throws — failing the build — on the first diagram mermaid
 * rejects or whose colors the palette does not fully cover.
 */
export async function renderDiagrams(
  fences: string[],
  context: string,
): Promise<RenderedDiagram[]> {
  const prepared = fences.map(prepareDiagram);

  // Two passes at most: state fences under their own spacing, the rest
  // together — results land back in document order.
  const renderer = getRenderer();
  const settled = new Array<PromiseSettledResult<RenderResult>>(
    prepared.length,
  );
  for (const stateSpacing of [false, true]) {
    const indices = prepared
      .map((d, i) => i)
      .filter((i) => needsStateSpacing(prepared[i].source) === stateSpacing);
    if (indices.length === 0) continue;
    const group = await renderer(
      indices.map((i) => prepared[i].source),
      renderOptions(stateSpacing),
    );
    indices.forEach((original, j) => {
      settled[original] = group[j];
    });
  }

  return settled.map((result, i) => {
    const where = `${context}, diagram ${i + 1}`;
    if (result.status === "rejected") {
      const reason =
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason);
      throw new Error(`[diagrams] ${where}: mermaid failed: ${reason}`);
    }

    const swapped = groundNamedColors(
      washPieSlices(swapSentinels(result.value.svg)),
    );
    assertNoStrayColors(swapped, where);

    return {
      svg: swapped,
      width: result.value.width,
      height: result.value.height,
      title: prepared[i].title,
      description: result.value.description,
    };
  });
}
