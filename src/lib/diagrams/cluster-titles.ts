import type { Element, ElementContent } from "./rehype-mermaid";

// Mermaid centers subgraph titles over the cluster, in body-text ink, so
// they sit exactly where vertical edges run and read as just another
// label. Restyled here as chart furniture instead — kin to the
// code-frame's language hint: small, tracked, uppercase, brass — and
// left-aligned into the cluster's top-left corner, out of the path of
// centered edges. Pure attribute rewrites on geometry mermaid already
// computed; no repainting, no measurement.

/** Distance from the cluster's left border to the title's first glyph. */
const TITLE_INSET_X = 12;

/** The language-hint recipe, sized to the diagram's 15px body type. */
export const CLUSTER_TITLE_STYLE = [
  "fill: var(--diagram-cluster-title, #8f6f35)",
  "font-size: 10px",
  "letter-spacing: 0.3em",
].join("; ");

const TRANSLATE = /^translate\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)$/;

function isElement(node: ElementContent): node is Element {
  return node.type === "element";
}

function hasClass(node: Element, name: string): boolean {
  const className = node.properties.className;
  return Array.isArray(className) && className.includes(name);
}

function walk(node: Element, visit: (el: Element) => void): void {
  visit(node);
  for (const child of node.children) {
    if (isElement(child)) walk(child, visit);
  }
}

// Uppercase in the markup, not via CSS text-transform: SVG text styling
// support varies across engines and the swap must not depend on it.
function uppercaseText(node: Element): void {
  for (const child of node.children) {
    if (child.type === "text") child.value = child.value.toUpperCase();
    else if (isElement(child)) uppercaseText(child);
  }
}

function restyleCluster(cluster: Element): void {
  const box = cluster.children.find(
    (child): child is Element => isElement(child) && child.tagName === "rect",
  );
  const label = cluster.children.find(
    (child): child is Element =>
      isElement(child) && hasClass(child, "cluster-label"),
  );
  if (!box || !label) return;

  const left = Number(box.properties.x);
  const transform = String(label.properties.transform ?? "");
  const translate = TRANSLATE.exec(transform);
  if (!Number.isFinite(left) || !translate) return;

  label.properties.transform = `translate(${left + TITLE_INSET_X}, ${translate[2]})`;

  walk(label, (el) => {
    if (el.tagName !== "text") return;
    el.properties.style = CLUSTER_TITLE_STYLE;
    uppercaseText(el);
  });
}

/**
 * Left-align flowchart subgraph titles into the cluster's top-left
 * corner and restyle them as small tracked-uppercase furniture, so they
 * stop colliding with the edges dagre routes through the cluster's
 * center line. Other diagram types pass through untouched.
 */
export function restyleClusterTitles(svg: Element): void {
  // hast parses aria-roledescription as a space-separated token list.
  const role = svg.properties.ariaRoleDescription;
  const tokens = (Array.isArray(role) ? role : [role]).map(String);
  if (!tokens.includes("flowchart-v2")) return;

  walk(svg, (el) => {
    if (el.tagName === "g" && hasClass(el, "cluster")) restyleCluster(el);
  });
}
