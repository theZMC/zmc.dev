import { z } from "astro/zod";
import { parse } from "yaml";

/**
 * Single source of truth for the resume data shape. The `resume` content
 * collection, the dossier page, the homepage service record, the Harvard
 * PDF template, and the vitest gate all derive from this schema.
 *
 * Kept astro:content-free so it loads under vitest; browser-bound modules
 * must import types only (`import type`) so zod and yaml stay out of the
 * lazy PDF chunk.
 */

const month = z.object({
  month: z.number(),
  year: z.number(),
});

const jobBase = z.object({
  company: z.string(),
  title: z.string(),
  tenure: z.object({
    start: month,
    end: month.optional(),
  }),
  skills: z.array(z.string()),
  // Dossier prose for the resume page. Plain text, no inline HTML.
  body: z.string(),
});

/* Tech jobs feed views that render these fields unconditionally, so the
   union makes them required by type rather than policing them at runtime. */
const techJob = jobBase.extend({
  isTech: z.literal(true),
  // One-line register for the homepage service record.
  summary: z.string(),
  // Accomplishment bullets for the generated resume PDF.
  highlights: z
    .array(z.string())
    .min(1, "tech job needs at least one highlight bullet for the PDF"),
});

const otherJob = jobBase.extend({
  isTech: z.literal(false),
});

const job = z.discriminatedUnion("isTech", [techJob, otherJob]);

export const resumeSchema = z.object({
  name: z.string(),
  designation: z.string(),
  location: z.string(),
  email: z.string().email(),
  phone: z.object({
    display: z.string(),
    tel: z.string(),
  }),
  site: z.string(),
  github: z.string().url(),
  linkedin: z.string().url(),
  summary: z.string(),
  profile: z.object({
    lede: z.string(),
    body: z.array(z.string()),
  }),
  skills: z.array(
    z.object({
      name: z.string(),
      level: z.enum(["expert", "advanced"]),
      category: z.string(),
    }),
  ),
  certifications: z.array(
    z.object({
      name: z.string(),
      short: z.string(),
      issuer: z.string(),
      year: z.number().optional(),
    }),
  ),
  jobs: z.array(job),
});

export type Resume = z.infer<typeof resumeSchema>;
export type ResumeJob = Resume["jobs"][number];
export type TechJob = z.infer<typeof techJob>;

/** Parses and validates raw resume.yaml for consumers outside astro:content. */
export function parseResume(raw: string): Resume {
  return resumeSchema.parse(parse(raw));
}
