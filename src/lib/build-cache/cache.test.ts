import { mkdtempSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cacheState,
  cachedBuffer,
  cachedDir,
  getJson,
  hashDir,
  putJson,
  sweep,
} from "./index";

let root: string;

// The store bypasses itself under vitest so the suite never passes on
// stale artifacts; these tests opt back in ("1") against a throwaway
// store root, and reset the globalThis mark/stat state each test.
beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "zmc-build-cache-"));
  vi.stubEnv("ZMC_ARTIFACT_CACHE", "1");
  vi.stubEnv("ZMC_ARTIFACT_CACHE_DIR", root);
  const state = cacheState();
  state.marks.clear();
  for (const cls of Object.keys(state.stats)) delete state.stats[cls];
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(root, { recursive: true, force: true });
});

describe("cachedBuffer", () => {
  it("generates on miss, returns stored bytes on hit", async () => {
    const generate = vi.fn(async () => Buffer.from("plate"));
    const first = await cachedBuffer("og", ["a"], generate);
    const second = await cachedBuffer("og", ["a"], generate);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(first.equals(second)).toBe(true);
    expect(cacheState().stats.og).toEqual({ hits: 1, misses: 1 });
  });

  it("keys distinguish key parts", async () => {
    await cachedBuffer("og", ["a"], async () => Buffer.from("one"));
    const other = await cachedBuffer("og", ["b"], async () =>
      Buffer.from("two"),
    );
    expect(other.toString()).toBe("two");
  });

  it("survives concurrent writers of the same key", async () => {
    const results = await Promise.all(
      Array.from({ length: 4 }, () =>
        cachedBuffer("og", ["same"], async () => Buffer.from("bytes")),
      ),
    );
    for (const result of results) expect(result.toString()).toBe("bytes");
    const entries = readdirSync(path.join(root, "og"));
    expect(entries).toHaveLength(1);
    expect(entries[0]).not.toContain(".tmp-");
  });

  it.each(["0", ""])(
    "bypasses the store entirely without the opt-in (flag %j)",
    async (flag) => {
      // "" exercises the default: neither forced off ("0") nor on ("1"),
      // and this process is vitest, not `astro build` — so bypassed.
      vi.stubEnv("ZMC_ARTIFACT_CACHE", flag);
      const generate = vi.fn(async () => Buffer.from("fresh"));
      await cachedBuffer("og", ["a"], generate);
      await cachedBuffer("og", ["a"], generate);
      expect(generate).toHaveBeenCalledTimes(2);
      expect(readdirSync(root)).toHaveLength(0);
    },
  );
});

describe("getJson / putJson", () => {
  it("round-trips a value and counts the probe miss", () => {
    expect(getJson("diagrams", ["fence"])).toBeUndefined();
    putJson("diagrams", ["fence"], { svg: "<svg/>", width: 10 });
    expect(getJson("diagrams", ["fence"])).toEqual({
      svg: "<svg/>",
      width: 10,
    });
    expect(cacheState().stats.diagrams).toEqual({ hits: 1, misses: 1 });
  });
});

describe("cachedDir", () => {
  it("snapshots on miss and restores on hit", async () => {
    const dest = path.join(root, "out", "deck");
    const generate = vi.fn(async () => {
      mkdirSync(dest, { recursive: true });
      writeFileSync(path.join(dest, "index.html"), "deck");
    });
    expect(await cachedDir("talks", ["k"], dest, generate)).toBe("miss");
    rmSync(dest, { recursive: true });
    expect(await cachedDir("talks", ["k"], dest, generate)).toBe("hit");
    expect(generate).toHaveBeenCalledTimes(1);
    expect(readdirSync(dest)).toEqual(["index.html"]);
  });
});

describe("hashDir", () => {
  const seed = (): string => {
    const dir = mkdtempSync(path.join(tmpdir(), "zmc-hashdir-"));
    writeFileSync(path.join(dir, "a.md"), "alpha");
    writeFileSync(path.join(dir, "b.md"), "beta");
    return dir;
  };

  it("busts on rename even when contents are unchanged", () => {
    const dir = seed();
    const before = hashDir(dir);
    rmSync(path.join(dir, "b.md"));
    writeFileSync(path.join(dir, "c.md"), "beta");
    expect(hashDir(dir)).not.toBe(before);
    rmSync(dir, { recursive: true });
  });

  it("busts on content change, addition, and deletion", () => {
    const dir = seed();
    const before = hashDir(dir);
    writeFileSync(path.join(dir, "a.md"), "alpha2");
    const changed = hashDir(dir);
    expect(changed).not.toBe(before);
    writeFileSync(path.join(dir, "d.md"), "delta");
    const added = hashDir(dir);
    expect(added).not.toBe(changed);
    rmSync(path.join(dir, "d.md"));
    expect(hashDir(dir)).toBe(changed);
    rmSync(dir, { recursive: true });
  });

  it("ignores node_modules and .DS_Store", () => {
    const dir = seed();
    const before = hashDir(dir);
    mkdirSync(path.join(dir, "node_modules"));
    writeFileSync(path.join(dir, "node_modules", "x.js"), "dep");
    writeFileSync(path.join(dir, ".DS_Store"), "finder");
    expect(hashDir(dir)).toBe(before);
    rmSync(dir, { recursive: true });
  });
});

describe("sweep", () => {
  it("keeps marked entries, removes unmarked ones and temp strays", async () => {
    await cachedBuffer("og", ["keep"], async () => Buffer.from("keep"));
    writeFileSync(path.join(root, "og", "stale.bin"), "stale");
    writeFileSync(path.join(root, "og", "orphan.bin.tmp-1-1"), "partial");
    const summary = sweep();
    expect(summary).toEqual({ og: 2 });
    const entries = readdirSync(path.join(root, "og"));
    expect(entries).toHaveLength(1);
  });

  it("does nothing when bypassed", async () => {
    await cachedBuffer("og", ["keep"], async () => Buffer.from("keep"));
    cacheState().marks.clear();
    vi.stubEnv("ZMC_ARTIFACT_CACHE", "0");
    expect(sweep()).toEqual({});
    expect(readdirSync(path.join(root, "og"))).toHaveLength(1);
  });
});
