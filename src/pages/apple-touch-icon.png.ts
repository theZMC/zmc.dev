import type { APIRoute } from "astro";
import { renderAppleTouchIcon } from "@lib/icons/render";

export const GET: APIRoute = async () => {
  const png = await renderAppleTouchIcon();
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png" },
  });
};
