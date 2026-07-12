import type { APIRoute } from "astro";
import { renderFaviconPng } from "@lib/icons/render";

export const GET: APIRoute = async () => {
  const png = await renderFaviconPng();
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png" },
  });
};
