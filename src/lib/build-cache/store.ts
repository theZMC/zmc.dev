import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

// The astro config bundle and the SSR pages bundle each carry their own
// instance of this module (the same relocation src/lib/diagrams/render.ts
// documents), so shared mutable state — the mark set and hit/miss
// counters — lives on globalThis under a registered symbol both
// instances resolve to.
const SLOT = Symbol.for("zmc.build-cache");

export interface CacheState {
  /** Store-relative entry paths touched (read or written) this build. */
  marks: Set<string>;
  stats: Record<string, { hits: number; misses: number }>;
}

type Slotted = typeof globalThis & { [SLOT]?: CacheState };

export const cacheState = (): CacheState =>
  ((globalThis as Slotted)[SLOT] ??= { marks: new Set(), stats: {} });

export const storeRoot = (): string =>
  process.env.ZMC_ARTIFACT_CACHE_DIR ??
  path.join(process.cwd(), ".cache", "artifacts");

// Active only during `astro build` (the same argv sniff astro.config.mjs
// uses): dev must always regenerate, because the manifest/lockfile memos
// live as long as the process and Vite never invalidates dependencies —
// a long-lived dev server would serve pre-edit pixels from stale keys.
// Vitest must never pass on stale artifacts either, so tests bypass the
// store unless they opt in (the cache's own tests set "1"); "0" is the
// local escape hatch when a cache is suspect.
export const bypassed = (): boolean => {
  const flag = process.env.ZMC_ARTIFACT_CACHE;
  if (flag === "0") return true;
  if (flag === "1") return false;
  return process.env.VITEST !== undefined || !process.argv.includes("build");
};

export const count = (cls: string, kind: "hits" | "misses"): void => {
  const stats = cacheState().stats;
  (stats[cls] ??= { hits: 0, misses: 0 })[kind] += 1;
};

export const mark = (relPath: string): void => {
  cacheState().marks.add(relPath);
};

export const readEntry = (relPath: string): Buffer | undefined => {
  const file = path.join(storeRoot(), relPath);
  return existsSync(file) ? readFileSync(file) : undefined;
};

// Temp-sibling + rename: concurrent writers of one key (two documents
// carrying an identical mermaid fence transform at once) each land a
// complete entry, and the last rename wins with identical bytes.
let seq = 0;
const tmpSibling = (target: string): string =>
  `${target}.tmp-${process.pid}-${(seq += 1)}`;

export const writeEntry = (relPath: string, data: Buffer | string): void => {
  const target = path.join(storeRoot(), relPath);
  mkdirSync(path.dirname(target), { recursive: true });
  const tmp = tmpSibling(target);
  writeFileSync(tmp, data);
  renameSync(tmp, target);
};

export const hasDirEntry = (relPath: string): boolean =>
  existsSync(path.join(storeRoot(), relPath));

export const restoreDirEntry = (relPath: string, dest: string): void => {
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(path.dirname(dest), { recursive: true });
  cpSync(path.join(storeRoot(), relPath), dest, { recursive: true });
};

export const snapshotDirEntry = (relPath: string, source: string): void => {
  const target = path.join(storeRoot(), relPath);
  mkdirSync(path.dirname(target), { recursive: true });
  const tmp = tmpSibling(target);
  cpSync(source, tmp, { recursive: true });
  // renameSync refuses an existing directory target; if another writer
  // landed the same key first, its copy is equivalent — discard ours.
  if (existsSync(target)) rmSync(tmp, { recursive: true, force: true });
  else renameSync(tmp, target);
};

export type SweepSummary = Record<string, number>;

/**
 * Delete every entry the current build did not touch — unmarked keys are
 * artifacts whose inputs no longer exist (deleted post, renamed talk,
 * changed renderer), and sweeping them keeps the store at working-set
 * size. Stray temp siblings from crashed builds go the same way, since
 * marks only ever hold final entry names.
 */
export const sweep = (): SweepSummary => {
  const root = storeRoot();
  const summary: SweepSummary = {};
  if (bypassed() || !existsSync(root)) return summary;
  const { marks } = cacheState();
  for (const cls of readdirSync(root, { withFileTypes: true })) {
    if (!cls.isDirectory()) continue;
    for (const entry of readdirSync(path.join(root, cls.name))) {
      if (marks.has(`${cls.name}/${entry}`)) continue;
      rmSync(path.join(root, cls.name, entry), {
        recursive: true,
        force: true,
      });
      summary[cls.name] = (summary[cls.name] ?? 0) + 1;
    }
  }
  return summary;
};
