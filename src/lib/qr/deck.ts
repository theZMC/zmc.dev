import { qrMatrix } from "./matrix";
import { canonicalUrlFor } from "./paths";
import { QR_LIGHT, QR_VARS, qrSvg } from "./render";

// The talk-deck beacon pair. Slidev's Vite root is the deck's directory
// (src/data/talks/<slug>), so the slug — and from it the canonical URL —
// is derivable from the root alone; the theme's vite plugin feeds these
// two forms into the deck, and the talks integration writes the
// standalone next to the built deck as /talks/<slug>/qr.svg.

/**
 * The talk slug iff the path is a deck directory; null for any other
 * root (the theme's own example deck, an ad-hoc slides file).
 */
export const talkSlugFromRoot = (root: string): string | null => {
  const match = /\/src\/data\/talks\/([^/]+)\/?$/.exec(root);
  return match ? match[1] : null;
};

export interface DeckQr {
  /** the canonical URL the code encodes */
  url: string;
  /** the var()-skinned form the end slide inlines */
  inline: string;
  /** the baked-light standalone document, the /talks/<slug>/qr.svg download */
  standalone: string;
}

export const deckQr = async (slug: string): Promise<DeckQr> => {
  const url = canonicalUrlFor(`/talks/${slug}/`);
  const m = qrMatrix(url);
  return {
    url,
    inline: await qrSvg(m, QR_VARS, { label: url }),
    standalone: await qrSvg(m, QR_LIGHT, { standalone: true, label: url }),
  };
};
