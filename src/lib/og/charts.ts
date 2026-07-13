import { starPath } from "@lib/icons/render";
import {
  WIDTH,
  HEIGHT,
  BG,
  BRASS,
  CELEST,
  ORB_BRASS,
  ORB_INK,
  TICK,
  at,
  orbit,
  body,
} from "./base";

// Chart backgrounds render as raw SVG (not satori divs) so the compass star
// can carry the same filled silhouette as the orrery and the icons; the
// satori-rendered text composites on top.

const svg = (children: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  ${children}
</svg>`;

// The filled compass star with the ☉ sun glyph in its punched core
// (orrery proportions from R=48/ring 11, scaled to the ring 15 sun the
// chart has always carried).
const sunStar = (x: number, y: number): { defs: string; marks: string } => ({
  defs: `<mask id="starHole">
      <rect width="${WIDTH}" height="${HEIGHT}" fill="#fff"/>
      <circle cx="${x}" cy="${y}" r="19" fill="#000"/>
    </mask>`,
  marks: `<path mask="url(#starHole)" fill="${TICK}" d="${starPath(x, y, 65)}"/>
  <circle cx="${x}" cy="${y}" r="15" fill="${BG}" stroke="${BRASS}" stroke-width="1"/>
  <circle cx="${x}" cy="${y}" r="5" fill="${BRASS}"/>`,
});

// ---- standard chart: a partial orrery breaking off the top/right ----
// The base every transmission has always carried; index, resume, and talk
// plates ride it too.

const CHART_CX = 1120;
const CHART_CY = -30;

// The sun sits on the r=290 orbit at 115°.
const CHART_SUN = at(CHART_CX, CHART_CY, 290, 115);

export const standardChart = (): string => {
  const [sx, sy] = [
    Number(CHART_SUN.x.toFixed(1)),
    Number(CHART_SUN.y.toFixed(1)),
  ];
  const sun = sunStar(sx, sy);
  return svg(`<defs>
    ${sun.defs}
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${BG}"/>
  ${orbit(CHART_CX, CHART_CY, 130, ORB_INK)}
  ${orbit(CHART_CX, CHART_CY, 210, ORB_BRASS)}
  ${orbit(CHART_CX, CHART_CY, 290, ORB_INK)}
  ${orbit(CHART_CX, CHART_CY, 380, ORB_BRASS)}
  ${orbit(CHART_CX, CHART_CY, 470, ORB_INK)}
  ${body(CHART_CX, CHART_CY, 130, 150, 8, ORB_INK)}
  ${body(CHART_CX, CHART_CY, 210, 95, 7, BRASS)}
  ${body(CHART_CX, CHART_CY, 380, 103, 6, CELEST)}
  ${body(CHART_CX, CHART_CY, 470, 96, 5, ORB_BRASS)}
  ${sun.marks}`);
};

// ---- site chart: the full heliocentric orrery, sun seated at center ----
// The identity plate earns the whole instrument instead of a partial view.

const SITE_CX = 880;
const SITE_CY = 315;

export const siteChart = (): string => {
  const sun = sunStar(SITE_CX, SITE_CY);
  return svg(`<defs>
    ${sun.defs}
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${BG}"/>
  ${orbit(SITE_CX, SITE_CY, 100, ORB_INK)}
  ${orbit(SITE_CX, SITE_CY, 160, ORB_BRASS)}
  ${orbit(SITE_CX, SITE_CY, 220, ORB_INK)}
  ${orbit(SITE_CX, SITE_CY, 285, ORB_BRASS)}
  ${body(SITE_CX, SITE_CY, 100, 200, 7, BRASS)}
  ${body(SITE_CX, SITE_CY, 160, 340, 6, CELEST)}
  ${body(SITE_CX, SITE_CY, 220, 120, 8, ORB_INK)}
  ${body(SITE_CX, SITE_CY, 285, 20, 5, ORB_BRASS)}
  ${sun.marks}`);
};

// ---- lost chart: the sun has drifted off its orbit ----
// The standard orrery, but the compass star's seat sits vacant (dashed) and
// the star itself trails away down-chart on a dotted course — no known orbit.

const LOST_X = 870;
const LOST_Y = 470;

export const lostChart = (): string => {
  const seat = at(CHART_CX, CHART_CY, 290, 115);
  const [vx, vy] = [Number(seat.x.toFixed(1)), Number(seat.y.toFixed(1))];
  const sun = sunStar(LOST_X, LOST_Y);
  return svg(`<defs>
    ${sun.defs}
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${BG}"/>
  ${orbit(CHART_CX, CHART_CY, 130, ORB_INK)}
  ${orbit(CHART_CX, CHART_CY, 210, ORB_BRASS)}
  ${orbit(CHART_CX, CHART_CY, 290, ORB_INK)}
  ${orbit(CHART_CX, CHART_CY, 380, ORB_BRASS)}
  ${orbit(CHART_CX, CHART_CY, 470, ORB_INK)}
  ${body(CHART_CX, CHART_CY, 130, 150, 8, ORB_INK)}
  ${body(CHART_CX, CHART_CY, 210, 95, 7, BRASS)}
  ${body(CHART_CX, CHART_CY, 380, 103, 6, CELEST)}
  ${body(CHART_CX, CHART_CY, 470, 96, 5, ORB_BRASS)}
  <circle cx="${vx}" cy="${vy}" r="19" fill="none" stroke="${TICK}" stroke-width="1" stroke-dasharray="4 6"/>
  <line x1="${vx}" y1="${vy}" x2="${LOST_X}" y2="${LOST_Y}" stroke="${TICK}" stroke-width="1" stroke-dasharray="1 9"/>
  ${sun.marks}`);
};
