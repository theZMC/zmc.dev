import {
  bypassed,
  count,
  hasDirEntry,
  mark,
  readEntry,
  restoreDirEntry,
  snapshotDirEntry,
  writeEntry,
} from "./store";
import {
  type ArtifactClass,
  hashString,
  lockfileHash,
  manifestHash,
} from "./manifest";

/**
 * Content-addressed disk cache for expensive build artifacts, persisted
 * across CI runs by actions/cache (.github/workflows/deploy.yaml). Keys
 * fold in the class's renderer sources as (path, content) pairs and the
 * lockfile, so code edits, renames, and dependency bumps bust exactly
 * what they invalidate; the platform tag keeps a cache copied across
 * machines from ever serving foreign-platform pixels (sharp and chromium
 * rasterize differently per platform at equal versions).
 */
// Each part is hashed individually before the vector is joined, so
// callers pass raw content (a chart SVG, a fence, stringified data) and
// no byte inside a part can shift the part boundaries.
const keyFor = (cls: ArtifactClass, keyParts: readonly string[]): string =>
  hashString(
    [
      cls,
      `${process.platform}-${process.arch}`,
      manifestHash(cls),
      lockfileHash(),
      ...keyParts.map(hashString),
    ].join("\0"),
  );

// Single source of the store layout: reads and writes of one entry must
// always agree on this path, or a written entry becomes unreadable.
const relFor = (
  cls: ArtifactClass,
  keyParts: readonly string[],
  ext: "" | ".bin" | ".json",
): string => `${cls}/${keyFor(cls, keyParts)}${ext}`;

export const cachedBuffer = async (
  cls: ArtifactClass,
  keyParts: readonly string[],
  generate: () => Promise<Buffer>,
): Promise<Buffer> => {
  if (bypassed()) return generate();
  const rel = relFor(cls, keyParts, ".bin");
  const hit = readEntry(rel);
  if (hit) {
    mark(rel);
    count(cls, "hits");
    return hit;
  }
  const data = await generate();
  writeEntry(rel, data);
  mark(rel);
  count(cls, "misses");
  return data;
};

// The JSON pair exists as separate get/put because the mermaid renderer
// batches all of a document's misses into one browser session — a shape
// a single generate() thunk can't express.
export const getJson = <T>(
  cls: ArtifactClass,
  keyParts: readonly string[],
): T | undefined => {
  if (bypassed()) return undefined;
  const rel = relFor(cls, keyParts, ".json");
  const hit = readEntry(rel);
  if (!hit) {
    count(cls, "misses");
    return undefined;
  }
  mark(rel);
  count(cls, "hits");
  return JSON.parse(hit.toString("utf8")) as T;
};

export const putJson = (
  cls: ArtifactClass,
  keyParts: readonly string[],
  value: unknown,
): void => {
  if (bypassed()) return;
  const rel = relFor(cls, keyParts, ".json");
  writeEntry(rel, JSON.stringify(value));
  mark(rel);
};

/**
 * Directory-shaped artifacts (talk decks). A hit copies the cached tree
 * over dest; a miss runs generate() — which must leave its output at
 * dest — then snapshots dest into the store.
 */
export const cachedDir = async (
  cls: ArtifactClass,
  keyParts: readonly string[],
  dest: string,
  generate: () => Promise<void>,
): Promise<"hit" | "miss"> => {
  if (bypassed()) {
    await generate();
    return "miss";
  }
  const rel = relFor(cls, keyParts, "");
  if (hasDirEntry(rel)) {
    restoreDirEntry(rel, dest);
    mark(rel);
    count(cls, "hits");
    return "hit";
  }
  await generate();
  snapshotDirEntry(rel, dest);
  mark(rel);
  count(cls, "misses");
  return "miss";
};

export { hashDir } from "./manifest";
export type { ArtifactClass } from "./manifest";
export { cacheState, sweep } from "./store";
