import type { APIRoute } from "astro";
import { renderSiteImage } from "@lib/og/render";

export const GET: APIRoute = async () => {
  const png = await renderSiteImage();
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png" },
  });
};
