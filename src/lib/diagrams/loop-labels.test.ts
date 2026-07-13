import { fromHtmlIsomorphic } from "hast-util-from-html-isomorphic";
import { describe, expect, it } from "vitest";
import { CLUSTER_TITLE_STYLE } from "./cluster-titles";
import { restyleLoopLabels } from "./loop-labels";
import type { Element } from "./rehype-mermaid";

// Trimmed from a real mermaid 11.16 sequence render (kitchen sink,
// Fig. IV): a loop frame with its notched keyword flag and condition.
const LOOP = `
  <g data-et="control-structure" data-id="i7">
    <line x1="176" y1="222" x2="376" y2="222" class="loopLine"></line>
    <polygon points="176,222 226,222 226,235 217.6,242 176,242" class="labelBox"></polygon>
    <text x="201" y="235" text-anchor="middle" dominant-baseline="middle"
      alignment-baseline="middle" class="labelText" style="font-size: 15px;">loop</text>
    <text x="301" y="240" text-anchor="middle" class="loopText"
      style="font-size: 15px;"><tspan x="301">[every 30s]</tspan></text>
  </g>`;

function svgWith(role: string, body: string): Element {
  return fromHtmlIsomorphic(
    `<svg aria-roledescription="${role}" viewBox="0 0 600 500">${body}</svg>`,
    { fragment: true },
  ).children[0] as Element;
}

function find(
  node: Element,
  match: (el: Element) => boolean,
): Element | undefined {
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

describe("restyleLoopLabels", () => {
  it("drops the flag and sets the keyword as corner furniture", () => {
    const svg = svgWith("sequence", LOOP);
    restyleLoopLabels(svg);

    expect(
      find(
        svg,
        (el) =>
          Array.isArray(el.properties.className) &&
          el.properties.className.includes("labelBox"),
      ),
    ).toBeUndefined();

    const keyword = find(
      svg,
      (el) =>
        Array.isArray(el.properties.className) &&
        el.properties.className.includes("labelText"),
    );
    // frame left 176 + 12 inset; baseline shared with the condition
    expect(keyword?.properties.x).toBe(188);
    expect(keyword?.properties.y).toBe(240);
    expect(keyword?.properties.textAnchor).toBe("start");
    expect(keyword?.properties.dominantBaseline).toBeUndefined();
    expect(keyword?.properties.alignmentBaseline).toBeUndefined();
    expect(keyword?.properties.style).toBe(CLUSTER_TITLE_STYLE);
    expect(keyword && textContent(keyword)).toBe("LOOP");

    // the condition itself is untouched — its treatment is a separate concern
    const condition = find(
      svg,
      (el) =>
        Array.isArray(el.properties.className) &&
        el.properties.className.includes("loopText"),
    );
    expect(condition?.properties.y).toBe("240");
    expect(condition && textContent(condition)).toBe("[every 30s]");
  });

  it("leaves other diagram types alone", () => {
    const svg = svgWith("stateDiagram", LOOP);
    const before = JSON.stringify(svg);
    restyleLoopLabels(svg);
    expect(JSON.stringify(svg)).toBe(before);
  });
});
