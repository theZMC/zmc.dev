import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

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
    date: z.string(z.date()),
    description: z.string().optional(),
  }),
});

const jobs = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./src/data/jobs",
  }),
  schema: z.object({
    company: z.string(),
    tenure: z.object({
      start: z.object({
        month: z.number(),
        year: z.number(),
      }),
      end: z
        .object({
          month: z.number(),
          year: z.number(),
        })
        .optional(),
    }),
    title: z.string(),
    isTech: z.boolean(),
    skills: z.array(z.string()),
    summary: z.string().optional(),
  }),
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

export const collections = { blog, jobs, projects };
