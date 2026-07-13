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

// One sample per covered diagram type: each must survive the sentinel
// swap with no stray colors and no foreignObject. A mermaid upgrade that
// introduces new literals fails here before it fails a post build.
describe("palette coverage across diagram types", () => {
  const COVERED: Record<string, string> = {
    sequence: `sequenceDiagram
    participant O as Observer
    participant T as Telescope
    O->>T: aim at M31
    activate T
    T-->>O: field acquired
    deactivate T
    Note over O,T: long exposure begins
    loop every 30s
        T->>T: autoguide correction
    end`,
    class: `classDiagram
    class Orbit {
        +float radius
        +float period
        +eccentricity() float
    }
    class Body {
        +string name
    }
    Body --|> Orbit : follows`,
    state: `stateDiagram-v2
    [*] --> Idle
    Idle --> Tracking : target acquired
    Tracking --> Exposing : shutter open
    Exposing --> Idle : plate stored
    state Tracking {
        [*] --> Coarse
        Coarse --> Fine
    }`,
    er: `erDiagram
    OBSERVER ||--o{ SESSION : logs
    SESSION ||--|{ EXPOSURE : contains
    EXPOSURE }o--|| PLATE : "stored on"`,
    pie: `pie title Plate archive by filter
    "H-alpha" : 42
    "OIII" : 28
    "SII" : 17
    "Broadband" : 13`,
    gantt: `gantt
    title Observation night
    dateFormat HH:mm
    axisFormat %H:%M
    section Setup
        Collimation :a1, 19:00, 40m
        Cooling     :after a1, 30m
    section Imaging
        M31 run     :crit, 20:10, 3h
        Flats       :23:10, 30m`,
  };

  it.each(Object.entries(COVERED))(
    "%s renders fully themed",
    async (type, source) => {
      const [d] = await renderDiagrams([source], `coverage:${type}`);
      expect(d.svg).toContain("var(--diagram-");
      expect(d.svg).not.toContain("<foreignObject");
    },
    60_000,
  );
});
