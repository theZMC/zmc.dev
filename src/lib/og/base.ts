import { readFileSync } from "node:fs";
import path from "node:path";
import satori from "satori";
import sharp from "sharp";

export const WIDTH = 1200;
export const HEIGHT = 630;

// Engraved celestial chart tokens (dark theme, src/lib/styles/global.css)
export const BG = "#0b0e14";
export const INK = "#e8e4d8";
export const INK_DIM = "#9ba0a8";
export const BRASS = "#c8a96a";
export const CELEST = "#7a93b8";
export const HAIR = "rgba(232, 228, 216, 0.1)";
export const ORB_BRASS = "rgba(200, 169, 106, 0.3)";
export const ORB_INK = "rgba(232, 228, 216, 0.12)";
export const TICK = "rgba(200, 169, 106, 0.35)";

// satori can't parse woff2; load the plain WOFF cuts from @fontsource.
// The build always runs from the repo root, so resolve via cwd.
const fontFile = (pkg: string, file: string): Buffer =>
  readFileSync(
    path.join(process.cwd(), "node_modules", "@fontsource", pkg, "files", file),
  );

const fonts = [
  {
    name: "Marcellus",
    data: fontFile("marcellus", "marcellus-latin-400-normal.woff"),
    weight: 400 as const,
    style: "normal" as const,
  },
  {
    name: "Spline Sans Mono",
    data: fontFile("spline-sans-mono", "spline-sans-mono-latin-300-normal.woff"),
    weight: 300 as const,
    style: "normal" as const,
  },
  {
    name: "Cormorant",
    data: fontFile("cormorant", "cormorant-latin-500-italic.woff"),
    weight: 500 as const,
    style: "italic" as const,
  },
];

export type Node = {
  type: string;
  props: {
    style?: Record<string, string | number>;
    children?: (Node | string)[] | Node | string;
  };
};

export const div = (
  style: Record<string, string | number>,
  children?: (Node | string)[] | string,
): Node => ({ type: "div", props: { style, children } });

// ---- engraved chart primitives, shared by every plate background ----

export const at = (
  cx: number,
  cy: number,
  r: number,
  thetaDeg: number,
): { x: number; y: number } => {
  const t = (thetaDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) };
};

// A hairline orbit circle around the given chart center.
export const orbit = (cx: number, cy: number, r: number, color: string): string =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="1"/>`;

// A small filled body of the given diameter, on orbit r at angle theta.
export const body = (
  cx: number,
  cy: number,
  r: number,
  thetaDeg: number,
  size: number,
  color: string,
): string => {
  const { x, y } = at(cx, cy, r, thetaDeg);
  return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${size / 2}" fill="${color}"/>`;
};

// The satori text tree renders on a transparent layer and composites over the
// chart SVG, so text trees never set a backgroundColor of their own.
export const compose = async (
  chart: string,
  tree: Node,
): Promise<Buffer> => {
  // The tree mimics React elements structurally; satori's ReactNode
  // parameter only became visible to tsc once @types/react was installed.
  const svg = await satori(tree as unknown as import("react").ReactNode, {
    width: WIDTH,
    height: HEIGHT,
    fonts,
  });

  const text = await sharp(Buffer.from(svg)).png().toBuffer();
  return sharp(Buffer.from(chart))
    .composite([{ input: text }])
    .png()
    .toBuffer();
};
