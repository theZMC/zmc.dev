import type { APIRoute } from "astro";
import { qrMatrix } from "@lib/qr/matrix";
import { canonicalUrlFor } from "@lib/qr/paths";
import { QR_LIGHT, qrSvg } from "@lib/qr/render";
import { getCollection } from "astro:content";

export const getStaticPaths = async () => {
  const posts = await getCollection("blog");
  return posts.map((post) => ({
    params: { slug: post.id },
  }));
};

export const GET: APIRoute = async ({ params }) => {
  const url = canonicalUrlFor(`/posts/${params.slug}/`);
  return new Response(
    await qrSvg(qrMatrix(url), QR_LIGHT, { standalone: true, label: url }),
    { headers: { "Content-Type": "image/svg+xml" } },
  );
};
