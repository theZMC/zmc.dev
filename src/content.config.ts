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
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      tags: z.array(z.string()),
      date: z.string(z.date()),
      description: z.string().optional(),
      cover: z.object({
        image: image(),
        alt: z.string(),
      }).optional(),
    }),
});

const jobs = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./src/data/jobs",
  }),
  schema: ({ image }) =>
    z.object({
      company: z.object({
        logo: image(),
        name: z.string(),
      }),
      tenure: z.object({
        start: z.object({
          month: z.number(),
          year: z.number(),
        }),
        end: z.object({
          month: z.number(),
          year: z.number(),
        }).optional(),
      }),
      title: z.string(),
      isTech: z.boolean(),
      skills: z.array(z.string()),
    }),
});

export const collections = { blog, jobs };
