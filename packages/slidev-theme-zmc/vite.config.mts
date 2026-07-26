// Serves the deck's QR beacon as `virtual:zmc-qr`. Slidev merges a
// vite.config from every root — this theme included — and sets the final
// Vite root to the deck's own directory, so the talk slug is derivable
// with no plumbing: a root of src/data/talks/<slug> is a talk, anything
// else (the theme's example.md, an ad-hoc deck) gets nulls and no beacon.
//
// Repo-local coupling, on purpose: the theme is a private workspace
// package living inside zmc.dev, and the import below reaches into the
// site's QR library. Its bare deps (qrcode, satori) resolve from the
// repo-root node_modules at load time.

const VIRTUAL_ID = "virtual:zmc-qr";
const RESOLVED_ID = `\0${VIRTUAL_ID}`;

let root = "";

export default {
  plugins: [
    {
      name: "slidev-theme-zmc:qr",
      configResolved(config: { root: string }) {
        root = config.root;
      },
      resolveId(id: string) {
        return id === VIRTUAL_ID ? RESOLVED_ID : undefined;
      },
      async load(id: string) {
        if (id !== RESOLVED_ID) return;
        const { deckQr, talkSlugFromRoot } = await import(
          "../../src/lib/qr/deck"
        );
        const slug = talkSlugFromRoot(root);
        if (!slug) return "export const url = null;\nexport const svg = null;";
        const { url, inline } = await deckQr(slug);
        return [
          `export const url = ${JSON.stringify(url)};`,
          `export const svg = ${JSON.stringify(inline)};`,
        ].join("\n");
      },
    },
  ],
};
