import type { Element, Root } from "../diagrams/rehype-mermaid";

/**
 * Frame article code blocks, tables, and diagram plates at build time:
 * header strip (kind hint left, action buttons right) for pre and table,
 * expand button for the plates' own eyebrow. site.ts used to build all
 * of this per page view; shipping it in the HTML makes the frames part
 * of the no-JS rendering — only the buttons stay JS-gated (CSS hides
 * them until html.js-sky), and the scroll-driven fades need no JS at
 * all. Runs after rehypeMermaid, so mermaid fences are already figure
 * plates and every remaining pre is a code block.
 */

// A checkbox, not a button: flipping the state is the whole feature, and
// :checked + :has() drive it in pure CSS — expand/collapse works with JS
// disabled. The label's visible text (Expand/Collapse) is CSS content
// keyed to the state; the input carries the accessible name, and its
// native checked state announces which way the toggle points.
function expandToggle(expandLabel: string): Element {
  return {
    type: "element",
    tagName: "label",
    properties: { className: ["expand-code", "mono"] },
    children: [
      {
        type: "element",
        tagName: "input",
        properties: {
          type: "checkbox",
          className: ["expand-toggle"],
          ariaLabel: expandLabel,
        },
        children: [],
      },
    ],
  };
}

function copyButton(): Element {
  return {
    type: "element",
    tagName: "button",
    properties: {
      type: "button",
      className: ["copy-code", "mono"],
      ariaLabel: "Copy code to clipboard",
    },
    children: [{ type: "text", value: "Copy" }],
  };
}

function actionsDiv(children: Element[]): Element {
  return {
    type: "element",
    tagName: "div",
    properties: { className: ["code-actions"] },
    children,
  };
}

// The header is a sibling of the block, not a child — inside the block
// its labels would concatenate into the content's accessible text.
function frameBlock(
  block: Element,
  opts: {
    label: string;
    expandLabel: string;
    modifier?: string;
    actions?: Element[];
  },
): Element {
  const head: Element = {
    type: "element",
    tagName: "div",
    properties: { className: ["code-head"] },
    children: [
      {
        type: "element",
        tagName: "span",
        properties: { className: ["code-lang", "mono"] },
        children: [{ type: "text", value: opts.label }],
      },
      actionsDiv([expandToggle(opts.expandLabel), ...(opts.actions ?? [])]),
    ],
  };
  return {
    type: "element",
    tagName: "div",
    properties: {
      className: opts.modifier ? ["code-frame", opts.modifier] : ["code-frame"],
    },
    children: [head, block],
  };
}

function framePre(pre: Element): Element {
  // Shiki stamps data-language on the pre; "plaintext" is its unlabeled
  // fallback, not worth announcing.
  const lang = pre.properties.dataLanguage;
  return frameBlock(pre, {
    label: typeof lang === "string" && lang !== "plaintext" ? lang : "",
    expandLabel: "Expand code block to the panel width",
    actions: [copyButton()],
  });
}

// Tables ride the same frame via a .table-scroll wrapper as the scroll
// container — a table element can't clip-and-scroll itself without
// giving up table layout (and with it, full-width row rules).
function frameTable(table: Element): Element {
  const scroll: Element = {
    type: "element",
    tagName: "div",
    properties: { className: ["table-scroll"] },
    children: [table],
  };
  return frameBlock(scroll, {
    label: "table",
    expandLabel: "Expand table to the panel width",
    modifier: "table-frame",
  });
}

function hasClass(node: Element, name: string): boolean {
  const className = node.properties.className;
  return Array.isArray(className) && className.includes(name);
}

// Diagram plates ship their own header (the eyebrow figcaption) and
// scroll container from rehypeMermaid, so they join the expand system
// without a second frame. The actions are chrome, not caption: a
// sibling of the figcaption (CSS overlays it on the eyebrow band), so
// the caption's text — what find-in-page, selection, and extractors
// read — never contains a button label. Same reasoning as the
// code-frame's header-as-sibling.
function armPlate(plate: Element): void {
  const eyebrow = plate.children.findIndex(
    (child): child is Element =>
      child.type === "element" && hasClass(child, "diagram-eyebrow"),
  );
  if (eyebrow === -1) return;
  plate.children.splice(
    eyebrow + 1,
    0,
    actionsDiv([expandToggle("Expand diagram to the panel width")]),
  );
}

function frameChildren(node: Root | Element): void {
  node.children.forEach((child, index) => {
    if (child.type !== "element") return;
    if (child.tagName === "pre") {
      node.children[index] = framePre(child);
    } else if (child.tagName === "table") {
      node.children[index] = frameTable(child);
    } else if (child.tagName === "figure" && hasClass(child, "diagram-plate")) {
      armPlate(child);
    } else {
      // recurse so blocks nested in alerts/details/blockquotes frame too
      frameChildren(child);
    }
  });
}

export default function rehypeFrames() {
  return (tree: Root): void => {
    frameChildren(tree);
  };
}
