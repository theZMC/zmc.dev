import { describe, expect, it } from "vitest";
import rehypeMermaid, {
  toRoman,
  type Element,
  type Root,
} from "./rehype-mermaid";

describe("toRoman", () => {
  it("counts figures the instrument way", () => {
    expect([1, 2, 4, 9, 14, 40].map(toRoman)).toEqual([
      "I",
      "II",
      "IV",
      "IX",
      "XIV",
      "XL",
    ]);
  });
});

function mermaidPre(source: string): Element {
  return {
    type: "element",
    tagName: "pre",
    properties: {},
    children: [
      {
        type: "element",
        tagName: "code",
        properties: { className: ["language-mermaid"] },
        children: [{ type: "text", value: source }],
      },
    ],
  };
}

function findAll(node: Root | Element, tagName: string): Element[] {
  const hits: Element[] = [];
  for (const child of node.children) {
    if (child.type !== "element") continue;
    if (child.tagName === tagName) hits.push(child);
    hits.push(...findAll(child, tagName));
  }
  return hits;
}

// Drives the full transform, headless chromium included.
describe("rehypeMermaid", () => {
  it("replaces fences with numbered figure plates, in document order", async () => {
    const tree: Root = {
      type: "root",
      children: [
        mermaidPre("---\ntitle: The Route In\n---\ngraph TB\n  A --> B\n"),
        {
          type: "element",
          tagName: "p",
          properties: {},
          children: [{ type: "text", value: "prose between" }],
        },
        mermaidPre("graph LR\n  C --> D\n"),
      ],
    };

    await rehypeMermaid()(tree, { path: "/repo/post.md", cwd: "/repo" });

    const figures = findAll(tree, "figure");
    expect(figures).toHaveLength(2);
    expect(findAll(tree, "pre")).toHaveLength(0);

    const [first, second] = figures;
    expect(first.properties.className).toEqual(["diagram-plate"]);
    expect(first.properties.style).toMatch(/^--w: \d+(\.\d+)?px$/);

    const captionText = (fig: Element): string =>
      JSON.stringify(findAll(fig, "figcaption"));
    expect(captionText(first)).toContain("Fig. I");
    expect(captionText(first)).toContain("The Route In");
    expect(captionText(second)).toContain("Fig. II");
    expect(captionText(second)).not.toContain("diagram-fig-title");

    // titled diagram: SVG named by the title; untitled: by figure number
    const svgs = figures.map((fig) => findAll(fig, "svg")[0]);
    expect(svgs[0].properties.ariaLabel).toBe("The Route In");
    expect(svgs[1].properties.ariaLabel).toBe("Figure II: diagram");
  }, 60_000);

  it("uppercases cluster titles into the eyebrow voice", async () => {
    const tree: Root = {
      type: "root",
      children: [
        mermaidPre('graph TB\n  subgraph Dome["Dome — public"]\n    A\n  end\n'),
      ],
    };
    await rehypeMermaid()(tree, { cwd: "/repo" });
    // mermaid splits labels into per-word tspans, so assert per word —
    // and only against text nodes (the cluster's DOM id keeps its case)
    const html = JSON.stringify(tree);
    expect(html).toContain('"value":"DOME"');
    expect(html).toContain("PUBLIC");
    expect(html).not.toContain('"value":"Dome"');
    expect(html).not.toContain("public");
  }, 60_000);

  it("leaves trees without mermaid fences untouched", async () => {
    const tree: Root = {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "pre",
          properties: {},
          children: [
            {
              type: "element",
              tagName: "code",
              properties: { className: ["language-ts"] },
              children: [{ type: "text", value: "const x = 1;" }],
            },
          ],
        },
      ],
    };
    const before = JSON.stringify(tree);
    await rehypeMermaid()(tree, { cwd: "/repo" });
    expect(JSON.stringify(tree)).toBe(before);
  });
});
