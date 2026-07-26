// @ts-check
// Every QR beacon must actually scan: each built qr page's inline star
// field — in both color polarities, and small — and its standalone
// qr.svg sibling must decode to exactly the canonical URL of the page
// they belong to, at EC level H. This is what licenses the stylized
// geometry (src/lib/qr/render.ts): a styling tweak that breaks real
// scanners fails here first. Runs in CI between build and deploy
// (.github/workflows/deploy.yaml) and locally via `pnpm check:qr`.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { readBarcodes } from "zxing-wasm/reader";

const SITE = "https://zmc.dev";
// the light-scheme literals the inline var() fallbacks carry (QR_LIGHT)
const STAR = "#1a1e29";
const FIELD = "#e9e3d3";
// what dark-mode screens actually show: --brass stars on the --bg field
const DARK_STAR = "#c8a96a";
const DARK_FIELD = "#0b0e14";
// The small-render check scales with density: the comet-slim stars
// (src/lib/qr/render.ts) erode below ~6px per module, so the floor is
// per-module, not a fixed pixel size — a v3 and a v7 code get the same
// real margin.
const SMALL_PX_PER_MODULE = 7;

const dist = path.join(process.cwd(), "dist");

/**
 * @param {string} dir
 * @returns {string[]}
 */
function htmlFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(full);
    return entry.name.endsWith(".html") ? [full] : [];
  });
}

/**
 * Decode a sized SVG and return the single QR payload, or a problem string.
 *
 * @param {string} svg
 * @param {string} expected
 * @param {string} what
 * @returns {Promise<string | null>}
 */
async function decodeProblem(svg, expected, what) {
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  const results = await readBarcodes(new Uint8Array(png), {
    formats: ["QRCode"],
  });
  if (results.length !== 1) {
    return `${what}: expected 1 QR symbol, found ${results.length}`;
  }
  if (results[0].text !== expected) {
    return `${what}: decodes to ${JSON.stringify(results[0].text)}, expected ${JSON.stringify(expected)}`;
  }
  if (results[0].ecLevel !== "H") {
    return `${what}: EC level ${JSON.stringify(results[0].ecLevel)}, expected "H"`;
  }
  return null;
}

/**
 * @param {string} svg
 * @param {number} size
 * @returns {string}
 */
function sized(svg, size) {
  return svg.replace(/<svg /, `<svg width="${size}" height="${size}" `);
}

/**
 * @param {string} file
 * @returns {Promise<string[]>}
 */
async function qrPageProblems(file) {
  const rel = path.relative(dist, file);
  // dist/posts/x/qr/index.html → https://zmc.dev/posts/x/
  const parent = path.dirname(path.dirname(rel));
  const expected = parent === "." ? `${SITE}/` : `${SITE}/${parent}/`;

  const html = readFileSync(file, "utf8");
  const match = html.match(/<svg class="qr-svg"[\s\S]*?<\/svg>/);
  if (!match) return ["no inline qr-svg"];

  const viewBox = match[0].match(/viewBox="0 0 (\d+) \d+"/);
  if (!viewBox) return ["inline qr-svg has no viewBox"];
  const small = Number(viewBox[1]) * SMALL_PX_PER_MODULE;

  const inline = match[0]
    .replace(/var\(--qr-star[^)]*\)/g, STAR)
    .replace(/var\(--qr-field[^)]*\)/g, FIELD);
  const flipped = match[0]
    .replace(/var\(--qr-star[^)]*\)/g, FIELD)
    .replace(/var\(--qr-field[^)]*\)/g, STAR);
  const dark = match[0]
    .replace(/var\(--qr-star[^)]*\)/g, DARK_STAR)
    .replace(/var\(--qr-field[^)]*\)/g, DARK_FIELD);

  const svgPath = path.join(path.dirname(path.dirname(file)), "qr.svg");
  const checks = [
    decodeProblem(sized(inline, 1024), expected, "inline @1024"),
    decodeProblem(
      sized(inline, small),
      expected,
      `inline @${small} (${SMALL_PX_PER_MODULE}px/module)`,
    ),
    decodeProblem(sized(flipped, 1024), expected, "flipped @1024"),
    decodeProblem(sized(dark, 1024), expected, "dark brass @1024"),
    decodeProblem(
      sized(dark, small),
      expected,
      `dark brass @${small} (${SMALL_PX_PER_MODULE}px/module)`,
    ),
    existsSync(svgPath)
      ? decodeProblem(readFileSync(svgPath, "utf8"), expected, "qr.svg")
      : Promise.resolve(`no standalone qr.svg beside ${rel}`),
  ];
  return (await Promise.all(checks)).filter((p) => p !== null);
}

/**
 * A talk deck's standalone beacon: dist/talks/<slug>/qr.svg, written by
 * the talks integration after the Slidev build. The deck's inline form
 * lives inside a hashed JS bundle where it can't be extracted reliably,
 * so the standalone artifact carries the deck's polarity coverage: its
 * baked QR_LIGHT literals are substituted to the dark-brass and flipped
 * pairs — the same geometry the slide shows through var().
 *
 * @param {string} slug
 * @returns {Promise<string[]>}
 */
async function talkQrProblems(slug) {
  const expected = `${SITE}/talks/${slug}/`;
  const svgPath = path.join(dist, "talks", slug, "qr.svg");
  if (!existsSync(svgPath)) return ["no qr.svg in the deck output"];
  const svg = readFileSync(svgPath, "utf8");

  const viewBox = svg.match(/viewBox="0 0 (\d+) \d+"/);
  if (!viewBox) return ["qr.svg has no viewBox"];
  const small = Number(viewBox[1]) * SMALL_PX_PER_MODULE;
  // the standalone bakes its own 1024 box — resize it, don't double up
  const resize = (/** @type {string} */ s, /** @type {number} */ px) =>
    s.replace('width="1024" height="1024"', `width="${px}" height="${px}"`);

  const dark = svg.replaceAll(STAR, DARK_STAR).replaceAll(FIELD, DARK_FIELD);
  const flipped = svg
    .replaceAll(STAR, "#swap#")
    .replaceAll(FIELD, STAR)
    .replaceAll("#swap#", FIELD);

  const checks = [
    decodeProblem(svg, expected, "qr.svg @1024"),
    decodeProblem(
      resize(svg, small),
      expected,
      `qr.svg @${small} (${SMALL_PX_PER_MODULE}px/module)`,
    ),
    decodeProblem(flipped, expected, "flipped @1024"),
    decodeProblem(dark, expected, "dark brass @1024"),
    decodeProblem(
      resize(dark, small),
      expected,
      `dark brass @${small} (${SMALL_PX_PER_MODULE}px/module)`,
    ),
  ];
  return (await Promise.all(checks)).filter((p) => p !== null);
}

/**
 * Every footer page outside the Slidev-built decks must carry the QR link
 * and both artifacts — coverage can't silently shrink.
 *
 * @param {string} file
 * @returns {string[]}
 */
function coverageProblems(file) {
  const rel = path.relative(dist, file);
  // decks carry no footer; their beacon rides the final slide, and the
  // standalone artifact is gated per-slug below (talkQrProblems)
  if (rel === "404.html" || rel.startsWith("talks/")) return [];
  if (rel === "qr/index.html" || rel.endsWith("/qr/index.html")) return [];
  const html = readFileSync(file, "utf8");
  if (!html.includes("<footer")) return [];

  const problems = [];
  const dir = path.dirname(file);
  if (!/<a[^>]*>\s*QR\s*<\/a>/.test(html))
    problems.push("footer has no QR link");
  if (!existsSync(path.join(dir, "qr", "index.html")))
    problems.push("no qr/index.html sibling");
  if (!existsSync(path.join(dir, "qr.svg"))) problems.push("no qr.svg sibling");
  return problems;
}

if (!existsSync(dist)) {
  console.error("check-qr-codes: no dist/ — run the build first");
  process.exit(1);
}

const pages = htmlFiles(dist);
const qrPages = pages.filter(
  (file) =>
    path.relative(dist, file) === "qr/index.html" ||
    file.endsWith("/qr/index.html"),
);
if (qrPages.length === 0) {
  console.error("check-qr-codes: no qr pages in dist — enumeration is broken");
  process.exit(1);
}

// talks enumerate from source, not dist — a deck whose artifact never got
// written must fail, not vanish from coverage
const talksSrc = path.join(process.cwd(), "src", "data", "talks");
const talkSlugs = existsSync(talksSrc)
  ? readdirSync(talksSrc, { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isDirectory() &&
          existsSync(path.join(talksSrc, entry.name, "slides.md")),
      )
      .map((entry) => entry.name)
  : [];

let failed = false;

/**
 * @param {string} file
 * @param {string[]} problems
 */
function report(file, problems) {
  if (problems.length === 0) return;
  failed = true;
  console.error(`✗ ${path.relative(dist, file)}`);
  for (const problem of problems) console.error(`    ${problem}`);
}

for (const file of pages) report(file, coverageProblems(file));
for (const file of qrPages) report(file, await qrPageProblems(file));
for (const slug of talkSlugs)
  report(path.join(dist, "talks", slug, "qr.svg"), await talkQrProblems(slug));

if (failed) process.exit(1);
console.log(
  `✓ ${qrPages.length} QR beacons and ${talkSlugs.length} deck beacons decode to their pages`,
);
