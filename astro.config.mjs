import { defineConfig } from 'astro/config';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSlug from 'rehype-slug';

// https://astro.build/config
import image from "@astrojs/image";

// https://astro.build/config
import partytown from "@astrojs/partytown";

// https://astro.build/config
export default defineConfig({
  markdown: {
    extendDefaultPlugins: true,
    rehypePlugins: [rehypeSlug, [rehypeAutolinkHeadings, {
      behavior: 'wrap',
      properties: {
        ariaHidden: true,
        tabIndex: -1,
        className: 'anchor'
      }
    }]]
  },
  site: 'https://zmc.dev',
  integrations: [image({
    serviceEntryPoint: '@astrojs/image/sharp'
 }), partytown({
    config: { 
      forward: ["dataLayer.push"] 
    },
  })]
});
