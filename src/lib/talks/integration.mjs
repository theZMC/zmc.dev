// @ts-check
import { spawn } from "node:child_process";
import {
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const TALKS_BASE = "src/data/talks";
const DECKS_OUT = "public/talks";

// Decks are same-origin with the site, so the site's theme toggle
// (localStorage "theme", see src/lib/scripts/theme.ts) can seed Slidev's own
// scheme store before the SPA boots. With no explicit site preference both
// sides fall back to the same prefers-color-scheme query, so they agree in
// every case.
// The meta twin of the theme tokens' scheme support (light on :root, dark
// on html.dark), dark first — the chart's home key: what dark-mode
// extensions (Noir et al.) and the UA read pre-CSS. Without it Noir
// assumes light-only and re-darkens the deck.
const THEME_BRIDGE =
  '<meta name="color-scheme" content="dark light">' +
  "<script>" +
  'try{var t=localStorage.getItem("theme");' +
  'if(t==="dark"||t==="light")localStorage.setItem("slidev-color-schema",t)}' +
  "catch(e){}</script>";

/** @param {string} value */
const escapeAttr = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

/**
 * The deck's social card, sourced from talk.yaml — the same file that feeds
 * the home-page listing. Slidev's own og:title carries a " - Slidev" suffix
 * and its descriptions arrive with the headmatter's quoting intact, so the
 * stale tags are stripped and replaced wholesale.
 *
 * @param {string} root
 * @param {string} slug
 * @param {string} site
 * @returns {string}
 */
function socialMeta(root, slug, site) {
  const yamlPath = path.join(root, TALKS_BASE, slug, "talk.yaml");
  if (!existsSync(yamlPath)) {
    throw new Error(
      `talks: ${slug} has no talk.yaml — the deck's social card and home listing read it`,
    );
  }
  const talk = parse(readFileSync(yamlPath, "utf8"));
  const title = escapeAttr(`${talk.title} — Zach Callahan`);
  const description = escapeAttr(String(talk.description ?? "").trim());
  const image = escapeAttr(new URL(`/og/talks/${slug}.png`, site).toString());
  const url = escapeAttr(new URL(`/talks/${slug}/`, site).toString());
  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:site" content="@theZMC">`,
    `<meta name="twitter:title" content="${title}">`,
    `<meta name="twitter:description" content="${description}">`,
    `<meta name="twitter:image" content="${image}">`,
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${image}">`,
    `<meta property="og:description" content="${description}">`,
    `<meta property="og:site_name" content="ZMC.DEV">`,
    `<meta property="og:locale" content="en_US">`,
  ].join("");
}

/**
 * Slidev decks under src/data/talks/<slug>/slides.md, built into
 * public/talks/<slug>/ at the start of the Astro build so they ride the
 * public-dir copy into dist as first-class assets.
 *
 * public/talks/ is gitignored build output. A side effect of living there:
 * `astro dev` serves whatever the last build produced — possibly stale,
 * never guaranteed present. Authoring uses `pnpm talk <slug>` instead.
 *
 * astro-relative-links rewrites the decks' absolute /talks/<slug>/ paths in
 * dist to relative ones. That rewrite is equivalent — every rewritten path
 * resolves to the same URL from the file's location — and deck JS is
 * untouched, so the SPA's internal absolute base still works.
 *
 * Every deck builds regardless of talk.yaml's `published` flag — publishing
 * gates the home-page listing, not the URL.
 *
 * @returns {import("astro").AstroIntegration}
 */
export default function talks() {
  /** @type {string} */
  let root;
  /** @type {string} */
  let site;

  return {
    name: "talks",
    hooks: {
      "astro:config:done": ({ config }) => {
        root = fileURLToPath(config.root);
        site = config.site ?? "https://zmc.dev";
      },
      "astro:build:start": async ({ logger }) => {
        const talksDir = path.join(root, TALKS_BASE);
        const decksDir = path.join(root, DECKS_OUT);

        // Start clean so deleted or renamed talks don't leave stale decks.
        rmSync(decksDir, { recursive: true, force: true });
        if (!existsSync(talksDir)) return;

        const slugs = readdirSync(talksDir, { withFileTypes: true })
          .filter(
            (entry) =>
              entry.isDirectory() &&
              existsSync(path.join(talksDir, entry.name, "slides.md")),
          )
          .map((entry) => entry.name);

        for (const slug of slugs) {
          logger.info(`building deck ${slug}`);
          await buildDeck(root, decksDir, slug, site);
          logger.info(`deck ready at /talks/${slug}/`);
        }
      },
    },
  };
}

/**
 * @param {string} root
 * @param {string} decksDir
 * @param {string} slug
 * @param {string} site
 * @returns {Promise<void>}
 */
function buildDeck(root, decksDir, slug, site) {
  const entry = path.join(TALKS_BASE, slug, "slides.md");
  const out = path.join(decksDir, slug);
  const meta = socialMeta(root, slug, site);

  return new Promise((resolve, reject) => {
    const child = spawn(
      "pnpm",
      [
        "exec",
        "slidev",
        "build",
        entry,
        "--base",
        `/talks/${slug}/`,
        "--out",
        out,
      ],
      { cwd: root, stdio: ["ignore", "pipe", "pipe"] },
    );

    let output = "";
    child.stdout.on("data", (chunk) => (output += chunk));
    child.stderr.on("data", (chunk) => (output += chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`slidev build ${slug} exited ${code}:\n${output}`));
        return;
      }
      // index.html plus Slidev's SPA-fallback 404.html — every HTML file
      // the deck ships carries the bridge and the full social card.
      const htmlFiles = readdirSync(out).filter((name) =>
        name.endsWith(".html"),
      );
      for (const name of htmlFiles) {
        const htmlPath = path.join(out, name);
        writeFileSync(
          htmlPath,
          readFileSync(htmlPath, "utf8")
            .replace(/<title>[^<]*<\/title>/, "")
            .replace(/<meta name="description"[^>]*>/, "")
            .replace(/<meta property="og:title"[^>]*>/, "")
            .replace(/<meta property="og:description"[^>]*>/, "")
            .replace("<head>", `<head>${THEME_BRIDGE}${meta}`),
        );
      }
      resolve();
    });
  });
}
