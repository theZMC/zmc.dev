// @ts-check
import { defineConfig } from "astro/config";

import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeExternalLinks from "rehype-external-links";
import { rehypeGithubAlerts } from "rehype-github-alerts";
import { rehypeHeadingIds } from "@astrojs/markdown-remark";

import relativeLinks from "astro-relative-links";

import talks from "./src/lib/talks/integration.mjs";

import { zmcDark, zmcLight } from "./src/lib/shiki/zmc-themes.mjs";

import rehypeMermaid from "./src/lib/diagrams/rehype-mermaid";

// `astro build` re-runs the Vite dep optimizer in production mode, and with a
// shared cache dir it overwrites the dev server's pre-bundle in place — any
// dev server running (or started) after a build then serves production react,
// whose jsx-dev-runtime lacks jsxDEV, and the resume PDF chunk dies on click.
// Point build at its own cache so the two never fight.
const isBuild = process.argv.includes("build");

// GFM alerts ([!NOTE] etc.) — custom build instead of the default one,
// which bakes GitHub's octicon SVGs into the title; here the title is a
// bare text node so the post CSS can set the glyph and voice itself.
/** @type {import("rehype-github-alerts").DefaultBuildType} */
const alertBuild = (alertOptions, originalChildren) => ({
  type: "element",
  tagName: "aside",
  properties: {
    className: [
      "markdown-alert",
      `markdown-alert-${alertOptions.keyword.toLowerCase()}`,
    ],
  },
  children: [
    {
      type: "element",
      tagName: "p",
      properties: { className: ["markdown-alert-title"] },
      children: [{ type: "text", value: alertOptions.title }],
    },
    ...originalChildren,
  ],
});

// https://astro.build/config
export default defineConfig({
  site: "https://zmc.dev",
  base: "/",
  prefetch: {
    defaultStrategy: "viewport",
  },
  build: {
    // The absolute prefix keeps asset URLs valid on the deployed 404 page,
    // which GitHub Pages serves at arbitrary path depths where the
    // relative links astro-relative-links produces would mis-resolve.
    // Local builds skip it so `pnpm preview` serves the assets it just
    // built instead of production's.
    assetsPrefix: process.env.CI ? "https://zmc.dev/" : undefined,
    inlineStylesheets: "never",
  },
  markdown: {
    syntaxHighlight: {
      type: "shiki",
      // Mermaid fences reach the rehype chain as bare pre/code for the
      // diagram plugin to render; Shiki would otherwise claim them.
      excludeLangs: ["mermaid"],
    },
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
      // Build-time mermaid → theme-aware inline SVG figure plates.
      rehypeMermaid,
      [rehypeGithubAlerts, { build: alertBuild }],
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
