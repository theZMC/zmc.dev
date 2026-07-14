# zmc.dev

The source for [zmc.dev](https://zmc.dev) — Zach Callahan's personal site. An
Astro static build with a blog, a resume that ships as both a page and a PDF,
Slidev talk decks, and social cards generated at build time. Deployed to GitHub
Pages.

## Getting started

```sh
pnpm install
pnpm dev          # localhost:4321
```

Playwright's chromium is needed for the build, since Mermaid diagrams render
headlessly. If you have never installed it:

```sh
pnpm exec playwright install --with-deps chromium
```

## Commands

| Command            | Action                                                       |
| :----------------- | :----------------------------------------------------------- |
| `pnpm dev`         | Dev server at `localhost:4321`                                |
| `pnpm build`       | Build the site to `./dist/`                                   |
| `pnpm preview`     | Serve the build locally — the faithful check before deploying |
| `pnpm talk <slug>` | Slidev dev server for one deck (hot reload, presenter mode)   |
| `pnpm test`        | Vitest unit tests                                             |
| `pnpm check:cards` | Assert every built page carries a complete social card        |

## Content

Everything authored lives in `src/data/`, typed by the collections in
`src/content.config.ts`:

| Collection | Location             | Shape                                               |
| :--------- | :------------------- | :-------------------------------------------------- |
| `blog`     | `src/data/blog/*.md` | `title`, `tags`, `date`, `description?`, `published` |
| `projects` | `src/data/projects/` | `name`, `kind`, `url`, `tags`, `order`               |
| `talks`    | `src/data/talks/*/`  | `talk.yaml` beside a `slides.md` deck                |
| `resume`   | `src/data/resume/`   | `resume.yaml`, schema in `src/lib/resume/schema.ts`  |

A post's `published: false` gates it out of listings, tag pages, RSS, and
prev/next nav, but still builds to its `/posts/<slug>/` URL. Post slugs come
from the filename; talk slugs come from the directory name.

`resume.yaml` is the single source of truth for both the `/resume` page and the
PDF.

## How it fits together

`src/lib/` holds the machinery behind the pages:

- **`og/`** — social cards, rendered with Satori and Sharp. Every route has a
  matching endpoint under `src/pages/og/`, and `pnpm check:cards` fails the
  build if any page ships without a complete, resolvable card.
- **`talks/integration.mjs`** — an Astro integration that builds each Slidev
  deck into `public/talks/<slug>/`, which is why there is no `src/pages/talks`.
  It also rewrites Slidev's meta tags from `talk.yaml` and bridges the site's
  theme choice into Slidev's own color-scheme store so the two agree.
- **`resume-pdf/`** — a Harvard-format resume via `@react-pdf/renderer`. React
  and the renderer stay in a lazy chunk that only people who click the download
  button ever fetch.
- **`diagrams/`** — Mermaid fences become theme-aware inline SVG plates at build
  time, via a rehype plugin driving headless chromium.
- **`shiki/`** — custom light/dark code themes, emitting CSS custom properties
  rather than inline colors so the theme can switch without re-highlighting.
- **`styles/global.css`** — design tokens and the `light-dark()` theming, where
  `auto` is a real state rather than a fallback. Fonts are Cormorant, Marcellus,
  Instrument Sans, and Spline Sans Mono.

`packages/slidev-theme-zmc` is a workspace package: the Slidev theme in the same
design language as the site.

## Talks

Author a deck against Slidev's own dev server:

```sh
pnpm talk charting-unseen-systems
```

Deck URLs only resolve in the built site, so use `pnpm build && pnpm preview` to
check one in place.

## Tests

Vitest covers the lib layer, skewing toward the diagram pipeline and the
client-side motion and theming — plus icon rendering and the resume PDF
template. Tests are colocated with what they test, as `src/**/*.test.ts`.

```sh
pnpm test
```

## Deploying

Pushing to `main` triggers `.github/workflows/deploy.yaml`: build, then
`check:cards`, then GitHub Pages. `assetsPrefix` is CI-gated, so local builds
serve the assets they just built and `pnpm preview` is a faithful preview of
production.
