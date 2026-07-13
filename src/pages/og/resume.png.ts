import type { APIRoute } from "astro";
import { loadResume } from "@lib/resume/load";
import { renderResumeImage } from "@lib/og/render";

export const GET: APIRoute = async () => {
  const resume = await loadResume();
  const png = await renderResumeImage({
    name: resume.name,
    designation: resume.designation,
    location: resume.location,
    site: resume.site,
  });
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png" },
  });
};
