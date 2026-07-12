import { readFileSync } from "node:fs";
import path from "node:path";
import satori from "satori";
import sharp from "sharp";
import { starPath } from "@lib/icons/render";
import { formatPostDate } from "@lib/utils/dates";

const WIDTH = 1200;
const HEIGHT = 630;

// Engraved celestial chart tokens (dark theme, src/lib/styles/global.css)
const BG = "#0b0e14";
const INK = "#e8e4d8";
const INK_DIM = "#9ba0a8";
const BRASS = "#c8a96a";
const CELEST = "#7a93b8";
const HAIR = "rgba(232, 228, 216, 0.1)";
const ORB_BRASS = "rgba(200, 169, 106, 0.3)";
const ORB_INK = "rgba(232, 228, 216, 0.12)";
const TICK = "rgba(200, 169, 106, 0.35)";

// satori can't parse woff2; load the plain WOFF cuts from @fontsource.
// The build always runs from the repo root, so resolve via cwd.
const fontFile = (pkg: string, file: string): Buffer =>
  readFileSync(
    path.join(process.cwd(), "node_modules", "@fontsource", pkg, "files", file),
  );

const marcellus = fontFile("marcellus", "marcellus-latin-400-normal.woff");
const splineSansMono = fontFile(
  "spline-sans-mono",
  "spline-sans-mono-latin-300-normal.woff",
);

type Node = {
  type: string;
  props: {
    style?: Record<string, string | number>;
    children?: (Node | string)[] | Node | string;
  };
};

const div = (
  style: Record<string, string | number>,
  children?: (Node | string)[] | string,
): Node => ({ type: "div", props: { style, children } });

// ---- engraved chart base: a partial orrery breaking off the top/right ----
// Rendered as raw SVG (not satori divs) so the compass star can carry the
// same filled silhouette as the orrery and the icons; the satori-rendered
// text composites on top.

const CHART_CX = 1120;
const CHART_CY = -30;

const at = (r: number, thetaDeg: number): { x: number; y: number } => {
  const t = (thetaDeg * Math.PI) / 180;
  return { x: CHART_CX + r * Math.cos(t), y: CHART_CY + r * Math.sin(t) };
};

// A hairline orbit circle around the chart center.
const orbit = (r: number, color: string): string =>
  `<circle cx="${CHART_CX}" cy="${CHART_CY}" r="${r}" fill="none" stroke="${color}" stroke-width="1"/>`;

// A small filled body of the given diameter, on orbit r at angle theta.
const body = (r: number, thetaDeg: number, size: number, color: string): string => {
  const { x, y } = at(r, thetaDeg);
  return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${size / 2}" fill="${color}"/>`;
};

// The filled compass star with the ☉ sun glyph in its punched core
// (orrery proportions from R=48/ring 11, scaled to the ring 15 sun the
// chart has always carried), sitting on the r=290 orbit at 115°.
const chartSvg = (): string => {
  const sun = at(290, 115);
  const [sx, sy] = [Number(sun.x.toFixed(1)), Number(sun.y.toFixed(1))];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <mask id="starHole">
      <rect width="${WIDTH}" height="${HEIGHT}" fill="#fff"/>
      <circle cx="${sx}" cy="${sy}" r="19" fill="#000"/>
    </mask>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${BG}"/>
  ${orbit(130, ORB_INK)}
  ${orbit(210, ORB_BRASS)}
  ${orbit(290, ORB_INK)}
  ${orbit(380, ORB_BRASS)}
  ${orbit(470, ORB_INK)}
  ${body(130, 150, 8, ORB_INK)}
  ${body(210, 95, 7, BRASS)}
  ${body(380, 103, 6, CELEST)}
  ${body(470, 96, 5, ORB_BRASS)}
  <path mask="url(#starHole)" fill="${TICK}" d="${starPath(sx, sy, 65)}"/>
  <circle cx="${sx}" cy="${sy}" r="15" fill="${BG}" stroke="${BRASS}" stroke-width="1"/>
  <circle cx="${sx}" cy="${sy}" r="5" fill="${BRASS}"/>
</svg>`;
};

export interface RenderPostImageInput {
  title: string;
  date: string;
  tags: string[];
}

export const renderPostImage = async ({
  title,
  date,
  tags,
}: RenderPostImageInput): Promise<Buffer> => {
  const longDate = formatPostDate(date);

  // Text only — the engraved chart renders separately as chartSvg() and
  // this tree composites over it, so no backgroundColor here.
  const tree = div(
    {
      width: WIDTH,
      height: HEIGHT,
      display: "flex",
      flexDirection: "column",
      padding: 80,
      position: "relative",
      overflow: "hidden",
    },
    [
      // ---- eyebrow ----
      div(
        {
          fontFamily: "Spline Sans Mono",
          fontWeight: 300,
          fontSize: 22,
          letterSpacing: 7,
          textTransform: "uppercase",
          color: CELEST,
        },
        "TRANSMISSION · ZMC.DEV",
      ),

      // ---- title ----
      div(
        {
          // satori only applies lineClamp to block-display text elements
          display: "block",
          fontFamily: "Marcellus",
          fontWeight: 400,
          fontSize: 64,
          lineHeight: 1.22,
          letterSpacing: 2,
          color: INK,
          marginTop: 40,
          maxWidth: 900,
          lineClamp: 3,
        },
        title,
      ),

      div({ flexGrow: 1 }),

      // ---- hairline rule ----
      div({
        height: 1,
        width: "100%",
        backgroundColor: HAIR,
        marginBottom: 30,
      }),

      // ---- meta row ----
      div(
        {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
        },
        [
          div(
            {
              display: "flex",
              alignItems: "baseline",
              fontFamily: "Spline Sans Mono",
              fontWeight: 300,
              fontSize: 20,
              letterSpacing: 3,
              textTransform: "uppercase",
            },
            [
              div({ color: INK_DIM }, longDate),
              div({ color: BRASS, marginLeft: 36 }, tags.join(" · ")),
            ],
          ),
          div(
            {
              fontFamily: "Marcellus",
              fontSize: 24,
              letterSpacing: 8,
              color: BRASS,
            },
            "Z·M·C",
          ),
        ],
      ),
    ],
  );

  // The tree mimics React elements structurally; satori's ReactNode
  // parameter only became visible to tsc once @types/react was installed.
  const svg = await satori(tree as unknown as import("react").ReactNode, {
    width: WIDTH,
    height: HEIGHT,
    fonts: [
      { name: "Marcellus", data: marcellus, weight: 400, style: "normal" },
      {
        name: "Spline Sans Mono",
        data: splineSansMono,
        weight: 300,
        style: "normal",
      },
    ],
  });

  const text = await sharp(Buffer.from(svg)).png().toBuffer();
  return sharp(Buffer.from(chartSvg()))
    .composite([{ input: text }])
    .png()
    .toBuffer();
};
