import { readFileSync } from "node:fs";
import path from "node:path";
import satori from "satori";
import sharp from "sharp";

// Engraved celestial chart tokens (dark theme, src/lib/styles/global.css).
// Icons always render the dark palette; the SVG favicon carries a media
// query so light-scheme tabs get the light-theme brass instead.
const BG = "#0b0e14";
const BG_CORE = "#131a2a";
const INK = "#e8e4d8";
const BRASS = "#c8a96a";
const BRASS_LIGHT = "#8f6f35";
const CELEST = "#7a93b8";
const ORB_BRASS = "rgba(200, 169, 106, 0.3)";
const ORB_INK = "rgba(232, 228, 216, 0.12)";
const ORB_CELEST = "rgba(122, 147, 184, 0.18)";
const TICK = "rgba(200, 169, 106, 0.35)";

// The orrery's compass star (Cosmos.astro), redrawn as a filled eight-point
// star so it survives 16px tab rendering: long cardinal points, short
// diagonals, and the sun glyph ☉ read in negative space — a hole punched
// around a solid core. Sixteen vertices alternate point and waist radii
// (cardinals R, diagonals 9R/14, waists R/4), stepping 22.5° from 12
// o'clock. The orrery itself carries the same silhouette at R=48.
export const starPath = (cx: number, cy: number, R: number): string =>
  Array.from({ length: 16 }, (_, i) => {
    const r = i % 4 === 0 ? R : i % 2 === 0 ? (R * 9) / 14 : R / 4;
    const t = (i * 22.5 * Math.PI) / 180;
    const [x, y] = [cx + r * Math.sin(t), cy - r * Math.cos(t)];
    return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(" ") + " Z";

export const faviconSvg = (size?: number): string => `<svg xmlns="http://www.w3.org/2000/svg"${size ? ` width="${size}" height="${size}"` : ""} viewBox="0 0 128 128">
  <defs>
    <mask id="sol">
      <rect width="128" height="128" fill="#fff"/>
      <circle cx="64" cy="64" r="16" fill="#000"/>
    </mask>
  </defs>
  <g fill="${BRASS}">
    <path mask="url(#sol)" d="${starPath(64, 64, 56)}"/>
    <circle cx="64" cy="64" r="7"/>
  </g>
  <style>
    @media (prefers-color-scheme: light) { g { fill: ${BRASS_LIGHT}; } }
  </style>
</svg>
`;

export const renderFaviconPng = async (size = 512): Promise<Buffer> =>
  sharp(Buffer.from(faviconSvg(size))).png().toBuffer();

// ---- apple touch icon: a deeper cut of the orrery under the nav sigil ----

const SIZE = 180;
// librsvg and satori both rasterize hairlines softly at native 180px;
// render everything 4× and downsample so the strokes stay crisp.
const SS = 4;
// Orrery anchored at the top: the sun rides high, outer orbits arc down
// through the tile, and the sigil sits at the middle.
const CX = 90;
const CY = 36;

const orbit = (r: number, color: string, dashed = false): string =>
  `<circle cx="${CX}" cy="${CY}" r="${r}" fill="none" stroke="${color}" stroke-width="${dashed ? 0.5 : 0.8}"${dashed ? ' stroke-dasharray="0.5 4"' : ""}/>`;

// A body sitting on orbit r at clock angle theta (degrees, 0 = 12 o'clock).
const at = (r: number, thetaDeg: number): { x: number; y: number } => {
  const t = ((thetaDeg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(t), y: CY + r * Math.sin(t) };
};

const body = (r: number, thetaDeg: number, size: number, color: string): string => {
  const { x, y } = at(r, thetaDeg);
  return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${size}" fill="${color}"/>`;
};

// The filled compass star at half the chart's scale (orrery R=48 → 24),
// hole and sun ring at the same proportions so the ☉ reads in negative
// space here too.
const compassStar = `
  <path mask="url(#starHole)" fill="${TICK}" d="${starPath(CX, CY, 24)}"/>
  <circle cx="${CX}" cy="${CY}" r="5.5" fill="none" stroke="${BRASS}" stroke-width="1"/>
  <circle cx="${CX}" cy="${CY}" r="1.8" fill="${BRASS}"/>`;

const appleTouchSvg = (): string => {
  const giant = at(72, 110);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE * SS}" height="${SIZE * SS}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <radialGradient id="core" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${BG_CORE}"/>
      <stop offset="100%" stop-color="${BG_CORE}" stop-opacity="0"/>
    </radialGradient>
    <mask id="starHole">
      <rect width="${SIZE}" height="${SIZE}" fill="#fff"/>
      <circle cx="${CX}" cy="${CY}" r="7" fill="#000"/>
    </mask>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" fill="${BG}"/>
  <circle cx="${CX}" cy="${CY}" r="85" fill="url(#core)" opacity="0.55"/>
  ${orbit(24, ORB_BRASS)}
  ${orbit(38, ORB_INK)}
  ${orbit(54, ORB_BRASS)}
  ${orbit(63, ORB_INK, true)}
  ${orbit(72, ORB_CELEST)}
  ${orbit(92, ORB_INK)}
  ${orbit(112, ORB_CELEST)}
  ${orbit(132, ORB_INK)}
  ${compassStar}
  ${body(38, 100, 1.6, BRASS)}
  ${body(54, 240, 1.8, INK)}
  ${body(63, 80, 0.9, ORB_INK)}
  ${body(63, 120, 0.9, ORB_BRASS)}
  ${body(63, 250, 0.9, ORB_CELEST)}
  ${body(72, 110, 2.2, INK)}
  <ellipse cx="${giant.x.toFixed(1)}" cy="${giant.y.toFixed(1)}" rx="5.5" ry="1.8" fill="none" stroke="${ORB_BRASS}" stroke-width="0.6" transform="rotate(-18 ${giant.x.toFixed(1)} ${giant.y.toFixed(1)})"/>
  ${body(92, 135, 2, CELEST)}
  ${body(112, 200, 1.6, INK)}
  ${body(132, 165, 1.4, BRASS)}
</svg>
`;
};

// satori can't parse woff2; load the plain WOFF cut from @fontsource.
// The build always runs from the repo root, so resolve via cwd.
const marcellus = readFileSync(
  path.join(
    process.cwd(),
    "node_modules",
    "@fontsource",
    "marcellus",
    "files",
    "marcellus-latin-400-normal.woff",
  ),
);

// The nav sigil, rendered by satori (which turns text into glyph paths) and
// composited over the chart. paddingLeft offsets the trailing letter-space
// so the glyphs sit optically centered.
const sigilOverlay = async (): Promise<Buffer> => {
  const letterSpacing = 8 * SS;
  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          width: SIZE * SS,
          height: SIZE * SS,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          paddingLeft: letterSpacing,
          fontFamily: "Marcellus",
          fontSize: 24 * SS,
          letterSpacing,
          color: BRASS,
        },
        children: "Z·M·C",
      },
    } as unknown as import("react").ReactNode,
    {
      width: SIZE * SS,
      height: SIZE * SS,
      fonts: [{ name: "Marcellus", data: marcellus, weight: 400, style: "normal" }],
    },
  );
  return sharp(Buffer.from(svg)).png().toBuffer();
};

export const renderAppleTouchIcon = async (): Promise<Buffer> => {
  const overlay = await sigilOverlay();
  // Two passes: sharp's pipeline resizes before compositing, so the 4×
  // composite must be flattened to a buffer before the downsample.
  const supersampled = await sharp(Buffer.from(appleTouchSvg()))
    .composite([{ input: overlay }])
    .png()
    .toBuffer();
  return sharp(supersampled).resize(SIZE, SIZE).png().toBuffer();
};
