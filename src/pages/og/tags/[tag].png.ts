import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { renderIndexImage } from "@lib/og/render";

export const getStaticPaths = async () => {
  // same published-first harvest as /posts/by-tag/[tag]/ — a draft's tags
  // can't mint images any more than they can mint pages
  const posts = (await getCollection("blog")).filter(
    (post) => post.data.published,
  );
  const tags = [...new Set(posts.flatMap((post) => post.data.tags || []))];
  return tags.map((tag) => ({
    params: { tag },
    props: {
      count: posts.filter((post) => post.data.tags?.includes(tag)).length,
    },
  }));
};

export const GET: APIRoute = async ({ params, props }) => {
  const png = await renderIndexImage({
    eyebrow: "INDEX · TRANSMISSIONS",
    title: params.tag!,
    note: "TAGGED",
    count: props.count,
  });
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png" },
  });
};
