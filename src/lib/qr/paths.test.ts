import { describe, expect, it } from "vitest";
import { assertNoQrSlug, canonicalUrlFor, qrHrefFor } from "./paths";

describe("qrHrefFor", () => {
  it("nests the QR page under the current page, both slash forms", () => {
    expect(qrHrefFor("/")).toBe("/qr/");
    expect(qrHrefFor("/posts")).toBe("/posts/qr/");
    expect(qrHrefFor("/posts/")).toBe("/posts/qr/");
    expect(qrHrefFor("/posts/some-slug")).toBe("/posts/some-slug/qr/");
    expect(qrHrefFor("/posts/by-tag/go/")).toBe("/posts/by-tag/go/qr/");
    expect(qrHrefFor("/resume")).toBe("/resume/qr/");
  });

  it("offers nothing on the 404 page — no canonical URL to encode", () => {
    expect(qrHrefFor("/404")).toBeNull();
    expect(qrHrefFor("/404/")).toBeNull();
    expect(qrHrefFor("/404.html")).toBeNull();
  });

  it("a tag literally named qr still gets its QR page", () => {
    // /posts/by-tag/qr/ is the tag page, /posts/by-tag/qr/qr/ its QR page —
    // no route conflict, unlike a post slugged qr. QR pages themselves
    // suppress the link by prop, not path shape, for exactly this reason.
    expect(qrHrefFor("/posts/by-tag/qr/")).toBe("/posts/by-tag/qr/qr/");
  });
});

describe("canonicalUrlFor", () => {
  it("emits the trailing-slash absolute form the built og:url carries", () => {
    expect(canonicalUrlFor("/")).toBe("https://zmc.dev/");
    expect(canonicalUrlFor("/posts/some-slug")).toBe(
      "https://zmc.dev/posts/some-slug/",
    );
    expect(canonicalUrlFor("/posts/some-slug/")).toBe(
      "https://zmc.dev/posts/some-slug/",
    );
  });
});

describe("assertNoQrSlug", () => {
  it("lets ordinary slugs pass", () => {
    expect(() => assertNoQrSlug(["a", "b-c"], "blog")).not.toThrow();
  });

  it("fails the build on a qr slug", () => {
    expect(() => assertNoQrSlug(["a", "qr"], "blog")).toThrow(/collide/);
  });
});
