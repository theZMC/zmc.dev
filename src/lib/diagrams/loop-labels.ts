import { CLUSTER_TITLE_STYLE } from "./cluster-titles";
import type { Element, ElementContent } from "./rehype-mermaid";

// Mermaid badges sequence control structures (loop/alt/opt/par) with a
// notched flag whose 15px label overflows its own pentagon — ink runs
// into the notch. Restyled here in the flowchart cluster titles' voice
// instead: the flag goes away and the keyword becomes chart furniture —
// small, tracked, uppercase, brass — tucked into the frame's top-left
// corner, sharing a baseline with the condition text so the frame reads
// as having one header row.

/** Distance from the frame's left border to the keyword's first glyph —
 * the same inset cluster titles use. */
const LABEL_INSET_X = 12;

/**
 * Condition baseline below its rule (the frame's top for the header
 * condition, the section divider for alt/else, par/and, critical/
 * option). Mermaid seats every condition 18 below its rule; 21 buys
 * the condition's label chip (label-chips.ts, ascent 12.5 + pad 4
 * above the baseline) a 4.5px clearance from the rule instead of
 * hanging off it.
 */
const CONDITION_BASELINE_Y = 21;

/** Mermaid's own condition seat below a rule, restated to convert a
 * seated baseline back to its rule. */
const MERMAID_CONDITION_Y = 18;

function isElement(node: ElementContent): node is Element {
  return node.type === "element";
}

function hasClass(node: Element, name: string): boolean {
  const className = node.properties.className;
  return Array.isArray(className) && className.includes(name);
}

function uppercaseText(node: Element): void {
  for (const child of node.children) {
    if (child.type === "text") child.value = child.value.toUpperCase();
    else if (isElement(child)) uppercaseText(child);
  }
}

function restyleControlStructure(group: Element): void {
  const flag = group.children.find(
    (child): child is Element =>
      isElement(child) && hasClass(child, "labelBox"),
  );
  const keyword = group.children.find(
    (child): child is Element =>
      isElement(child) && hasClass(child, "labelText"),
  );
  if (!flag || !keyword) return;

  // The flag hugs the frame's top-left corner, so its first point is
  // the corner mermaid aligned everything else to.
  const [corner] = String(flag.properties.points ?? "").split(" ");
  const [left, top] = corner.split(",").map(Number);
  if (!Number.isFinite(left) || !Number.isFinite(top)) return;

  const baseline = top + CONDITION_BASELINE_Y;
  const nudge = CONDITION_BASELINE_Y - MERMAID_CONDITION_Y;
  for (const child of group.children) {
    if (!isElement(child)) continue;
    // Header condition joins the keyword's baseline; section conditions
    // (alt/else, par/and, critical/option) shift off their dividers by
    // the same margin.
    if (hasClass(child, "loopText")) child.properties.y = baseline;
    if (hasClass(child, "sectionTitle")) {
      child.properties.y = Number(child.properties.y) + nudge;
    }
  }

  group.children = group.children.filter((child) => child !== flag);

  keyword.properties.x = left + LABEL_INSET_X;
  keyword.properties.y = baseline;
  keyword.properties.textAnchor = "start";
  delete keyword.properties.dominantBaseline;
  delete keyword.properties.alignmentBaseline;
  keyword.properties.style = CLUSTER_TITLE_STYLE;
  uppercaseText(keyword);
}

/**
 * Drop the notched keyword flag from sequence control structures and
 * restyle the keyword as tracked-uppercase furniture in the frame's
 * top-left corner, kin to flowchart cluster titles. Other diagram types
 * pass through untouched.
 */
export function restyleLoopLabels(svg: Element): void {
  // hast parses aria-roledescription as a space-separated token list.
  const role = svg.properties.ariaRoleDescription;
  const tokens = (Array.isArray(role) ? role : [role]).map(String);
  if (!tokens.includes("sequence")) return;

  const walk = (node: Element): void => {
    for (const child of node.children) {
      if (!isElement(child)) continue;
      if (child.tagName === "g" && child.properties.dataEt === "control-structure") {
        restyleControlStructure(child);
      }
      walk(child);
    }
  };
  walk(svg);
}
