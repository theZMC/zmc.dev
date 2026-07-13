import type { Element, ElementContent } from "./rehype-mermaid";

// Sequence message and condition labels sit directly on the lifelines
// mermaid routes beneath them — the line runs through the word gaps and
// the text has to compete with it. Labels that collide with a lifeline
// get the marginalia treatment here: a brass-washed chip (the notes'
// recipe) seats the label as an annotation, and the lifeline is cut
// into segments around the chip — an honest break, not painted-over
// pixels, so it holds on any surface in both themes.
//
// The geometry is arithmetic, not measurement: the diagram font is
// strictly monospace (9px advance at the 15px body size), so a label's
// ink box follows from its character count. Message labels are also
// re-anchored from dominant-baseline: middle (whose seat WebKit and
// Chromium disagree on) to an explicit alphabetic baseline, which is
// what makes the chip math exact everywhere.

/** Monospace advance width at the 15px body size (0.6em). */
const ADVANCE = 9;

/**
 * Chromium's rendered seat for mermaid's y + dy="1em" +
 * dominant-baseline: middle message labels, restated as an explicit
 * baseline offset: 1em (15) + the measured middle-baseline offset
 * (4.09, getBBox). The chip tracks the text wherever it sits.
 */
const BASELINE_SHIFT = 19.1;

/** Ink envelope around the baseline at 15px: brackets reach 12.46px up,
 * descenders 3.4px down (canvas-measured, rounded out). */
const INK_ASCENT = 12.5;
const INK_DESCENT = 3.5;

/** Chip padding: glyph ink to chip edge. Sides stay at 6 so a chip
 * fitted to a frame-width label still clears the loop frame's dotted
 * rules by ~4px instead of grazing them. */
const PAD_X = 6;
const PAD_Y = 4;

const CHIP_STYLE = [
  "fill: var(--diagram-note-bg)",
  "stroke: var(--diagram-note-border)",
  "stroke-width: 1",
].join("; ");

interface Chip {
  left: number;
  top: number;
  width: number;
  height: number;
}

function isElement(node: ElementContent): node is Element {
  return node.type === "element";
}

function hasClass(node: Element, name: string): boolean {
  const className = node.properties.className;
  return Array.isArray(className) && className.includes(name);
}

function textContent(node: Element): string {
  let out = "";
  for (const child of node.children) {
    if (child.type === "text") out += child.value;
    else if (isElement(child)) out += textContent(child);
  }
  return out;
}

// Wrapped labels stack tspans with their own dy offsets; only
// single-line labels are seated and chipped.
function isSingleLine(text: Element): boolean {
  return text.children.every(
    (child) =>
      !isElement(child) ||
      child.tagName !== "tspan" ||
      !child.properties.dy ||
      Number(child.properties.dy) === 0,
  );
}

/** A label's chip box, once its baseline is explicit. */
function chipFor(text: Element): Chip | undefined {
  const centerX = Number(text.properties.x);
  const baseline = Number(text.properties.y);
  const ink = textContent(text).length * ADVANCE;
  if (!Number.isFinite(centerX) || !Number.isFinite(baseline) || ink === 0) {
    return undefined;
  }
  return {
    left: centerX - ink / 2 - PAD_X,
    top: baseline - INK_ASCENT - PAD_Y,
    width: ink + 2 * PAD_X,
    height: INK_ASCENT + INK_DESCENT + 2 * PAD_Y,
  };
}

function chipElement(chip: Chip): Element {
  return {
    type: "element",
    tagName: "rect",
    properties: {
      className: ["label-chip"],
      x: chip.left,
      y: chip.top,
      width: chip.width,
      height: chip.height,
      rx: 2,
      ry: 2,
      style: CHIP_STYLE,
    },
    children: [],
  };
}

/** Vertical lifelines a chip interrupts: x inside the chip's span. */
function crossings(lines: Element[], chip: Chip): Element[] {
  return lines.filter((line) => {
    const x1 = Number(line.properties.x1);
    const x2 = Number(line.properties.x2);
    const y1 = Number(line.properties.y1);
    const y2 = Number(line.properties.y2);
    return (
      x1 === x2 &&
      x1 >= chip.left &&
      x1 <= chip.left + chip.width &&
      Math.min(y1, y2) < chip.top + chip.height &&
      Math.max(y1, y2) > chip.top
    );
  });
}

/** Replace a lifeline with the segments left after its cuts. */
function segmentLine(
  line: Element,
  parent: Element,
  cuts: Array<[number, number]>,
): void {
  const top = Math.min(Number(line.properties.y1), Number(line.properties.y2));
  const bottom = Math.max(
    Number(line.properties.y1),
    Number(line.properties.y2),
  );

  const merged = cuts
    .map(([a, b]): [number, number] => [Math.max(a, top), Math.min(b, bottom)])
    .filter(([a, b]) => b > a)
    .sort((a, b) => a[0] - b[0])
    .reduce<Array<[number, number]>>((acc, cut) => {
      const last = acc[acc.length - 1];
      if (last && cut[0] <= last[1]) last[1] = Math.max(last[1], cut[1]);
      else acc.push(cut);
      return acc;
    }, []);

  const spans: Array<[number, number]> = [];
  let cursor = top;
  for (const [a, b] of merged) {
    if (a > cursor) spans.push([cursor, a]);
    cursor = Math.max(cursor, b);
  }
  if (cursor < bottom) spans.push([cursor, bottom]);

  const segments = spans.map(
    ([a, b]): Element => ({
      type: "element",
      tagName: "line",
      properties: { ...line.properties, y1: a, y2: b },
      children: [],
    }),
  );
  parent.children.splice(parent.children.indexOf(line), 1, ...segments);
}

/**
 * Seat sequence message labels on explicit baselines, and give any
 * label a lifeline runs through a brass-washed chip with the line cut
 * around it. Labels in open space stay bare; other diagram types pass
 * through untouched.
 */
export function chipCollidingLabels(svg: Element): void {
  // hast parses aria-roledescription as a space-separated token list.
  const role = svg.properties.ariaRoleDescription;
  const tokens = (Array.isArray(role) ? role : [role]).map(String);
  if (!tokens.includes("sequence")) return;

  const lines: Element[] = [];
  const lineParents = new Map<Element, Element>();
  const labels: Array<{ text: Element; parent: Element }> = [];

  const walk = (node: Element): void => {
    for (const child of node.children) {
      if (!isElement(child)) continue;
      if (child.tagName === "line" && hasClass(child, "actor-line")) {
        lines.push(child);
        lineParents.set(child, node);
      }
      if (
        child.tagName === "text" &&
        (hasClass(child, "messageText") ||
          hasClass(child, "loopText") ||
          hasClass(child, "sectionTitle")) &&
        isSingleLine(child)
      ) {
        labels.push({ text: child, parent: node });
      }
      walk(child);
    }
  };
  walk(svg);

  const cuts = new Map<Element, Array<[number, number]>>();

  for (const { text, parent } of labels) {
    if (hasClass(text, "messageText")) {
      text.properties.y = Number(text.properties.y) + BASELINE_SHIFT;
      delete text.properties.dy;
      delete text.properties.dominantBaseline;
      delete text.properties.alignmentBaseline;
    }

    const chip = chipFor(text);
    if (!chip) continue;
    const crossed = crossings(lines, chip);
    if (crossed.length === 0) continue;

    parent.children.splice(
      parent.children.indexOf(text),
      0,
      chipElement(chip),
    );
    for (const line of crossed) {
      const list = cuts.get(line) ?? [];
      list.push([chip.top, chip.top + chip.height]);
      cuts.set(line, list);
    }
  }

  for (const [line, ranges] of cuts) {
    const parent = lineParents.get(line);
    if (parent) segmentLine(line, parent, ranges);
  }
}
