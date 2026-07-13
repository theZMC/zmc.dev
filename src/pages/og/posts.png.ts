import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { renderIndexImage } from "@lib/og/render";

export const GET: APIRoute = async () => {
  const count = (await getCollection("blog")).filter(
    (post) => post.data.published,
  ).length;
  const png = await renderIndexImage({
    eyebrow: "INDEX · ZMC.DEV",
    title: "Transmissions",
    note: "FIELD NOTES · PLAINTEXT",
    count,
  });
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png" },
  });
};
