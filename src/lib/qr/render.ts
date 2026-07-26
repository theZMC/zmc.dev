import { star4Path } from "../icons/render";
import {
  QUIET_ZONE,
  alignmentCenters,
  finderOrigins,
  inAlignment,
  inFinder,
} from "./geometry";
import type { QrMatrix } from "./matrix";

// The star-field QR plate. Everything is drawn in module units — one unit
// per module, quiet zone baked into the viewBox — so the same geometry
// serves any rendered size.
//
// Styling stays inside EC-H's damage budget by construction, not luck:
// every dark module keeps a solid center (a decoder samples centers), the
// finder rings are conventional, and the big finder stars span their full
// 3-module extent on-axis so the 1:1:3:1:1 detection ratio holds. The
// scan gate (scripts/check-qr-codes.mjs) holds the line in CI.

// Every star wears the comet proportion — the waist ratio of the star
// that trails the post subheadings (its clip-path waists sit 0.9px out
// on a 3.5px ray ≈ 0.36) — so the QR reads as the same species. The
// slimness costs small-raster margin: the field stops decoding below
// ~6px per module (the old 0.5-waist cluster survived ~3px/module), so
// the gate checks at 7px/module rather than a fixed small size. Real
// scan surfaces (the 420px page plate, print, any camera) sit far above.
const STAR_W = 0.36;

export interface QrColors {
  /** dark-module fill — a literal or a var() reference */
  star: string;
  /** background fill */
  field: string;
}

export interface QrSvgOpts {
  /** a self-contained document: xmlns sizing + <title> for the download */
  standalone?: boolean;
  /** the encoded URL, spoken in the accessible name */
  label?: string;
}

const STANDALONE_SIZE = 1024;

// The light-scheme --ink/--bg literals. The standalone download bakes
// them (deterministic dark-on-light for print/slides — an embedded media
// query could silently invert inside someone's dark-mode deck tool); the
// inline form carries them as var() fallbacks, the mermaid convention.
export const QR_LIGHT: QrColors = { star: "#1a1e29", field: "#e9e3d3" };
export const QR_VARS: QrColors = {
  star: `var(--qr-star, ${QR_LIGHT.star})`,
  field: `var(--qr-field, ${QR_LIGHT.field})`,
};

export const qrSvg = (
  m: QrMatrix,
  colors: QrColors,
  opts: QrSvgOpts = {},
): string => {
  const total = m.size + QUIET_ZONE * 2;

  // Finders: square ring (7×7 with a 5×5 hole) around a star cluster — a
  // 3-module star with four satellite stars on the 3×3's corner modules.
  // The satellites aren't decoration: ZXing cross-checks the finder along
  // its diagonals, which run through those corners; a lone star leaves
  // them light and the finder is rejected.
  const finderRings: string[] = [];
  const finderStars: string[] = [];
  for (const o of finderOrigins(m.size)) {
    const [cx, cy] = [o.col + 3.5, o.row + 3.5];
    finderRings.push(
      `M${o.col} ${o.row}h7v7h-7Z M${o.col + 1} ${o.row + 1}v5h5v-5Z`,
    );
    finderStars.push(
      star4Path(cx, cy, 1.5, STAR_W),
      star4Path(cx - 1, cy - 1, 0.7, STAR_W),
      star4Path(cx + 1, cy - 1, 0.7, STAR_W),
      star4Path(cx - 1, cy + 1, 0.7, STAR_W),
      star4Path(cx + 1, cy + 1, 0.7, STAR_W),
    );
  }

  // alignment (v≥2): the conventional 5×5 ring, its center module a
  // normal-sized star — a miniature echo of the finder treatment. A
  // 1.5-radius star here would touch the ring and corrupt the light band.
  const alignRings: string[] = [];
  const alignStars: string[] = [];
  for (const c of alignmentCenters(m.version)) {
    alignRings.push(
      `M${c.col - 2} ${c.row - 2}h5v5h-5Z M${c.col - 1} ${c.row - 1}v3h3v-3Z`,
    );
    alignStars.push(star4Path(c.col + 0.5, c.row + 0.5, 0.5, STAR_W));
  }

  // every remaining dark module — data, timing, format, version — is a
  // half-module star whose points reach the module edge, chaining runs
  const stars: string[] = [];
  for (let row = 0; row < m.size; row++) {
    for (let col = 0; col < m.size; col++) {
      if (!m.isDark(row, col)) continue;
      if (inFinder(row, col, m.size) || inAlignment(row, col, m.version))
        continue;
      stars.push(star4Path(col + 0.5, row + 0.5, 0.5, STAR_W));
    }
  }

  const label = opts.label ? `Scan to open ${opts.label}` : "QR code";
  return [
    `<svg class="qr-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}"`,
    opts.standalone
      ? ` width="${STANDALONE_SIZE}" height="${STANDALONE_SIZE}">`
      : ` role="img" aria-label="${label}">`,
    opts.standalone ? `<title>${label}</title>` : "",
    `<rect class="qr-field" width="${total}" height="${total}" fill="${colors.field}"/>`,
    `<g fill="${colors.star}" transform="translate(${QUIET_ZONE} ${QUIET_ZONE})">`,
    `<path fill-rule="evenodd" d="${finderRings.join(" ")}"/>`,
    `<path d="${finderStars.join(" ")}"/>`,
    alignRings.length
      ? `<path fill-rule="evenodd" d="${alignRings.join(" ")}"/><path d="${alignStars.join(" ")}"/>`
      : "",
    `<path d="${stars.join(" ")}"/>`,
    `</g></svg>`,
  ].join("");
};
