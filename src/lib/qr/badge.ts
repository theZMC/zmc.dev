import satori from "satori";
import { marcellus } from "../icons/render";

// The nav sigil — Z·M·C in Marcellus — as pure glyph paths for the QR
// badge. satori turns the text into outlines, so the badge renders
// identically everywhere the SVG travels (standalone downloads, deck
// tools, print) with no font at scan time, and the paths inherit the
// plate's star fill from their parent <g>.

export interface Monogram {
  /** inner <path> markup, fill inherited */
  body: string;
  /** satori canvas box the paths are laid out in */
  width: number;
  height: number;
}

// A tight canvas so fitting the box into the badge rect fits the text:
// Marcellus Z·M·C at 72px with the sigil's letterspacing runs ~250px.
const WIDTH = 270;
const HEIGHT = 82;
const FONT_SIZE = 72;
const LETTER_SPACING = 14;

const render = async (): Promise<Monogram> => {
  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          width: WIDTH,
          height: HEIGHT,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // offset the trailing letter-space, the sigil's own trick
          paddingLeft: LETTER_SPACING,
          fontFamily: "Marcellus",
          fontSize: FONT_SIZE,
          letterSpacing: LETTER_SPACING,
          color: "#000",
        },
        children: "Z·M·C",
      },
    } as unknown as import("react").ReactNode,
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        { name: "Marcellus", data: marcellus, weight: 400, style: "normal" },
      ],
    },
  );
  const body = [...svg.matchAll(/<path [^>]*?d="([^"]+)"[^>]*\/?>/g)]
    .map((m) => `<path d="${m[1]}"/>`)
    .join("");
  if (!body) throw new Error("qr badge: satori produced no glyph paths");
  return { body, width: WIDTH, height: HEIGHT };
};

// one satori pass per process, shared by every page's plate and endpoint
let cached: Promise<Monogram> | undefined;
export const monogram = (): Promise<Monogram> => (cached ??= render());
