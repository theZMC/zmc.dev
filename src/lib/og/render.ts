import { readFileSync } from "node:fs";
import path from "node:path";
import satori from "satori";
import sharp from "sharp";
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

// A hairline orbit circle centered at (cx, cy) with radius r.
const orbit = (cx: number, cy: number, r: number, color: string): Node =>
  div({
    position: "absolute",
    left: cx - r,
    top: cy - r,
    width: r * 2,
    height: r * 2,
    borderRadius: "50%",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: color,
  });

// A small filled body sitting on an orbit at angle theta (degrees).
const body = (
  cx: number,
  cy: number,
  r: number,
  thetaDeg: number,
  size: number,
  color: string,
): Node => {
  const t = (thetaDeg * Math.PI) / 180;
  return div({
    position: "absolute",
    left: cx + r * Math.cos(t) - size / 2,
    top: cy + r * Math.sin(t) - size / 2,
    width: size,
    height: size,
    borderRadius: "50%",
    backgroundColor: color,
  });
};

// The brass sun glyph (☉ style): a bordered circle with a filled center,
// sitting on an orbit at angle theta (degrees).
const sun = (cx: number, cy: number, r: number, thetaDeg: number): Node => {
  const t = (thetaDeg * Math.PI) / 180;
  const outer = 30;
  return div(
    {
      position: "absolute",
      left: cx + r * Math.cos(t) - outer / 2,
      top: cy + r * Math.sin(t) - outer / 2,
      width: outer,
      height: outer,
      borderRadius: "50%",
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: BRASS,
      backgroundColor: BG,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    [
      div({
        width: 10,
        height: 10,
        borderRadius: "50%",
        backgroundColor: BRASS,
      }),
    ],
  );
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

  // Partial orrery breaking off the top/right edge.
  const cx = 1120;
  const cy = -30;

  const tree = div(
    {
      width: WIDTH,
      height: HEIGHT,
      display: "flex",
      flexDirection: "column",
      backgroundColor: BG,
      padding: 80,
      position: "relative",
      overflow: "hidden",
    },
    [
      // ---- engraved chart motifs ----
      orbit(cx, cy, 130, ORB_INK),
      orbit(cx, cy, 210, ORB_BRASS),
      orbit(cx, cy, 290, ORB_INK),
      orbit(cx, cy, 380, ORB_BRASS),
      orbit(cx, cy, 470, ORB_INK),
      sun(cx, cy, 290, 115),
      body(cx, cy, 130, 150, 8, ORB_INK),
      body(cx, cy, 210, 95, 7, BRASS),
      body(cx, cy, 380, 103, 6, CELEST),
      body(cx, cy, 470, 96, 5, ORB_BRASS),

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

  const svg = await satori(tree, {
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

  return sharp(Buffer.from(svg)).png().toBuffer();
};
