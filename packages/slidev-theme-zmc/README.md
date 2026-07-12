# slidev-theme-zmc

A [Slidev](https://sli.dev) theme in the zmc.dev design language: brass
instruments and celestial charts on midnight glass. Built for presenting code
— the syntax palette is the site's own Shiki theme, so code on slides and
code in posts speak the same language.

## Use

This package is a pnpm workspace member of the zmc.dev repo and is not
published. From a deck in this workspace:

```yaml
---
theme: zmc
---
```

To preview the theme itself:

```sh
pnpm --filter slidev-theme-zmc dev
```

To export the demo deck (writes `./example-export.pdf`; pass
`--output <path>` directly to `slidev export` to change it):

```sh
pnpm --filter slidev-theme-zmc export
```

## Color schema

Supports dark (default in spirit — Slidev follows the system, toggle with
`d`) and light (parchment, projector-friendly). Tokens are lifted verbatim
from the site's `global.css`; the Shiki themes are imported from
`src/lib/shiki/zmc-themes.mjs` so they can never drift.

## Layouts

Note: `heading` and `author`, not `title` and `presenter` — those two are
Slidev-reserved config keys and never reach layouts. `title` still belongs on
`section` slides, where it names the chapter for the footer and the TOC.

| Layout | Purpose | Frontmatter |
| --- | --- | --- |
| `cover` | Title plate, bold orrery | `event`, `author`, `date`, `coord` |
| `section` | Chapter divider, auto-numbered TABVLA · I, II… | `title` (feeds the footer), `plate` (override numeral), `coord` |
| `end` | Closing plate | `author`, `coord` |
| `default` | Title + prose in a frosted panel (first `#` becomes the panel head) | — |
| `two-cols` | Split panel; `::right::` for the second column | `heading` |
| `statement` | One big centered claim; `**bold**` turns brass | — |
| `quote` | Cormorant italic pull-quote | `author` |
| `fact` | Big brass number + caption | `caption` |
| `code` | One full-width code stage | `heading` |
| `code-right` | Prose left, code right via `::code::` | `heading` |
| `code-left` | Code left via `::code::`, prose right | `heading` |
| `compare` | Two labeled panes via `::left::` / `::right::` | `heading`, `leftLabel`, `rightLabel` (default ANTE/POST) |
| `terminal` | Console frame; inner fences shed their own chrome | `heading` (default CONSOLE) |
| `image-right` / `image-left` | Image beside prose | `image`, `caption`, `heading` |
| `full` | Bare canvas, no footer | — |

## Furniture

Content slides carry a coordinate strip: deck title, current section (from
the most recent `section` slide's `title`), and the slide count as an orbit
that completes — the site's progress dial. Cover, section, end, and full
slides stay bare.

## Code blocks

Fenced blocks wear the site's code-frame: glass background, hairline border,
and a brass language chip in the head strip. Line ranges
(<code>```ts {2,5-7}</code>) highlight in brass; magic-move and Monaco get
the same frame.
