import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { readBarcodes } from "zxing-wasm/reader";
import { deckQr, talkSlugFromRoot } from "./deck";

const SLUG = "charting-unseen-systems";
const URL = `https://zmc.dev/talks/${SLUG}/`;

// the light-scheme literals and the dark brass pair the gate decodes
const LIGHT = { star: "#1a1e29", field: "#e9e3d3" };
const DARK = { star: "#c8a96a", field: "#0b0e14" };

const skin = (svg: string, colors: { star: string; field: string }) =>
  svg
    .replaceAll(`var(--qr-star, ${LIGHT.star})`, colors.star)
    .replaceAll(`var(--qr-field, ${LIGHT.field})`, colors.field);

const decode = async (svg: string, size?: number) => {
  const sized = size
    ? svg.replace(/^<svg /, `<svg width="${size}" height="${size}" `)
    : svg;
  const png = await sharp(Buffer.from(sized)).png().toBuffer();
  return readBarcodes(new Uint8Array(png), { formats: ["QRCode"] });
};

describe("talkSlugFromRoot", () => {
  it("derives the slug from a deck directory, with or without a slash", () => {
    expect(talkSlugFromRoot(`/repo/src/data/talks/${SLUG}`)).toBe(SLUG);
    expect(talkSlugFromRoot(`/repo/src/data/talks/${SLUG}/`)).toBe(SLUG);
  });

  it("returns null for any other root", () => {
    expect(talkSlugFromRoot("/repo/packages/slidev-theme-zmc")).toBeNull();
    expect(talkSlugFromRoot("/repo/src/data/talks")).toBeNull();
    expect(talkSlugFromRoot("/repo")).toBeNull();
  });
});

describe("deckQr", () => {
  it("encodes the canonical talk URL in both forms", async () => {
    const qr = await deckQr(SLUG);
    expect(qr.url).toBe(URL);
    expect(qr.inline).toContain(`fill="var(--qr-star, ${LIGHT.star})"`);
    expect(qr.inline).toContain(`aria-label="Scan to open ${URL}"`);
    expect(qr.standalone).toContain('width="1024" height="1024"');
    expect(qr.standalone).toContain(`<title>Scan to open ${URL}</title>`);
    expect(qr.standalone).toContain(`fill="${LIGHT.star}"`);
  });

  it("the inline form round-trips in every schema the theme serves", async () => {
    const { inline } = await deckQr(SLUG);
    const m = /viewBox="0 0 (\d+)/.exec(inline);
    const small = Number(m?.[1]) * 7; // the gate's 7px/module floor
    for (const colors of [LIGHT, DARK, { star: LIGHT.field, field: LIGHT.star }]) {
      for (const size of [1024, small]) {
        const results = await decode(skin(inline, colors), size);
        expect(results).toHaveLength(1);
        expect(results[0].text).toBe(URL);
        expect(results[0].ecLevel).toBe("H");
      }
    }
  });

  it("the standalone document decodes as written", async () => {
    const { standalone } = await deckQr(SLUG);
    const results = await decode(standalone);
    expect(results).toHaveLength(1);
    expect(results[0].text).toBe(URL);
    expect(results[0].ecLevel).toBe("H");
  });
});
