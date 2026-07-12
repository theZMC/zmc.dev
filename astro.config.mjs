// @ts-check
import { defineConfig } from "astro/config";

import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeExternalLinks from "rehype-external-links";
import { rehypeHeadingIds } from "@astrojs/markdown-remark";

import relativeLinks from "astro-relative-links";

import talks from "./src/lib/talks/integration.mjs";

import { zmcDark, zmcLight } from "./src/lib/shiki/zmc-themes.mjs";

// `astro build` re-runs the Vite dep optimizer in production mode, and with a
// shared cache dir it overwrites the dev server's pre-bundle in place — any
// dev server running (or started) after a build then serves production react,
// whose jsx-dev-runtime lacks jsxDEV, and the resume PDF chunk dies on click.
// Point build at its own cache so the two never fight.
const isBuild = process.argv.includes("build");

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

  integrations: [relativeLinks(), talks()],

  vite: {
    cacheDir: isBuild ? "node_modules/.vite-build" : undefined,
    optimizeDeps: {
      // The resume PDF chunk is dynamic-imported on button click, so the dev
      // scanner never discovers these deps up front. Without pre-bundling,
      // the first click triggers a re-optimization mid-flight and the import
      // fails with 504 "outdated optimize dep".
      include: [
        "react",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@react-pdf/renderer",
      ],
    },
  },
});
