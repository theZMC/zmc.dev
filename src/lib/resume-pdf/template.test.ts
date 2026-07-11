import { readFileSync } from "node:fs";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { parseResume } from "../resume/schema";
import { HarvardResume } from "./template";

// Same file the astro `resume` collection loads, parsed through the same
// zod schema (astro:content itself is unavailable under vitest).
const raw = readFileSync("src/data/resume/resume.yaml", "utf8");

const countPages = (pdf: Buffer) =>
  (pdf.toString("latin1").match(/\/Type\s*\/Page(?!s)/g) ?? []).length;

describe("resume source data", () => {
  it("satisfies the schema, including tech-job invariants", () => {
    // Throws with zod's issue paths on any violation (e.g. a tech job
    // missing highlights or a summary).
    expect(parseResume(raw)).toBeTruthy();
  });
});

describe("generated Harvard resume", () => {
  it("renders to exactly one page", async () => {
    const data = parseResume(raw);
    // renderToBuffer's type wants the <Document> element itself; a component
    // element that returns one is fine at runtime.
    const pdf = await renderToBuffer(
      createElement(HarvardResume, { data }) as ReactElement<DocumentProps>,
    );
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(countPages(pdf)).toBe(1);
  });
});
