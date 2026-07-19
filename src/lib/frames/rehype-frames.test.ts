import { describe, expect, it } from "vitest";
import type { Element, Root } from "../diagrams/rehype-mermaid";
import rehypeFrames from "./rehype-frames";

function shikiPre(language?: string): Element {
  return {
    type: "element",
    tagName: "pre",
    properties: {
      className: ["astro-code", "astro-code-themes", "zmc-light", "zmc-dark"],
      style: "--shiki-light:#111;--shiki-dark:#eee; overflow-x: auto;",
      tabIndex: 0,
      ...(language ? { dataLanguage: language } : {}),
    },
    children: [
      {
        type: "element",
        tagName: "code",
        properties: {},
        children: [{ type: "text", value: "const x = 1;" }],
      },
    ],
  };
}

function table(): Element {
  return {
    type: "element",
    tagName: "table",
    properties: {},
    children: [
      {
        type: "element",
        tagName: "tbody",
        properties: {},
        children: [],
      },
    ],
  };
}

function plate(): Element {
  return {
    type: "element",
    tagName: "figure",
    properties: { className: ["diagram-plate"], style: "--w: 640px" },
    children: [
      {
        type: "element",
        tagName: "figcaption",
        properties: { className: ["diagram-eyebrow"] },
        children: [
          {
            type: "element",
            tagName: "span",
            properties: { className: ["diagram-fig-no"] },
            children: [{ type: "text", value: "Fig. I" }],
          },
        ],
      },
      {
        type: "element",
        tagName: "div",
        properties: { className: ["diagram-scroll"] },
        children: [],
      },
    ],
  };
}

function root(...children: Element[]): Root {
  return { type: "root", children } as Root;
}

function classes(node: Element): string[] {
  return Array.isArray(node.properties.className)
    ? (node.properties.className as string[])
    : [];
}

function findAll(
  node: Root | Element,
  match: (el: Element) => boolean,
): Element[] {
  const hits: Element[] = [];
  for (const child of node.children) {
    if (child.type !== "element") continue;
    if (match(child)) hits.push(child);
    hits.push(...findAll(child, match));
  }
  return hits;
}

const byClass = (name: string) => (el: Element) => classes(el).includes(name);
const byTag = (tagName: string) => (el: Element) => el.tagName === tagName;

describe("rehypeFrames", () => {
  it("frames a Shiki pre: header sibling first, original node kept by identity", () => {
    const pre = shikiPre("go");
    const tree = root(pre);
    rehypeFrames()(tree);

    const [frame] = findAll(tree, byClass("code-frame"));
    expect(frame).toBeTruthy();
    expect(frame.children).toHaveLength(2);

    const [head, framedPre] = frame.children as Element[];
    expect(classes(head)).toEqual(["code-head"]);
    // moved, never cloned or mutated — Shiki's classes/style/tabindex survive
    expect(framedPre).toBe(pre);

    const [lang] = findAll(frame, byClass("code-lang"));
    expect(lang.children).toEqual([{ type: "text", value: "go" }]);

    const [expand] = findAll(frame, byClass("expand-code"));
    expect(expand.tagName).toBe("label");
    const [toggle] = findAll(expand, byClass("expand-toggle"));
    expect(toggle.tagName).toBe("input");
    expect(toggle.properties).toMatchObject({
      type: "checkbox",
      ariaLabel: "Expand code block to the panel width",
    });
    // no text node: the visible word is CSS content keyed to :checked
    expect(expand.children).toEqual([toggle]);

    const [copy] = findAll(frame, byClass("copy-code"));
    expect(copy.properties).toMatchObject({
      type: "button",
      ariaLabel: "Copy code to clipboard",
    });
  });

  it("leaves Shiki's unlabeled fallback and bare pres untagged", () => {
    const tree = root(shikiPre("plaintext"), shikiPre());
    rehypeFrames()(tree);
    const langs = findAll(tree, byClass("code-lang"));
    expect(langs).toHaveLength(2);
    for (const lang of langs) {
      expect(lang.children).toEqual([{ type: "text", value: "" }]);
    }
  });

  it("frames a table inside a .table-scroll scroller, no copy button", () => {
    const t = table();
    const tree = root(t);
    rehypeFrames()(tree);

    const [frame] = findAll(tree, byClass("code-frame"));
    expect(classes(frame)).toEqual(["code-frame", "table-frame"]);

    const [, scroll] = frame.children as Element[];
    expect(classes(scroll)).toEqual(["table-scroll"]);
    expect(scroll.children[0]).toBe(t);

    const [lang] = findAll(frame, byClass("code-lang"));
    expect(lang.children).toEqual([{ type: "text", value: "table" }]);
    expect(findAll(frame, byClass("copy-code"))).toHaveLength(0);
    const [toggle] = findAll(frame, byClass("expand-toggle"));
    expect(toggle.properties.ariaLabel).toBe("Expand table to the panel width");
  });

  it("arms a diagram plate: actions spliced directly after the figcaption", () => {
    const fig = plate();
    const tree = root(fig);
    rehypeFrames()(tree);

    // no second frame around the figure
    expect(findAll(tree, byClass("code-frame"))).toHaveLength(0);

    const children = fig.children as Element[];
    expect(classes(children[0])).toEqual(["diagram-eyebrow"]);
    expect(classes(children[1])).toEqual(["code-actions"]);
    expect(classes(children[2])).toEqual(["diagram-scroll"]);

    // chrome, not caption: the figcaption's own content stays control-free
    expect(findAll(children[0], byClass("expand-code"))).toHaveLength(0);
    expect(findAll(children[0], byTag("input"))).toHaveLength(0);
    const [toggle] = findAll(children[1], byClass("expand-toggle"));
    expect(toggle.properties.ariaLabel).toBe(
      "Expand diagram to the panel width",
    );
  });

  it("reaches blocks nested in alerts, without double-framing", () => {
    const tree = root({
      type: "element",
      tagName: "aside",
      properties: { className: ["markdown-alert"] },
      children: [shikiPre("ts"), table()],
    });
    rehypeFrames()(tree);
    expect(findAll(tree, byClass("code-frame"))).toHaveLength(2);
    expect(findAll(tree, byClass("code-head"))).toHaveLength(2);
    expect(findAll(tree, byClass("expand-code"))).toHaveLength(2);
  });

  it("leaves trees without targets untouched", () => {
    const tree = root({
      type: "element",
      tagName: "p",
      properties: {},
      children: [{ type: "text", value: "prose only" }],
    });
    const before = JSON.stringify(tree);
    rehypeFrames()(tree);
    expect(JSON.stringify(tree)).toBe(before);
  });
});
