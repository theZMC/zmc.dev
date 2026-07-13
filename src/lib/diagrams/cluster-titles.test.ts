import { fromHtmlIsomorphic } from "hast-util-from-html-isomorphic";
import { describe, expect, it } from "vitest";
import { CLUSTER_TITLE_STYLE, restyleClusterTitles } from "./cluster-titles";
import type { Element } from "./rehype-mermaid";

// Trimmed from a real mermaid 11.16 flowchart render (kitchen sink,
// Fig. I): one cluster whose title mermaid centered over the box.
const CLUSTER = `
  <g class="clusters">
    <g class="cluster" id="mermaid-0-Dome" data-look="classic">
      <rect style="" x="83.25" y="116" width="443.5" height="114.5"></rect>
      <g class="cluster-label" transform="translate(246.5, 116)">
        <g>
          <rect class="background" style="stroke: none"></rect>
          <text y="-10.1" style="">
            <tspan class="text-outer-tspan row" x="0" y="-0.1em" dy="1.1em"
              ><tspan class="text-inner-tspan">Dome</tspan
              ><tspan class="text-inner-tspan"> —</tspan
              ><tspan class="text-inner-tspan"> public</tspan></tspan>
          </text>
        </g>
      </g>
    </g>
  </g>`;

function svgWith(role: string, body: string): Element {
  return fromHtmlIsomorphic(
    `<svg aria-roledescription="${role}" viewBox="0 0 600 400">${body}</svg>`,
    { fragment: true },
  ).children[0] as Element;
}

function find(node: Element, match: (el: Element) => boolean): Element | undefined {
  if (match(node)) return node;
  for (const child of node.children) {
    if (child.type !== "element") continue;
    const hit = find(child, match);
    if (hit) return hit;
  }
  return undefined;
}

function textContent(node: Element): string {
  let out = "";
  for (const child of node.children) {
    if (child.type === "text") out += child.value;
    else if (child.type === "element") out += textContent(child);
  }
  return out;
}

describe("restyleClusterTitles", () => {
  it("left-aligns the title into the cluster and restyles it as furniture", () => {
    const svg = svgWith("flowchart-v2", CLUSTER);
    restyleClusterTitles(svg);

    const label = find(
      svg,
      (el) =>
        Array.isArray(el.properties.className) &&
        el.properties.className.includes("cluster-label"),
    );
    // rect.x 83.25 + 12 inset; y untouched
    expect(label?.properties.transform).toBe("translate(95.25, 116)");

    const text = find(svg, (el) => el.tagName === "text");
    expect(text?.properties.style).toBe(CLUSTER_TITLE_STYLE);
    // fixture indentation aside, the words themselves are uppercased
    expect(text && textContent(text).trim()).toBe("DOME — PUBLIC");
  });

  it("leaves other diagram types alone", () => {
    const svg = svgWith("stateDiagram", CLUSTER);
    const before = JSON.stringify(svg);
    restyleClusterTitles(svg);
    expect(JSON.stringify(svg)).toBe(before);
  });
});
