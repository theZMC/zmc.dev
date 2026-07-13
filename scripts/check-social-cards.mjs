// @ts-check
// Nothing ships imageless: every built HTML page must carry a complete
// social card — og:title, og:description, og:url, twitter:card, and an
// og:image that resolves to a real 1200×630 PNG in dist. Runs in CI between
// build and deploy (.github/workflows/deploy.yaml) and locally via
// `pnpm check:cards`.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const SITE = "https://zmc.dev";
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

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
 * All <meta> name/property → content pairs in the document, attribute
 * order-agnostic.
 *
 * @param {string} html
 * @returns {Map<string, string>}
 */
function metaTags(html) {
  const tags = new Map();
  for (const tag of html.match(/<meta\s[^>]*>/g) ?? []) {
    /** @type {Record<string, string>} */
    const attrs = {};
    for (const [, key, value] of tag.matchAll(/([\w:-]+)="([^"]*)"/g)) {
      attrs[key] = value;
    }
    const key = attrs.property ?? attrs.name;
    if (key) tags.set(key, attrs.content ?? "");
  }
  return tags;
}

/**
 * @param {string} pngPath
 * @returns {{ width: number, height: number } | null}
 */
function pngSize(pngPath) {
  const buf = readFileSync(pngPath);
  // 8-byte signature, 4-byte length, "IHDR", then width/height big-endian
  if (buf.length < 24 || buf.toString("ascii", 12, 16) !== "IHDR") return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/**
 * @param {string} file
 * @param {Map<string, string>} tags
 * @returns {string[]}
 */
function cardProblems(file, tags) {
  const problems = [];
  for (const key of ["og:title", "og:description", "og:url", "og:image"]) {
    if (!tags.get(key)) problems.push(`missing ${key}`);
  }
  if (tags.get("twitter:card") !== "summary_large_image") {
    problems.push(
      `twitter:card is ${JSON.stringify(tags.get("twitter:card") ?? null)}, expected "summary_large_image"`,
    );
  }

  const image = tags.get("og:image");
  if (!image) return problems;

  if (!image.startsWith(`${SITE}/`)) {
    problems.push(`og:image is not an absolute ${SITE} URL: ${image}`);
    return problems;
  }
  const imagePath = path.join(
    dist,
    decodeURIComponent(new URL(image).pathname),
  );
  if (!existsSync(imagePath)) {
    problems.push(`og:image has no file in dist: ${image}`);
    return problems;
  }
  const size = pngSize(imagePath);
  if (!size) {
    problems.push(`og:image is not a PNG: ${image}`);
  } else if (size.width !== OG_WIDTH || size.height !== OG_HEIGHT) {
    problems.push(
      `og:image is ${size.width}×${size.height}, expected ${OG_WIDTH}×${OG_HEIGHT}: ${image}`,
    );
  }
  return problems;
}

if (!existsSync(dist)) {
  console.error("check-social-cards: no dist/ — run the build first");
  process.exit(1);
}

const pages = htmlFiles(dist);
let failed = false;
for (const file of pages) {
  const problems = cardProblems(file, metaTags(readFileSync(file, "utf8")));
  if (problems.length === 0) continue;
  failed = true;
  console.error(`✗ ${path.relative(dist, file)}`);
  for (const problem of problems) console.error(`    ${problem}`);
}

if (failed) process.exit(1);
console.log(`✓ ${pages.length} pages ship complete social cards`);
