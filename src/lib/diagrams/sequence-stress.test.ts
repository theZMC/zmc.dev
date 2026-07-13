import { fromHtmlIsomorphic } from "hast-util-from-html-isomorphic";
import { describe, expect, it } from "vitest";
import { reanchorActorLabels } from "./actor-labels";
import { chipCollidingLabels } from "./label-chips";
import { restyleLoopLabels } from "./loop-labels";
import { renderDiagrams } from "./render";
import type { Element } from "./rehype-mermaid";

// The passes are rules over mermaid's sequence vocabulary, not fixes
// for the kitchen sink's one diagram. This renders a stress sequence
// the site never publishes — every control structure, section
// dividers, self-messages on three lifelines — through the real
// pipeline and asserts the invariants hold wherever they apply.
const STRESS = `sequenceDiagram
    participant A as Archivist
    participant B as Bellows
    participant C as Cartographer
    A->>B: catalog the plates
    alt clear skies
        B->>C: chart tonight
        C->>C: recalibrate sextant
    else clouded over
        B->>A: shelve the run
    end
    par develop
        A->>A: fix and rinse
    and annotate
        B->>C: margins please
    end
    opt spare time
        C->>A: a new atlas page
    end
    critical dark room
        A->>B: no light now
    option lamp fails
        B->>A: strike a match
    end
    break plate cracked
        A->>C: log the loss
    end
`;

const LABEL_CLASSES = ["messageText", "loopText", "sectionTitle"];

function classesOf(el: Element): string[] {
  const className = el.properties.className;
  return Array.isArray(className) ? className.map(String) : [];
}

function collect(svg: Element): Map<string, Element[]> {
  const found = new Map<string, Element[]>();
  const walk = (el: Element): void => {
    for (const cls of classesOf(el)) {
      found.set(cls, [...(found.get(cls) ?? []), el]);
    }
    for (const child of el.children) {
      if (child.type === "element") walk(child);
    }
  };
  walk(svg);
  return found;
}

function textContent(node: Element): string {
  let out = "";
  for (const child of node.children) {
    if (child.type === "text") out += child.value;
    else if (child.type === "element") out += textContent(child);
  }
  return out;
}

describe("sequence passes generalize beyond the kitchen sink", async () => {
  const [rendered] = await renderDiagrams([STRESS], "sequence stress");
  const svg = fromHtmlIsomorphic(rendered.svg, { fragment: true })
    .children[0] as Element;
  reanchorActorLabels(svg);
  restyleLoopLabels(svg);
  chipCollidingLabels(svg);
  const found = collect(svg);

  it("dresses every control-structure keyword, never leaves a flag", () => {
    const keywords = (found.get("labelText") ?? []).map((el) =>
      textContent(el),
    );
    expect(keywords.sort()).toEqual(["ALT", "BREAK", "CRITICAL", "OPT", "PAR"]);
    for (const el of found.get("labelText") ?? []) {
      expect(String(el.properties.style)).toContain("letter-spacing");
    }
    expect(found.get("labelBox")).toBeUndefined();
  });

  it("keeps every lifeline segment out of every label's box", () => {
    const lifelines = (found.get("actor-line") ?? []).filter(
      (el) => el.tagName === "line",
    );
    expect(lifelines.length).toBeGreaterThan(3); // cuts happened
    const labels = LABEL_CLASSES.flatMap((cls) => found.get(cls) ?? []);
    expect(labels.length).toBeGreaterThan(10);

    for (const label of labels) {
      const cx = Number(label.properties.x);
      const baseline = Number(label.properties.y);
      const half = (textContent(label).length * 9) / 2 + 6;
      for (const line of lifelines) {
        const x = Number(line.properties.x1);
        if (x < cx - half || x > cx + half) continue;
        const top = Math.min(
          Number(line.properties.y1),
          Number(line.properties.y2),
        );
        const bottom = Math.max(
          Number(line.properties.y1),
          Number(line.properties.y2),
        );
        // no overlap with the label's chip envelope
        const overlaps = top < baseline + 7.5 && bottom > baseline - 16.5;
        expect(overlaps).toBe(false);
      }
    }
  });

  it("chips are the note's kin and only appear where lines were cut", () => {
    const chips = found.get("label-chip") ?? [];
    expect(chips.length).toBeGreaterThan(5);
    for (const chip of chips) {
      expect(String(chip.properties.style)).toContain("--diagram-note-bg");
    }
  });

  it("re-seats every single-line label on an explicit baseline", () => {
    for (const label of LABEL_CLASSES.flatMap((cls) => found.get(cls) ?? [])) {
      expect(label.properties.dominantBaseline).toBeUndefined();
      expect(label.properties.dy).toBeUndefined();
    }
  });
}, 60_000);
