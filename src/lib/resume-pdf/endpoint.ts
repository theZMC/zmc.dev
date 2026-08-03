import type { APIRoute } from "astro";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";
import { cachedBuffer } from "../build-cache";
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
  // Cached on the loaded data, not the yaml file — astro:content stays
  // the sole reader of resume.yaml. Bonus: the two PDF routes were two
  // renders with differing react-pdf CreationDate metadata; the second
  // is now a hit, so they ship byte-identical.
  const pdf = await cachedBuffer(
    "resume-pdf",
    [JSON.stringify(data)],
    () =>
      renderToBuffer(
        createElement(HarvardResume, { data }) as ReactElement<DocumentProps>,
      ),
  );
  return new Response(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf" },
  });
};
