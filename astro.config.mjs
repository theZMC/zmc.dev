// @ts-check
import { defineConfig } from "astro/config";

import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeExternalLinks from "rehype-external-links";
import { rehypeHeadingIds } from "@astrojs/markdown-remark";

import relativeLinks from "astro-relative-links";

import { zmcDark, zmcLight } from "./src/lib/shiki/zmc-themes.mjs";

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
        light: zmcLight,
        dark: zmcDark,
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
      [
        rehypeExternalLinks,
        {
          target: "_blank",
          rel: ["noopener", "noreferrer"],
        },
      ],
    ],
  },

  integrations: [relativeLinks()],
});
