import type { APIRoute } from "astro";
import { qrMatrix } from "@lib/qr/matrix";
import { canonicalUrlFor } from "@lib/qr/paths";
import { QR_LIGHT, qrSvg } from "@lib/qr/render";

export const GET: APIRoute = () => {
  const url = canonicalUrlFor("/resume/");
  return new Response(
    qrSvg(qrMatrix(url), QR_LIGHT, { standalone: true, label: url }),
    { headers: { "Content-Type": "image/svg+xml" } },
  );
};
