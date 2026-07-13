// @ts-check
// One-off LinkedIn profile banner (1584×396) on the engraved celestial
// chart language. Not part of the site build — run from the repo root:
//
//   node scripts/linkedin-banner.mjs [out.png]
//
// LinkedIn's avatar circle overlays the banner's bottom-left corner and
// narrow views crop inward, so everything that matters rides high and
// right: the orrery breaks off the top-left above the avatar, the text
// block aligns right and concentrates toward the top, and only faint
// counter-arcs occupy the bottom-right.
import { writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import satori from "satori";
import sharp from "sharp";

const WIDTH = 1584;
const HEIGHT = 396;

// Engraved celestial chart tokens (dark theme, src/lib/styles/global.css) —
// hardcoded copies, same as src/lib/og/base.ts and src/lib/icons/render.ts.
const BG = "#0b0e14";
const INK = "#e8e4d8";
const INK_DIM = "#9ba0a8";
const BRASS = "#c8a96a";
const CELEST = "#7a93b8";
const HAIR = "rgba(232, 228, 216, 0.1)";
const ORB_BRASS = "rgba(200, 169, 106, 0.3)";
const ORB_INK = "rgba(232, 228, 216, 0.12)";
const TICK = "rgba(200, 169, 106, 0.35)";

// The compass star silhouette (src/lib/icons/render.ts): sixteen vertices
// alternating point and waist radii, stepping 22.5° from 12 o'clock.
const starPath = (cx, cy, R) =>
  Array.from({ length: 16 }, (_, i) => {
    const r = i % 4 === 0 ? R : i % 2 === 0 ? (R * 9) / 14 : R / 4;
    const t = (i * 22.5 * Math.PI) / 180;
    const [x, y] = [cx + r * Math.sin(t), cy - r * Math.cos(t)];
    return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(" ") + " Z";

const at = (cx, cy, r, thetaDeg) => {
  const t = (thetaDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) };
};

const orbit = (cx, cy, r, color) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="1"/>`;

const body = (cx, cy, r, thetaDeg, size, color) => {
  const { x, y } = at(cx, cy, r, thetaDeg);
  return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${size / 2}" fill="${color}"/>`;
};

// Orrery breaking off the top-left, sun-star seated at center (site-plate
// proportions, scaled to the banner's short height).
const ORR_CX = 240;
const ORR_CY = 80;

const chart = () => `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <mask id="starHole">
      <rect width="${WIDTH}" height="${HEIGHT}" fill="#fff"/>
      <circle cx="${ORR_CX}" cy="${ORR_CY}" r="15" fill="#000"/>
    </mask>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${BG}"/>
  ${orbit(1720, 560, 220, ORB_INK)}
  ${orbit(1720, 560, 300, ORB_BRASS)}
  ${body(1720, 560, 300, 220, 6, ORB_BRASS)}
  ${orbit(ORR_CX, ORR_CY, 70, ORB_INK)}
  ${orbit(ORR_CX, ORR_CY, 120, ORB_BRASS)}
  ${orbit(ORR_CX, ORR_CY, 170, ORB_INK)}
  ${orbit(ORR_CX, ORR_CY, 230, ORB_BRASS)}
  ${body(ORR_CX, ORR_CY, 70, 200, 6, BRASS)}
  ${body(ORR_CX, ORR_CY, 120, 340, 5, CELEST)}
  ${body(ORR_CX, ORR_CY, 170, 120, 7, ORB_INK)}
  ${body(ORR_CX, ORR_CY, 230, 165, 5, ORB_BRASS)}
  <path mask="url(#starHole)" fill="${TICK}" d="${starPath(ORR_CX, ORR_CY, 52)}"/>
  <circle cx="${ORR_CX}" cy="${ORR_CY}" r="12" fill="${BG}" stroke="${BRASS}" stroke-width="1"/>
  <circle cx="${ORR_CX}" cy="${ORR_CY}" r="4" fill="${BRASS}"/>
</svg>`;

const fontFile = (pkg, file) =>
  readFileSync(
    path.join(process.cwd(), "node_modules", "@fontsource", pkg, "files", file),
  );

const div = (style, children) => ({ type: "div", props: { style, children } });

// The tagline splits across the site's two voices: the grounded half in
// roman Marcellus, the airborne half floating off in Cormorant italic.
const tree = div(
  {
    width: WIDTH,
    height: HEIGHT,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    paddingTop: 44,
    paddingRight: 90,
  },
  [
    div(
      {
        fontFamily: "Spline Sans Mono",
        fontWeight: 300,
        fontSize: 20,
        letterSpacing: 6,
        textTransform: "uppercase",
        color: CELEST,
      },
      "ZMC.DEV · ARKANSAS",
    ),
    div(
      {
        fontFamily: "Marcellus",
        fontWeight: 400,
        fontSize: 52,
        letterSpacing: 3,
        color: INK,
        marginTop: 24,
      },
      "FEET ON THE GROUND.",
    ),
    div(
      {
        fontFamily: "Cormorant",
        fontStyle: "italic",
        fontWeight: 500,
        fontSize: 56,
        letterSpacing: 1,
        color: BRASS,
        marginTop: 10,
      },
      "Head in the cloud.",
    ),
    div({
      height: 1,
      width: 560,
      backgroundColor: HAIR,
      marginTop: 26,
      marginBottom: 20,
    }),
    div(
      {
        fontFamily: "Spline Sans Mono",
        fontWeight: 300,
        fontSize: 18,
        letterSpacing: 4,
        textTransform: "uppercase",
        color: INK_DIM,
      },
      "FULL-STACK · KUBERNETES · OPEN SOURCE",
    ),
  ],
);

const out = process.argv[2] ?? "linkedin-banner.png";

const svg = await satori(/** @type {any} */ (tree), {
  width: WIDTH,
  height: HEIGHT,
  fonts: [
    {
      name: "Marcellus",
      data: fontFile("marcellus", "marcellus-latin-400-normal.woff"),
      weight: 400,
      style: "normal",
    },
    {
      name: "Spline Sans Mono",
      data: fontFile(
        "spline-sans-mono",
        "spline-sans-mono-latin-300-normal.woff",
      ),
      weight: 300,
      style: "normal",
    },
    {
      name: "Cormorant",
      data: fontFile("cormorant", "cormorant-latin-500-italic.woff"),
      weight: 500,
      style: "italic",
    },
  ],
});

// librsvg and satori both rasterize hairlines and glyph edges softly at
// native resolution (same fix as the apple touch icon): rasterize both SVG
// layers at 4× via density, composite at full size, then downsample. Two
// passes — sharp's pipeline resizes before compositing, so the 4× composite
// must be flattened to a buffer before the resize.
//
// The file ships at 2× the 1584×396 spec: LinkedIn accepts oversized
// uploads, and HiDPI screens stretch a spec-sized banner across twice the
// device pixels — the 2× master is what keeps it crisp there. A light
// unsharp pass after the downsample restores the edge contrast the
// lanczos averaging eats.
const SS = 4;
const DENSITY = 72 * SS;
const OUT_SCALE = 2;

const text = await sharp(Buffer.from(svg), { density: DENSITY })
  .png()
  .toBuffer();
const supersampled = await sharp(Buffer.from(chart()), { density: DENSITY })
  .composite([{ input: text }])
  .png()
  .toBuffer();
const png = await sharp(supersampled)
  .resize(WIDTH * OUT_SCALE, HEIGHT * OUT_SCALE)
  .sharpen({ sigma: 0.6 })
  .png()
  .toBuffer();
writeFileSync(out, png);
console.log(
  `wrote ${out} (${WIDTH * OUT_SCALE}×${HEIGHT * OUT_SCALE}, a ${OUT_SCALE}× master of the ${WIDTH}×${HEIGHT} spec, ${png.length} bytes)`,
);
