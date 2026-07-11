import { pdf, type DocumentProps } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";
import { HarvardResume, type ResumePdfData } from "./template";

/**
 * Renders the resume to a PDF blob in the browser. Lives in its own module
 * so the page script can dynamic-import it: react + @react-pdf/renderer
 * stay in a lazy chunk that only people who click a button ever fetch.
 */
export async function generateResumePdf(data: ResumePdfData): Promise<Blob> {
  return pdf(
    createElement(HarvardResume, { data }) as ReactElement<DocumentProps>,
  ).toBlob();
}
