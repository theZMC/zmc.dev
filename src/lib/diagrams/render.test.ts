import { describe, expect, it } from "vitest";
import { prepareDiagram, renderDiagrams } from "./render";

describe("prepareDiagram", () => {
  it("passes untitled fences through untouched", () => {
    const raw = "graph TB\n  A --> B\n";
    expect(prepareDiagram(raw)).toEqual({ source: raw });
  });

  it("lifts the frontmatter title and drops an emptied block", () => {
    const { source, title } = prepareDiagram(
      "---\ntitle: Carving the VPC\n---\ngraph TB\n  A --> B\n",
    );
    expect(title).toBe("Carving the VPC");
    expect(source).toBe("graph TB\n  A --> B\n");
  });

  it("keeps other frontmatter keys for mermaid to honor", () => {
    const { source, title } = prepareDiagram(
      "---\ntitle: T\nconfig:\n  theme: forest\n---\ngraph TB\n  A --> B\n",
    );
    expect(title).toBe("T");
    expect(source).toMatch(/^---\nconfig:\n {2}theme: forest\n---\n/);
    expect(source).not.toContain("title");
  });
});

// Exercises the real headless-chromium pipeline (needs
// `pnpm exec playwright install chromium` once per machine).
describe("renderDiagrams", () => {
  const fence = `---
title: Carving the VPC
---
graph TB
    Client([Internet Client])
    subgraph VPC
        subgraph Public["Public Subnet"]
            LB["Load Balancer<br/>public IP + private IP"]
        end
        subgraph Private["Private Subnet"]
            App1["Workload<br/>private IP only"]
        end
    end
    Client --> LB
    LB --> App1
`;

  it("renders theme-aware SVG: vars in, sentinels/foreignObject/max-width out", async () => {
    const [d] = await renderDiagrams([fence], "render.test.ts");
    expect(d.title).toBe("Carving the VPC");
    expect(d.width).toBeGreaterThan(0);
    expect(d.height).toBeGreaterThan(0);
    expect(d.svg).toContain("var(--diagram-");
    // htmlLabels:false — pure SVG text survives Astro's rehype-raw pass
    expect(d.svg).not.toContain("<foreignObject");
    // useMaxWidth:false — numeric root sizing, no injected max-width
    // style on the <svg> tag itself (the plate CSS owns sizing; the
    // .mermaidTooltip boilerplate rule elsewhere is inert)
    const rootTag = d.svg.slice(0, d.svg.indexOf(">") + 1);
    expect(rootTag).toMatch(/width="\d/);
    expect(rootTag).toMatch(/height="\d/);
    expect(rootTag).not.toContain("max-width");
    // the frontmatter title feeds the figcaption, never baked-in SVG text
    expect(d.svg).not.toContain("Carving the VPC");
  }, 60_000);

  it("fails loudly, naming the diagram, on a mermaid parse error", async () => {
    await expect(
      renderDiagrams(["graph TB\n  A --> --> B\n"], "post.md"),
    ).rejects.toThrow(/post\.md, diagram 1: mermaid failed/);
  }, 60_000);
});
