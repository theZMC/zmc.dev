import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { renderTalkImage } from "@lib/og/render";

export const getStaticPaths = async () => {
  const talks = await getCollection("talks");
  return talks.map((talk) => ({
    params: { slug: talk.id },
    props: { talk },
  }));
};

export const GET: APIRoute = async ({ props }) => {
  const { talk } = props;
  const png = await renderTalkImage({
    title: talk.data.title,
    date: talk.data.date,
    event: talk.data.event.name,
  });
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png" },
  });
};
