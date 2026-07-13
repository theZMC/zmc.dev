import type { Element, ElementContent } from "./rehype-mermaid";

// Mermaid hangs sequence actor names on dominant-baseline: central, and
// engines resolve "central" against different font tables — WebKit sets
// the same label several pixels higher than Chromium, so the box reads
// top-heavy on Safari no matter what the layout math says. Re-anchored
// here on an explicit baseline instead: baseline position is the one
// vertical reference every engine places identically. The label is set
// so cap-top clearance equals baseline-to-bottom clearance — optically
// centered, same padding above and below.

/**
 * Cap height of Spline Sans Mono at the diagram's 15px body size,
 * canvas-measured ('OTH' actualBoundingBoxAscent). Build-time constant
 * for a pinned font; revisit only if the diagram face changes.
 */
const CAP_HEIGHT = 11.1;

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

// Only single-line labels are re-anchored: stacked tspans carry their
// own dy offsets relative to the central anchor, and the kitchen sink's
// coverage keeps this honest before any multi-line actor ships.
function isSingleLine(text: Element): boolean {
  return text.children.every(
    (child) =>
      !isElement(child) ||
      child.tagName !== "tspan" ||
      !child.properties.dy ||
      Number(child.properties.dy) === 0,
  );
}

function reanchor(group: Element): void {
  const box = group.children.find(
    (child): child is Element =>
      isElement(child) && child.tagName === "rect" && hasClass(child, "actor"),
  );
  const label = group.children.find(
    (child): child is Element =>
      isElement(child) &&
      child.tagName === "text" &&
      hasClass(child, "actor-box"),
  );
  if (!box || !label || !isSingleLine(label)) return;

  const top = Number(box.properties.y);
  const height = Number(box.properties.height);
  if (!Number.isFinite(top) || !Number.isFinite(height)) return;

  // Baseline such that (baseline - capHeight) - top === bottom - baseline.
  label.properties.y = top + (height + CAP_HEIGHT) / 2;
  delete label.properties.dominantBaseline;
  delete label.properties.alignmentBaseline;
}

/**
 * Anchor sequence actor names on an explicit baseline, vertically
 * centered between cap-top and baseline clearance, so the label sits in
 * the same place in every engine. Other diagram types pass through
 * untouched.
 */
export function reanchorActorLabels(svg: Element): void {
  // hast parses aria-roledescription as a space-separated token list.
  const role = svg.properties.ariaRoleDescription;
  const tokens = (Array.isArray(role) ? role : [role]).map(String);
  if (!tokens.includes("sequence")) return;

  walk(svg, (el) => {
    if (el.tagName === "g") reanchor(el);
  });
}
