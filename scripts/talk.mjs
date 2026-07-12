// @ts-check
// `pnpm talk <slug>` — Slidev's own dev server (hot reload, presenter mode)
// for one talk. Deck URLs only resolve in the built site (`pnpm build &&
// pnpm preview`); this is the authoring loop.
import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

const TALKS_BASE = "src/data/talks";

function availableSlugs() {
  if (!existsSync(TALKS_BASE)) return [];
  return readdirSync(TALKS_BASE, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        existsSync(path.join(TALKS_BASE, entry.name, "slides.md")),
    )
    .map((entry) => entry.name);
}

const slug = process.argv[2];
const entry = slug && path.join(TALKS_BASE, slug, "slides.md");

if (!entry || !existsSync(entry)) {
  const slugs = availableSlugs();
  console.error(slug ? `No talk at ${entry}.` : "Usage: pnpm talk <slug>");
  console.error(
    slugs.length
      ? `Available talks: ${slugs.join(", ")}`
      : `No talks found under ${TALKS_BASE}/.`,
  );
  process.exit(1);
}

spawn("pnpm", ["exec", "slidev", entry, "--open"], { stdio: "inherit" }).on(
  "exit",
  (code) => process.exit(code ?? 0),
);
