import type { APIRoute } from "astro";
import { renderNotFoundImage } from "@lib/og/render";

export const GET: APIRoute = async () => {
  const png = await renderNotFoundImage();
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png" },
  });
};
