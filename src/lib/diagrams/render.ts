import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  createMermaidRenderer,
  type MermaidRenderer,
  type RenderResult,
} from "mermaid-isomorphic";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import {
  swapSentinels,
  washPieSlices,
  assertNoStrayColors,
  themeVariables,
  DIAGRAM_FONT_FAMILY,
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

  const settled = await getRenderer()(
    prepared.map((d) => d.source),
    {
      css: fontsCssUrl(),
      mermaidConfig: {
        theme: "base",
        themeVariables: themeVariables(),
        // The sequence renderer ignores themeVariables.fontFamily and
        // schema-strips sequence.*FontFamily — these top-level keys are
        // the only route to its text (arial otherwise). For every other
        // diagram type they restate what themeVariables already says.
        fontFamily: DIAGRAM_FONT_FAMILY,
        fontSize: 15,
        // Pure <text>/<tspan> labels: no <foreignObject> XHTML for
        // Astro's later rehype-raw pass to mangle, and label colors
        // stay in fill attributes the sentinel swap covers. Mermaid 11
        // only honors the top-level key; the flowchart-scoped one is
        // kept for when that changes.
        htmlLabels: false,
        // Numeric width/height attributes instead of an injected
        // max-width inline style — the plate CSS owns sizing. The knob
        // is per diagram type; one entry per type the palette covers.
        flowchart: {
          htmlLabels: false,
          useMaxWidth: false,
          // Mermaid's default 15 leaves node labels almost touching
          // their borders — off-rhythm next to the page's spacing.
          padding: 20,
          // The band between a cluster's top border and a nested
          // cluster is hard-wired to rankSpacing / 2 — no margin knob
          // grows it, and bottom margins only pad cluster bottoms. So
          // the title's breathing room comes from rank spacing (which
          // the page's airy rhythm wants anyway), with top centering
          // the title inside that band.
          rankSpacing: 64,
          subGraphTitleMargin: { top: 9, bottom: 0 },
        },
        sequence: { useMaxWidth: false },
        class: { htmlLabels: false, useMaxWidth: false },
        state: { useMaxWidth: false },
        er: { useMaxWidth: false },
        pie: { useMaxWidth: false },
        gantt: { useMaxWidth: false },
      },
    },
  );

  return settled.map((result, i) => {
    const where = `${context}, diagram ${i + 1}`;
    if (result.status === "rejected") {
      const reason =
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason);
      throw new Error(`[diagrams] ${where}: mermaid failed: ${reason}`);
    }

    const swapped = washPieSlices(swapSentinels(result.value.svg));
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
