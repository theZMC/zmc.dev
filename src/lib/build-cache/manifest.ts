import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

export type ArtifactClass =
  | "og"
  | "icons"
  | "diagrams"
  | "talks"
  | "resume-pdf";

export const hashString = (data: string | Buffer): string =>
  createHash("sha256").update(data).digest("hex");

/**
 * The renderer sources whose changes must bust each class. Directories
 * expand recursively. The diagrams entry deliberately stops at the
 * renderer + palette: the hast post-processors (actor-labels et al.) run
 * on every build after the cache, so editing them takes effect without a
 * bust. The talks entry carries the qr lib (feeds deckQr and the theme's
 * virtual:zmc-qr) and the theme package the decks build against.
 */
const MANIFESTS: Record<ArtifactClass, string[]> = {
  og: ["src/lib/og"],
  icons: ["src/lib/icons/render.ts"],
  diagrams: [
    "src/lib/diagrams/render.ts",
    "src/lib/diagrams/palette.ts",
    "src/lib/diagrams/fonts.css",
  ],
  talks: [
    "src/lib/talks/integration.mjs",
    "src/lib/qr",
    // The qr lib draws its star and monogram from the icons module
    // (star4Path, marcellus) — outside src/lib/qr, so listed explicitly.
    "src/lib/icons/render.ts",
    "packages/slidev-theme-zmc",
  ],
  "resume-pdf": [
    "src/lib/resume-pdf",
    "src/lib/resume",
    "src/lib/utils/tenure.ts",
  ],
};

const SKIP_DIRS = new Set(["node_modules", "dist", ".git"]);

// Tests don't shape artifacts; pdfs are gitignored (the theme package's
// example export exists locally but not in CI, and an untracked file in
// the hash would make the two disagree for no reason).
const skipManifestFile = (name: string): boolean =>
  name.endsWith(".test.ts") || name.endsWith(".pdf");

const collect = (
  dir: string,
  base: string,
  skipFile: ((name: string) => boolean) | undefined,
  pairs: string[],
): void => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) collect(full, base, skipFile, pairs);
    } else if (entry.name !== ".DS_Store" && !skipFile?.(entry.name)) {
      const rel = path.relative(base, full).split(path.sep).join("/");
      pairs.push(`${rel}\0${hashString(readFileSync(full))}`);
    }
  }
};

/**
 * Hash a directory as sorted (relative path, content hash) pairs, so a
 * rename, addition, or deletion busts the hash even when the byte union
 * of the files is unchanged.
 */
export const hashDir = (dir: string): string => {
  const pairs: string[] = [];
  collect(dir, dir, undefined, pairs);
  return hashString(pairs.sort().join("\n"));
};

// Manifest and lockfile hashes are pure functions of files that don't
// change mid-build; memoizing per module instance is only a read saver.
const manifestMemo = new Map<ArtifactClass, string>();

export const manifestHash = (cls: ArtifactClass): string => {
  const memo = manifestMemo.get(cls);
  if (memo) return memo;
  const pairs: string[] = [];
  for (const source of MANIFESTS[cls]) {
    const full = path.join(process.cwd(), source);
    // A moved or renamed source must fail naming its class, not as a
    // bare ENOENT — a silently-dropped entry would weaken the key.
    if (!existsSync(full)) {
      throw new Error(
        `[build-cache] ${cls} manifest references missing path ${source}`,
      );
    }
    if (statSync(full).isDirectory()) {
      const scoped: string[] = [];
      collect(full, full, skipManifestFile, scoped);
      pairs.push(...scoped.map((pair) => `${source}/${pair}`));
    } else {
      pairs.push(`${source}\0${hashString(readFileSync(full))}`);
    }
  }
  const hash = hashString(pairs.sort().join("\n"));
  manifestMemo.set(cls, hash);
  return hash;
};

let lockfileMemo: string | undefined;

export const lockfileHash = (): string =>
  (lockfileMemo ??= hashString(
    readFileSync(path.join(process.cwd(), "pnpm-lock.yaml")),
  ));
