// @ts-check
import { defineConfig } from "astro/config";

import partytown from "@astrojs/partytown";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { rehypeHeadingIds } from "@astrojs/markdown-remark";

// https://astro.build/config
export default defineConfig({
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
  integrations: [partytown()],
});

