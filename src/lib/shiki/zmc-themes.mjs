/**
 * Shiki themes drawn from the site's own palette (global.css tokens), so
 * code blocks speak the same language as the chart: brass for structure
 * (keywords), celestial blue for the quoted sky (strings), parchment for
 * instruments (functions), and ink for everything that is simply prose.
 * Registered in astro.config.mjs with defaultColor: false — only the
 * --shiki-dark/--shiki-light custom props are emitted.
 */

/** Builds one theme from a palette; both themes share the same scope map. */
function chart(name, type, c) {
  return {
    name,
    type,
    colors: {
      "editor.background": c.bg,
      "editor.foreground": c.ink,
    },
    tokenColors: [
      { settings: { foreground: c.ink } },
      {
        scope: ["comment", "punctuation.definition.comment"],
        settings: { foreground: c.comment, fontStyle: "italic" },
      },
      {
        scope: ["punctuation", "meta.brace", "keyword.operator"],
        settings: { foreground: c.dim },
      },
      {
        scope: [
          "keyword",
          "storage.type",
          "storage.modifier",
          "keyword.function",
          "constant.language.import-export-all",
        ],
        settings: { foreground: c.brass },
      },
      {
        scope: [
          "string",
          "punctuation.definition.string",
          "string.quoted",
          "string.template",
        ],
        settings: { foreground: c.celest },
      },
      {
        scope: [
          "constant.character.escape",
          "string.regexp",
          "punctuation.definition.template-expression",
        ],
        settings: { foreground: c.celestBright },
      },
      {
        scope: [
          "constant.numeric",
          "constant.language",
          "constant.other",
          "support.constant",
          "variable.other.constant",
        ],
        settings: { foreground: c.brassPale },
      },
      {
        scope: [
          "entity.name.function",
          "support.function",
          "meta.function-call entity.name.function",
        ],
        settings: { foreground: c.parchment },
      },
      {
        scope: [
          "entity.name.type",
          "entity.name.class",
          "entity.name.namespace",
          "entity.other.inherited-class",
          "support.type",
          "support.class",
          "entity.name.tag",
        ],
        settings: { foreground: c.celestBright },
      },
      {
        scope: ["entity.other.attribute-name"],
        settings: { foreground: c.celestBright, fontStyle: "italic" },
      },
      {
        scope: ["variable", "variable.other", "variable.parameter"],
        settings: { foreground: c.ink },
      },
      {
        scope: ["punctuation.definition.variable"],
        settings: { foreground: c.dim },
      },
      // markdown-in-markdown niceties
      {
        scope: ["markup.heading", "markup.bold"],
        settings: { foreground: c.brass, fontStyle: "bold" },
      },
      { scope: ["markup.italic"], settings: { fontStyle: "italic" } },
      {
        scope: ["markup.underline.link", "string.other.link"],
        settings: { foreground: c.celest },
      },
      { scope: ["markup.inserted"], settings: { foreground: c.inserted } },
      { scope: ["markup.deleted", "invalid"], settings: { foreground: c.deleted } },
    ],
  };
}

export const zmcDark = chart("zmc-dark", "dark", {
  bg: "#0b0e14",
  ink: "#e8e4d8",
  dim: "#9ba0a8",
  comment: "#7d828b",
  brass: "#c8a96a",
  brassPale: "#d4b483",
  parchment: "#e0cfa6",
  celest: "#7a93b8",
  celestBright: "#a9bdd9",
  inserted: "#8fae8b",
  deleted: "#c98a7d",
});

export const zmcLight = chart("zmc-light", "light", {
  bg: "#f2eddf",
  ink: "#1a1e29",
  dim: "#5b5f68",
  comment: "#666a72",
  brass: "#8f6f35",
  brassPale: "#7c6128",
  parchment: "#6d5526",
  celest: "#4e6685",
  celestBright: "#39506f",
  inserted: "#4a6b46",
  deleted: "#94503f",
});
