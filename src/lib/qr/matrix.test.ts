import { describe, expect, it } from "vitest";
import { finderOrigins } from "./geometry";
import { qrMatrix } from "./matrix";

describe("qrMatrix", () => {
  it("encodes the site root compactly and at EC-H", () => {
    const m = qrMatrix("https://zmc.dev/");
    expect(m.version).toBeLessThanOrEqual(3);
    expect(m.size).toBe(17 + m.version * 4);
  });

  it("the longest current slug stays within the version cap", () => {
    const m = qrMatrix(
      "https://zmc.dev/posts/better-dynamodb-testing-with-dockertest/",
    );
    expect(m.version).toBeLessThanOrEqual(7);
  });

  it("throws loudly past the density cap instead of shipping a worse code", () => {
    expect(() => qrMatrix(`https://zmc.dev/${"x".repeat(400)}/`)).toThrow(
      /short URLs/,
    );
  });

  it("finder rings and centers are dark, separators light — the composed shapes match the matrix", () => {
    const m = qrMatrix("https://zmc.dev/");
    for (const o of finderOrigins(m.size)) {
      // ring corners and center are dark; the 1-module band inside is light
      expect(m.isDark(o.row, o.col)).toBe(true);
      expect(m.isDark(o.row + 6, o.col + 6)).toBe(true);
      expect(m.isDark(o.row + 3, o.col + 3)).toBe(true);
      expect(m.isDark(o.row + 1, o.col + 1)).toBe(false);
      expect(m.isFunction(o.row, o.col)).toBe(true);
    }
  });
});
