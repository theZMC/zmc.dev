import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { renderPostImage } from "@lib/og/render";

export const getStaticPaths = async () => {
  const posts = await getCollection("blog");
  return posts.map((post) => ({
    params: { slug: post.id },
    props: { post },
  }));
};

export const GET: APIRoute = async ({ props }) => {
  const { post } = props;
  const png = await renderPostImage({
    title: post.data.title,
    date: post.data.date,
    tags: post.data.tags,
  });
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png" },
  });
};
