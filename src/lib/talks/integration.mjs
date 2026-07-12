// @ts-check
import { spawn } from "node:child_process";
import { existsSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TALKS_BASE = "src/data/talks";
const DECKS_OUT = "public/talks";

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

  return {
    name: "talks",
    hooks: {
      "astro:config:done": ({ config }) => {
        root = fileURLToPath(config.root);
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
          await buildDeck(root, decksDir, slug);
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
 * @returns {Promise<void>}
 */
function buildDeck(root, decksDir, slug) {
  const entry = path.join(TALKS_BASE, slug, "slides.md");
  const out = path.join(decksDir, slug);

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
      if (code === 0) resolve();
      else reject(new Error(`slidev build ${slug} exited ${code}:\n${output}`));
    });
  });
}
