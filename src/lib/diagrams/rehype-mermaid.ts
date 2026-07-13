import path from "node:path";
import { fromHtmlIsomorphic } from "hast-util-from-html-isomorphic";
import { renderDiagrams, type RenderedDiagram } from "./render";

// hast node types, derived from the parser's signature instead of a root
// @types/hast devDep: a root copy resolves separately from the one the
// astro/rehype chain links against, and the duplicate identity breaks
// astro.config.mjs's checked plugin types. Deriving keeps one source of
// truth whatever version the lockfile lands on.
export type Root = ReturnType<typeof fromHtmlIsomorphic>;
export type RootContent = Root["children"][number];
export type Element = Extract<RootContent, { type: "element" }>;
export type ElementContent = Element["children"][number];

// Structural stand-in for VFile — the vfile package is only a transitive
// dep, and these two fields are all the plugin reads.
interface DocumentFile {
  path?: string;
  cwd: string;
}

// Astro's Shiki pass runs before user rehype plugins but skips mermaid
// via syntaxHighlight.excludeLangs, so fences arrive here as the plain
// <pre><code class="language-mermaid"> that remark-rehype produced.
interface Fence {
  parent: Root | Element;
  index: number;
  source: string;
}

function isMermaidPre(node: Element): boolean {
  if (node.tagName !== "pre") return false;
  const code = node.children.find(
    (child): child is Element =>
      child.type === "element" && child.tagName === "code",
  );
  if (!code) return false;
  const className = code.properties.className;
  return Array.isArray(className) && className.includes("language-mermaid");
}

function textContent(node: Element): string {
  let text = "";
  for (const child of node.children) {
    if (child.type === "text") text += child.value;
    else if (child.type === "element") text += textContent(child);
  }
  return text;
}

function collectFences(node: Root | Element, fences: Fence[]): void {
  node.children.forEach((child, index) => {
    if (child.type !== "element") return;
    if (isMermaidPre(child)) {
      fences.push({ parent: node, index, source: textContent(child) });
    } else {
      collectFences(child, fences);
    }
  });
}

// Figure numbering in the site's instrument voice: Fig. IV, not Fig. 4.
export function toRoman(n: number): string {
  const table: [number, string][] = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let out = "";
  let rest = n;
  for (const [value, numeral] of table) {
    while (rest >= value) {
      out += numeral;
      rest -= value;
    }
  }
  return out;
}

function uppercaseText(node: Element): void {
  for (const child of node.children) {
    if (child.type === "text") child.value = child.value.toUpperCase();
    else if (child.type === "element") uppercaseText(child);
  }
}

// Cluster titles speak in the site's eyebrow voice. Uppercasing happens
// at build time because CSS text-transform on SVG text is not reliable
// cross-browser — and it's width-safe: the labels render in the mono
// face, where upper and lower case share one advance width.
function uppercaseClusterLabels(node: Element): void {
  const className = node.properties.className;
  if (Array.isArray(className) && className.includes("cluster-label")) {
    uppercaseText(node);
    return;
  }
  for (const child of node.children) {
    if (child.type === "element") uppercaseClusterLabels(child);
  }
}

function figurePlate(diagram: RenderedDiagram, ordinal: number): Element {
  const svg = fromHtmlIsomorphic(diagram.svg, { fragment: true })
    .children[0] as Element;
  uppercaseClusterLabels(svg);

  // Mermaid wires aria-labelledby only when the author wrote accTitle;
  // otherwise let the frontmatter title (or the figure number) name the
  // graphic for assistive tech.
  if (!svg.properties.ariaLabelledBy) {
    svg.properties.ariaLabel =
      diagram.title ?? `Figure ${toRoman(ordinal)}: diagram`;
  }

  const eyebrow: ElementContent[] = [
    {
      type: "element",
      tagName: "span",
      properties: { className: ["diagram-fig-no"] },
      children: [{ type: "text", value: `Fig. ${toRoman(ordinal)}` }],
    },
  ];
  if (diagram.title) {
    eyebrow.push({
      type: "element",
      tagName: "span",
      properties: { className: ["diagram-fig-title"] },
      children: [{ type: "text", value: diagram.title }],
    });
  }

  return {
    type: "element",
    tagName: "figure",
    properties: {
      className: ["diagram-plate"],
      // Intrinsic width, so the CSS scale-floor can stop shrinking a
      // small diagram before min() would over-stretch it.
      style: `--w: ${diagram.width}px`,
    },
    children: [
      {
        type: "element",
        tagName: "figcaption",
        properties: { className: ["diagram-eyebrow"] },
        children: eyebrow,
      },
      {
        type: "element",
        tagName: "div",
        properties: { className: ["diagram-scroll"] },
        children: [svg],
      },
    ],
  };
}

/**
 * Render ```mermaid fences to theme-aware inline SVG figure plates at
 * build time. Throws (failing the build) on any diagram mermaid rejects
 * or whose colors the sentinel palette does not cover — a broken or
 * half-themed diagram never ships.
 */
export default function rehypeMermaid() {
  return async (tree: Root, file: DocumentFile): Promise<void> => {
    const fences: Fence[] = [];
    collectFences(tree, fences);
    if (fences.length === 0) return;

    const context = file.path
      ? path.relative(file.cwd, file.path)
      : "unknown document";
    const rendered = await renderDiagrams(
      fences.map((fence) => fence.source),
      context,
    );

    rendered.forEach((diagram, i) => {
      fences[i].parent.children[fences[i].index] = figurePlate(diagram, i + 1);
    });
  };
}
