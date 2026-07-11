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
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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
    // Accomplishment bullets for the generated resume PDF (tech roles).
    highlights: z.array(z.string()).optional(),
  }),
});

const resume = defineCollection({
  loader: glob({
    pattern: "*.yaml",
    base: "./src/data/resume",
  }),
  schema: z.object({
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

export const collections = { blog, jobs, projects, resume };
