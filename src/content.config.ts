import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { resumeSchema } from "./lib/resume/schema";

const blog = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./src/data/blog",
    generateId: (opts) => {
      return opts.entry.split("/").reverse()[0].split(".")[0];
    },
  }),
  schema: z.object({
    title: z.string(),
    tags: z.array(z.string()),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    description: z.string().optional(),
    // Gates listings, tag pages, RSS, and prev/next nav — an unpublished
    // post still builds to its /posts/<slug>/ URL (the talks contract).
    // Defaults on, so regular posts never carry the flag.
    published: z.boolean().default(true),
  }),
});

const resume = defineCollection({
  loader: glob({
    pattern: "*.yaml",
    base: "./src/data/resume",
  }),
  schema: resumeSchema,
});

const projects = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./src/data/projects",
  }),
  schema: z.object({
    name: z.string(),
    kind: z.string(),
    url: z.string().url(),
    tags: z.array(z.string()),
    order: z.number(),
  }),
});

const talks = defineCollection({
  loader: glob({
    pattern: "*/talk.yaml",
    base: "./src/data/talks",
    // Slug is the talk's directory name; the deck lives beside talk.yaml as
    // slides.md and ships to /talks/<slug>/.
    generateId: (opts) => opts.entry.split("/")[0],
  }),
  schema: z.object({
    title: z.string(),
    // YAML parses an unquoted 2026-07-11 as a Date; fold it back to the
    // YYYY-MM-DD string the rest of the site's date utils expect.
    date: z.preprocess(
      (value) =>
        value instanceof Date ? value.toISOString().slice(0, 10) : value,
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    ),
    description: z.string(),
    // Gates the home-page listing only — unpublished decks still build to
    // their /talks/<slug>/ URL.
    published: z.boolean().default(false),
    event: z.object({
      name: z.string(),
      url: z.string().url().optional(),
    }),
    recording: z.string().url().optional(),
  }),
});

export const collections = { blog, projects, resume, talks };
