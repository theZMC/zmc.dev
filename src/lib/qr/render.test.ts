import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { readBarcodes } from "zxing-wasm/reader";
import { qrMatrix } from "./matrix";
import { qrSvg } from "./render";

const URL = "https://zmc.dev/posts/better-dynamodb-testing-with-dockertest/";

// the light-scheme literals the page falls back to and the standalone bakes
const LIGHT = { star: "#1a1e29", field: "#e9e3d3" };

const decode = async (svg: string, size: number) => {
  const sized = svg.replace(/^<svg /, `<svg width="${size}" height="${size}" `);
  const png = await sharp(Buffer.from(sized)).png().toBuffer();
  return readBarcodes(new Uint8Array(png), { formats: ["QRCode"] });
};

describe("qrSvg", () => {
  it("inline form carries the CSS-var skin and an accessible name", () => {
    const svg = qrSvg(
      qrMatrix(URL),
      {
        star: "var(--qr-star, #1a1e29)",
        field: "var(--qr-field, #e9e3d3)",
      },
      { label: URL },
    );
    expect(svg).toContain('fill="var(--qr-star, #1a1e29)"');
    expect(svg).toContain('fill="var(--qr-field, #e9e3d3)"');
    expect(svg).toContain(`aria-label="Scan to open ${URL}"`);
    expect(svg).not.toContain("<title>");
  });

  it("standalone form is a sized, titled document with baked literals", () => {
    const svg = qrSvg(qrMatrix(URL), LIGHT, { standalone: true, label: URL });
    expect(svg).toContain('width="1024" height="1024"');
    expect(svg).toContain(`<title>Scan to open ${URL}</title>`);
    expect(svg).toContain('fill="#1a1e29"');
  });

  it("the star field round-trips: worst-case slug decodes at 1024 and small", async () => {
    const m = qrMatrix(URL);
    const svg = qrSvg(m, LIGHT);
    // 7px/module, the gate's small-render floor
    for (const size of [1024, (m.size + 8) * 7]) {
      const results = await decode(svg, size);
      expect(results).toHaveLength(1);
      expect(results[0].text).toBe(URL);
      expect(results[0].ecLevel).toBe("H");
    }
  });

  it("the inverted form decodes too", async () => {
    const svg = qrSvg(qrMatrix(URL), {
      star: LIGHT.field,
      field: LIGHT.star,
    });
    const results = await decode(svg, 1024);
    expect(results).toHaveLength(1);
    expect(results[0].text).toBe(URL);
  });

  it("the dark-mode form — brass stars on the dark field — decodes", async () => {
    const m = qrMatrix(URL);
    // the dark halves of --brass and --bg, what dark-mode screens show
    const svg = qrSvg(m, { star: "#c8a96a", field: "#0b0e14" });
    for (const size of [1024, (m.size + 8) * 7]) {
      const results = await decode(svg, size);
      expect(results).toHaveLength(1);
      expect(results[0].text).toBe(URL);
    }
  });
});
