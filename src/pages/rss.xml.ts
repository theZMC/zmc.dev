import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getCollection } from "astro:content";
import { byDateDesc } from "@lib/utils/dates";

export async function GET(context: APIContext) {
  const posts = (await getCollection("blog")).sort(byDateDesc);

  return rss({
    title: "zmc.dev · Transmissions",
    description:
      "Field notes from Zach Callahan — platform engineering, Kubernetes, and open source.",
    site: context.site ?? "https://zmc.dev",
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      // noon UTC matches how the site renders post dates elsewhere
      pubDate: new Date(post.data.date + "T12:00:00Z"),
      link: `/posts/${post.id}`,
    })),
  });
}
