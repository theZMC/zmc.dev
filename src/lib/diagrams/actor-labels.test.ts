import { fromHtmlIsomorphic } from "hast-util-from-html-isomorphic";
import { describe, expect, it } from "vitest";
import { reanchorActorLabels } from "./actor-labels";
import type { Element } from "./rehype-mermaid";

// Trimmed from a real mermaid 11.16 sequence render (kitchen sink,
// Fig. IV): a top participant box and its bottom mirror, both hung on
// dominant-baseline: central. Heights match the height: 72 config.
const ACTORS = `
  <g id="root-0" data-et="participant" data-type="participant" data-id="O">
    <rect x="0" y="0" width="150" height="72" rx="3" ry="3" class="actor actor-top"></rect>
    <text x="75" y="36" dominant-baseline="central" alignment-baseline="central"
      class="actor actor-box" style="text-anchor: middle; font-size: 15px;"
      ><tspan x="75" dy="0">Observer</tspan></text>
  </g>
  <g>
    <rect x="0" y="386" width="150" height="72" rx="3" ry="3" class="actor actor-bottom"></rect>
    <text x="75" y="422" dominant-baseline="central" alignment-baseline="central"
      class="actor actor-box" style="text-anchor: middle; font-size: 15px;"
      ><tspan x="75" dy="0">Observer</tspan></text>
  </g>`;

function svgWith(role: string, body: string): Element {
  return fromHtmlIsomorphic(
    `<svg aria-roledescription="${role}" viewBox="0 0 600 500">${body}</svg>`,
    { fragment: true },
  ).children[0] as Element;
}

function findAll(node: Element, match: (el: Element) => boolean): Element[] {
  const hits: Element[] = [];
  if (match(node)) hits.push(node);
  for (const child of node.children) {
    if (child.type === "element") hits.push(...findAll(child, match));
  }
  return hits;
}

describe("reanchorActorLabels", () => {
  it("anchors actor names on an explicit, optically centered baseline", () => {
    const svg = svgWith("sequence", ACTORS);
    reanchorActorLabels(svg);

    const labels = findAll(svg, (el) => el.tagName === "text");
    expect(labels).toHaveLength(2);
    // rect.y + (72 + 11.1 cap) / 2 — cap-top and baseline clearance equal
    expect(labels[0].properties.y).toBeCloseTo(41.55);
    expect(labels[1].properties.y).toBeCloseTo(427.55);
    for (const label of labels) {
      expect(label.properties.dominantBaseline).toBeUndefined();
      expect(label.properties.alignmentBaseline).toBeUndefined();
    }
  });

  it("leaves other diagram types alone", () => {
    const svg = svgWith("flowchart-v2", ACTORS);
    const before = JSON.stringify(svg);
    reanchorActorLabels(svg);
    expect(JSON.stringify(svg)).toBe(before);
  });
});
