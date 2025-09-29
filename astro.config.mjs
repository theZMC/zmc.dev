// @ts-check
import { defineConfig } from "astro/config";

import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { rehypeHeadingIds } from "@astrojs/markdown-remark";

import relativeLinks from "astro-relative-links";

import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  site: "https://zmc.dev",
  base: "/",
  prefetch: {
    defaultStrategy: "viewport",
  },
  build: {
    assetsPrefix: "https://zmc.dev/",
    inlineStylesheets: "never",
  },
  markdown: {
    rehypePlugins: [
      rehypeHeadingIds,
      [
        rehypeAutolinkHeadings,
        {
          behavior: "wrap",
          properties: {
            ariaHidden: true,
            tabIndex: -1,
            className: "anchor",
          },
        },
      ],
    ],
  },

  integrations: [relativeLinks()],

  vite: {
    plugins: [tailwindcss()],
  },
});
