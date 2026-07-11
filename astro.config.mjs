// @ts-check
import { defineConfig } from "astro/config";

import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { rehypeHeadingIds } from "@astrojs/markdown-remark";

import relativeLinks from "astro-relative-links";

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
    shikiConfig: {
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
      // Emit only --shiki-dark/--shiki-light custom props (no inline color),
      // so the theme CSS can pick the right one per data-theme.
      defaultColor: false,
    },
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
});
