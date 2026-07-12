import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { faviconSvg, renderAppleTouchIcon, renderFaviconPng } from "./render";

describe("favicon", () => {
  it("carries both theme brasses: dark by default, light behind the media query", () => {
    const svg = faviconSvg();
    expect(svg).toContain('fill="#c8a96a"');
    expect(svg).toMatch(/@media \(prefers-color-scheme: light\).*#8f6f35/s);
  });

  it("rasterizes at the requested size", async () => {
    const meta = await sharp(await renderFaviconPng(512)).metadata();
    expect([meta.width, meta.height]).toEqual([512, 512]);
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
