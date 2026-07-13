import { fromHtmlIsomorphic } from "hast-util-from-html-isomorphic";
import { describe, expect, it } from "vitest";
import { chipCollidingLabels } from "./label-chips";
import type { Element } from "./rehype-mermaid";

// Trimmed from a real mermaid 11.16 sequence render (kitchen sink,
// Fig. IV): two lifelines, the loop condition and self-message label
// that straddle the Telescope lifeline (x=277), and a message label
// ("aim at M31") that floats in open space between the lifelines.
const SEQUENCE = `
  <line id="actor0" x1="76" y1="72" x2="76" y2="393" class="actor-line 200"></line>
  <line id="actor1" x1="277" y1="72" x2="277" y2="393" class="actor-line 200"></line>
  <text x="174" y="87" text-anchor="middle" dominant-baseline="middle"
    alignment-baseline="middle" class="messageText" dy="1em">aim at M31</text>
  <g data-et="control-structure">
    <text x="301" y="240" text-anchor="middle" class="loopText"
      ><tspan x="301">[every 30s]</tspan></text>
  </g>
  <text x="276" y="321" text-anchor="middle" dominant-baseline="middle"
    alignment-baseline="middle" class="messageText" dy="1em">autoguide correction</text>
  <text x="276" y="380" text-anchor="middle" class="sectionTitle">[clouded over]</text>`;

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

const byClass = (name: string) => (el: Element) =>
  Array.isArray(el.properties.className) &&
  el.properties.className.includes(name);

describe("chipCollidingLabels", () => {
  it("seats message labels on explicit baselines", () => {
    const svg = svgWith("sequence", SEQUENCE);
    chipCollidingLabels(svg);

    const messages = findAll(svg, byClass("messageText"));
    expect(messages.map((el) => el.properties.y)).toEqual([106.1, 340.1]);
    for (const el of messages) {
      expect(el.properties.dy).toBeUndefined();
      expect(el.properties.dominantBaseline).toBeUndefined();
      expect(el.properties.alignmentBaseline).toBeUndefined();
    }
  });

  it("chips only labels a lifeline runs through", () => {
    const svg = svgWith("sequence", SEQUENCE);
    chipCollidingLabels(svg);

    const chips = findAll(svg, byClass("label-chip"));
    expect(chips).toHaveLength(3);

    // [every 30s]: 11 chars = 99px ink centered at 301, padded 6
    expect(chips[0].properties).toMatchObject({
      x: 301 - 99 / 2 - 6,
      y: 240 - 16.5,
      width: 111,
      height: 24,
    });
    // autoguide correction: 20 chars = 180px centered at 276, baseline 340.1
    expect(chips[1].properties).toMatchObject({
      x: 276 - 90 - 6,
      y: 340.1 - 16.5,
      width: 192,
      height: 24,
    });
    // [clouded over]: sectionTitle, 14 chars = 126px, plain baseline 380
    expect(chips[2].properties).toMatchObject({
      x: 276 - 63 - 6,
      y: 380 - 16.5,
      width: 138,
      height: 24,
    });
    // each chip immediately precedes its label in paint order
    for (const chip of chips) {
      const parentChildren = findAll(
        svg,
        (el) => el.children.some((c) => c === chip),
      )[0].children.filter((c): c is Element => c.type === "element");
      const i = parentChildren.indexOf(chip);
      expect(parentChildren[i + 1].tagName).toBe("text");
    }
  });

  it("cuts the crossed lifeline and spares the clear one", () => {
    const svg = svgWith("sequence", SEQUENCE);
    chipCollidingLabels(svg);

    const observer = findAll(svg, (el) => el.properties.id === "actor0");
    expect(observer).toHaveLength(1);
    expect(observer[0].properties.y1).toBe("72");

    // Telescope line: three cuts -> four segments around the chips
    const telescope = findAll(
      svg,
      (el) => el.tagName === "line" && Number(el.properties.x1) === 277,
    );
    expect(telescope).toHaveLength(4);
    expect(telescope.map((el) => [el.properties.y1, el.properties.y2])).toEqual(
      [
        [72, 240 - 16.5],
        [240 + 7.5, 340.1 - 16.5],
        [340.1 + 7.5, 380 - 16.5],
        [380 + 7.5, 393],
      ],
    );
  });

  it("leaves other diagram types alone", () => {
    const svg = svgWith("flowchart-v2", SEQUENCE);
    const before = JSON.stringify(svg);
    chipCollidingLabels(svg);
    expect(JSON.stringify(svg)).toBe(before);
  });
});
