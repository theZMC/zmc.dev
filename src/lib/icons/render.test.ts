import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  faviconSvg,
  renderAppleTouchIcon,
  renderFaviconPng,
  star4Path,
} from "./render";

describe("favicon", () => {
  it("carries both theme brasses: dark by default, light behind the media query", () => {
    const svg = faviconSvg();
    expect(svg).toContain('fill="#c8a96a"');
    expect(svg).toMatch(/@media \(prefers-color-scheme: light\).*#8f6f35/s);
  });

  it("rasterizes at the requested size", async () => {
    const meta = await sharp(await renderFaviconPng()).metadata();
    expect([meta.width, meta.height]).toEqual([512, 512]);
  });
});

describe("star4Path", () => {
  it("is a closed eight-vertex path", () => {
    const d = star4Path(0, 0, 1);
    expect(d.match(/[ML]/g)).toHaveLength(8);
    expect(d.endsWith("Z")).toBe(true);
  });

  it("at R = half a module the cardinals land on the edge midpoints", () => {
    // a module at (0,0)–(1,1): points must touch its four edge midpoints
    const d = star4Path(0.5, 0.5, 0.5);
    expect(d).toContain("M 0.50 0.00");
    expect(d).toContain("L 1.00 0.50");
    expect(d).toContain("L 0.50 1.00");
    expect(d).toContain("L 0.00 0.50");
  });

  it("waists sit on the diagonals, symmetric about the center", () => {
    const d = star4Path(0, 0, 1, 0.38);
    const coords = [...d.matchAll(/[ML] (-?[\d.]+) (-?[\d.]+)/g)].map(
      ([, x, y]) => [Number(x), Number(y)],
    );
    const waists = coords.filter((_, i) => i % 2 === 1);
    for (const [x, y] of waists) {
      expect(Math.abs(Math.abs(x) - Math.abs(y))).toBeLessThan(0.011);
      expect(Math.hypot(x, y)).toBeCloseTo(0.38, 2);
    }
  });
});

describe("apple touch icon", () => {
  it("is 180×180 and fully opaque — iOS composites no alpha", async () => {
    const png = await renderAppleTouchIcon();
    const meta = await sharp(png).metadata();
    expect([meta.width, meta.height]).toEqual([180, 180]);

    const { data, info } = await sharp(png)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    for (let i = 3; i < data.length; i += info.channels) {
      expect(data[i]).toBe(255);
    }
  });
});
