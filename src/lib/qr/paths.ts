// URL/path logic for the QR beacons. Canonical form is the trailing-slash
// absolute URL — the shape the built og:url carries (directory build
// format), and what the scan gate asserts against byte-for-byte.

const SITE = "https://zmc.dev";

const withSlash = (pathname: string): string =>
  pathname.endsWith("/") ? pathname : `${pathname}/`;

/**
 * The current page's QR-page href, or null on the 404 page (no canonical
 * URL to encode). QR pages suppress their own footer link explicitly
 * (qrHref={null} into BaseLayout) rather than by path shape — a tag
 * literally named "qr" lives at a path ending in /qr/ too.
 */
export const qrHrefFor = (pathname: string): string | null => {
  const p = withSlash(pathname);
  if (p === "/404/" || pathname === "/404.html") return null;
  return `${p}qr/`;
};

export const canonicalUrlFor = (pathname: string): string =>
  `${SITE}${withSlash(pathname)}`;

/**
 * A collection entry slugged "qr" would silently lose its page to the
 * static {parent}/qr/ route — fail the build loudly instead.
 */
export const assertNoQrSlug = (ids: string[], context: string): void => {
  if (ids.includes("qr")) {
    throw new Error(
      `qr: a ${context} entry is slugged "qr" — it would collide with the QR page route`,
    );
  }
};
