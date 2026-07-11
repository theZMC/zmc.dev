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

export const collections = { blog, projects, resume };
