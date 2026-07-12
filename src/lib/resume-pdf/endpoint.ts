import type { APIRoute } from "astro";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";
import { loadResume } from "../resume/load";
import { HarvardResume } from "./template";

/**
 * Build-time counterpart to generate.ts: renders the same template to a
 * static PDF so the document has linkable URLs. Shared by the /resume.pdf
 * and /ZachCallahanResume.pdf pages, which just re-export this GET. Runs
 * only at build/dev time, so react-pdf stays out of every client bundle.
 */
export const GET: APIRoute = async () => {
  const data = await loadResume();
  const pdf = await renderToBuffer(
    createElement(HarvardResume, { data }) as ReactElement<DocumentProps>,
  );
  return new Response(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf" },
  });
};
