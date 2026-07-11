import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import {
  HarvardResume,
  type ResumePdfData,
  type ResumePdfJob,
} from "./template";

/**
 * Reads the same files the astro collections load, without astro:content
 * (unavailable under vitest). Shapes are guarded by the zod schemas at
 * build time; here we only need the fields the PDF consumes.
 */
function loadData(): ResumePdfData {
  const resume = parse(readFileSync("src/data/resume/resume.yaml", "utf8"));
  const jobsDir = "src/data/jobs";
  const jobs = readdirSync(jobsDir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const raw = readFileSync(join(jobsDir, f), "utf8");
      const frontmatter = raw.split("---")[1];
      return parse(frontmatter) as ResumePdfJob;
    });
  return { ...resume, jobs };
}

const countPages = (pdf: Buffer) =>
  (pdf.toString("latin1").match(/\/Type\s*\/Page(?!s)/g) ?? []).length;

describe("generated Harvard resume", () => {
  const data = loadData();

  it("gives every tech job highlight bullets for the PDF", () => {
    for (const job of data.jobs.filter((j) => j.isTech)) {
      expect(job.highlights?.length ?? 0, `${job.company} has no highlights`)
        .toBeGreaterThan(0);
    }
  });

  it("renders to exactly one page", async () => {
    // renderToBuffer's type wants the <Document> element itself; a component
    // element that returns one is fine at runtime.
    const pdf = await renderToBuffer(
      createElement(HarvardResume, { data }) as ReactElement<DocumentProps>,
    );
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(countPages(pdf)).toBe(1);
  });
});
