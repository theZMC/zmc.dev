import type { APIRoute } from "astro";
import { qrMatrix } from "@lib/qr/matrix";
import { canonicalUrlFor } from "@lib/qr/paths";
import { QR_LIGHT, qrSvg } from "@lib/qr/render";
import { postsByTag } from "@lib/utils/tags";

export const getStaticPaths = async () => {
  return [...(await postsByTag()).keys()].map((tag) => ({
    params: { tag },
  }));
};

export const GET: APIRoute = async ({ params }) => {
  const url = canonicalUrlFor(`/posts/by-tag/${params.tag}/`);
  return new Response(
    await qrSvg(qrMatrix(url), QR_LIGHT, { standalone: true, label: url }),
    { headers: { "Content-Type": "image/svg+xml" } },
  );
};
