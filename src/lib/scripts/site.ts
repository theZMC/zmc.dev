import {
  cacheOrbitRefs,
  cutLabelGaps,
  generateGraticule,
  orreryTargetY,
  updateOrbits,
} from "./orrery";
import { applyStoredTheme, toggleTheme } from "./theme";

const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
const DIAL_CIRC = 2 * Math.PI * 9; // progress dial circumference
// Docked orrery position for the frame before <nav> exists (never in
// practice — every page renders one). Keep in sync with --nav-h in global.css.
const NAV_H_FALLBACK = 70;

let ticking = false;

/* Per-page-view element refs, captured on astro:page-load so the scroll
   handler never re-queries the DOM per frame. Client-side navs swap these
   nodes, so the refs are re-captured rather than bound once. */
let nav: HTMLElement | null = null;
let orrery: SVGSVGElement | null = null;
let orreryAnchor: Element | null = null;
let orreryDock: Element | null = null;
let orreryDockMargin = 0;
let cue: HTMLElement | null = null;
let post: HTMLElement | null = null;
let progressArc: HTMLElement | null = null;
let progressBody: HTMLElement | null = null;

function cacheScrollRefs(): void {
  nav = document.querySelector("nav");
  orrery = document.querySelector<SVGSVGElement>("svg.orrery");
  orreryAnchor = document.querySelector("[data-orrery-anchor]");
  orreryDock = document.querySelector("[data-orrery-dock]");
  // scroll-margin-top marks where the dock section settles when anchored;
  // a fixed length in the stylesheet, so read it once per page view.
  orreryDockMargin = orreryDock
    ? parseFloat(getComputedStyle(orreryDock).scrollMarginTop) || 0
    : 0;
  cue = document.querySelector<HTMLElement>(".scroll-cue");
  post = document.getElementById("post");
  progressArc = document.getElementById("progressArc");
  progressBody = document.getElementById("progressBody");
}

/* Every write in here is a raw target: the wheel-step glide that used to
   run through an eased virtual scroll now lives in the sky transitions in
   global.css, which retarget on each write and keep easing on the
   compositor. Informational surfaces (cue fade, reading progress) carry no
   transition and stay 1:1 with the document. */
function updateScrollState(): void {
  const y = window.scrollY;

  /* All layout reads happen up front, before the first style write, so the
     frame never forces a reflow against its own mutations. */
  const dock = nav ? nav.getBoundingClientRect().bottom : NAV_H_FALLBACK;
  const anchorRect = orreryAnchor?.getBoundingClientRect();
  const dockRect = orreryDock?.getBoundingClientRect();
  const cueRect = cue ? cue.getBoundingClientRect() : null;
  const viewH = window.innerHeight;
  const postEnd = post ? post.offsetTop + post.offsetHeight - viewH : 0;

  if (orrery) {
    const target = orreryTargetY({
      dock,
      anchorCentre: anchorRect ? anchorRect.top + anchorRect.height / 2 : null,
      y,
      dockTop: dockRect ? dockRect.top : null,
      dockMargin: orreryDockMargin,
      reduced: prefersReduced.matches,
    });
    orrery.style.setProperty("--orrery-y", `${target}px`);
  }

  // The descend cue fades once the user complies: opaque until it climbs to
  // the viewport's midline, gone before it slips under the docked nav. It is
  // a link, so it also stops being clickable once invisible.
  if (cue && cueRect) {
    const fadeStart = viewH / 2;
    const fadeEnd = dock + 48;
    const t =
      (cueRect.top + cueRect.height / 2 - fadeEnd) /
      Math.max(1, fadeStart - fadeEnd);
    const opacity = Math.min(1, Math.max(0, t));
    cue.style.opacity = `${opacity}`;
    cue.style.pointerEvents = opacity === 0 ? "none" : "";
  }

  if (!prefersReduced.matches) {
    updateOrbits(y);
  }

  // reading progress: how far through the article the viewport bottom has
  // traveled. Stays live under reduced motion — information, not decoration.
  if (post && progressArc) {
    const p = Math.min(1, Math.max(0, y / Math.max(1, postEnd)));
    (progressArc as unknown as SVGCircleElement).style.strokeDashoffset =
      `${DIAL_CIRC * (1 - p)}`;
    if (progressBody) {
      const a = p * 2 * Math.PI - Math.PI / 2; // dial svg is pre-rotated -90°
      progressBody.setAttribute("cx", `${11 + 9 * Math.cos(a + Math.PI / 2)}`);
      progressBody.setAttribute("cy", `${11 + 9 * Math.sin(a + Math.PI / 2)}`);
    }
  }

  ticking = false;
}

function onScroll(): void {
  if (!ticking) {
    window.requestAnimationFrame(updateScrollState);
    ticking = true;
  }
}

/* One-time module-scope bindings, delegated so they survive Astro
   client-side navigations without rebinding. */
document.addEventListener("click", (e) => {
  const btn = (e.target as Element | null)?.closest("#themeToggle");
  if (btn instanceof HTMLElement) toggleTheme(btn);

  const expand = (e.target as Element | null)?.closest(".expand-code");
  if (expand instanceof HTMLElement) {
    const frame = expand.closest(".code-frame, .diagram-plate");
    if (frame instanceof HTMLElement) {
      const expanded = frame.toggleAttribute("data-expanded");
      expand.textContent = expanded ? "Collapse" : "Expand";
      expand.setAttribute("aria-expanded", String(expanded));
    }
  }

  const copy = (e.target as Element | null)?.closest(".copy-code");
  if (copy instanceof HTMLElement) {
    const code = copy.closest(".code-frame")?.querySelector("code");
    if (code) {
      const done = () => {
        copy.textContent = "Copied ✓";
        setTimeout(() => {
          copy.textContent = "Copy";
        }, 1600);
      };
      // Clipboard API unavailable (permissions/insecure context):
      // select the block so a manual ⌘C still lands the right text.
      const fallback = () => {
        const range = document.createRange();
        range.selectNodeContents(code);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      };
      if (navigator.clipboard) {
        navigator.clipboard.writeText(code.innerText).then(done, fallback);
      } else {
        fallback();
      }
    }
  }
});

/* Shimmer tracking coalesced to one write per frame: high-rate mice fire
   pointermove up to 1000Hz, so stash the latest pointer state and let a
   single rAF apply it. */
let glintPending = false;
let glintTarget: Element | null = null;
let glintX = 0;
let glintY = 0;

// Shimmer surfaces: frosted boxes, hoverable rows, and the nav sigil
// (which clips the glow into its glyphs rather than a border ring).
const GLINT_SURFACES = ".panel, .glint-row, nav .sigil";

function applyGlint(): void {
  glintPending = false;
  // Shimmer surfaces nest (rows inside panels): feed the cursor position to
  // every enclosing surface so both rings track it.
  let surface: Element | null | undefined =
    glintTarget?.closest(GLINT_SURFACES);
  while (surface instanceof HTMLElement) {
    const r = surface.getBoundingClientRect();
    surface.style.setProperty("--mx", `${glintX - r.left}px`);
    surface.style.setProperty("--my", `${glintY - r.top}px`);
    surface = surface.parentElement?.closest(GLINT_SURFACES);
  }
}

document.addEventListener("pointermove", (e) => {
  glintTarget = e.target as Element | null;
  glintX = e.clientX;
  glintY = e.clientY;
  if (!glintPending) {
    window.requestAnimationFrame(applyGlint);
    glintPending = true;
  }
});

/* Cold-cache hardening: fonts.status can read "loaded" before layout has
   requested Cormorant (deferred rendering, background tabs), so the gaps get
   cut against the fallback serif. When a real face lands later, re-cut them —
   cutLabelGaps is idempotent. Module-scope like the bindings above, so it
   never stacks across client-side navs; it re-queries the current svg. */
document.fonts.addEventListener("loadingdone", () => {
  const svg = document.querySelector<SVGSVGElement>("svg.orrery");
  if (svg) cutLabelGaps(svg);
});

window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", onScroll, { passive: true });

/* Per-page-view init: fires on first load and on every client-side nav. */
document.addEventListener("astro:page-load", () => {
  applyStoredTheme();
  cacheScrollRefs();
  cacheOrbitRefs();

  const svg = orrery;
  if (svg) {
    generateGraticule(svg);
    // Gaps must fit the rendered lettering, so wait for fonts on first load;
    // on client-side navs the fonts are already loaded — run immediately.
    const run = () => cutLabelGaps(svg);
    if (document.fonts.status === "loaded") {
      run();
    } else {
      document.fonts.ready.then(run);
    }
  }

  // Frost pane in every panel (idempotent per page view): WebKit silently
  // drops backdrop-filter once a layer passes ~24.5k px (1.5× its 16384px
  // texture cap), and a long transmission's panel sails past it. The pane
  // is a sticky, viewport-height child that carries the blur instead, so
  // the filtered texture never exceeds one viewport however tall the panel
  // grows. CSS turns the panel's own backdrop-filter off via :has() —
  // without JS the panel keeps it, so the no-JS glass still works
  // everywhere but the longest posts.
  document.querySelectorAll<HTMLElement>(".panel").forEach((panel) => {
    if (panel.querySelector(":scope > .panel-frost")) return;
    const frost = document.createElement("div");
    frost.className = "panel-frost";
    frost.setAttribute("aria-hidden", "true");
    frost.append(document.createElement("div"));
    panel.prepend(frost);
  });

  // Header strip on article code blocks and tables (idempotent per page
  // view): kind hint left, action buttons right. Each block gets a
  // .code-frame wrapper with the header as a sibling, not a child — inside
  // the block its labels concatenate into the content's accessible text.
  // `block` is both the element framed and the horizontal scroll container
  // the fade/expand affordances watch.
  const expandButton = (expandLabel: string) => {
    const expand = document.createElement("button");
    expand.className = "expand-code mono";
    expand.type = "button";
    expand.textContent = "Expand";
    expand.setAttribute("aria-expanded", "false");
    expand.setAttribute("aria-label", expandLabel);
    return expand;
  };

  const frameBlock = (
    block: HTMLElement,
    opts: {
      label: string;
      expandLabel: string;
      modifier?: string;
      actions?: HTMLElement[];
    },
  ) => {
    const frame = document.createElement("div");
    frame.className = opts.modifier
      ? `code-frame ${opts.modifier}`
      : "code-frame";
    const head = document.createElement("div");
    head.className = "code-head";
    const lang = document.createElement("span");
    lang.className = "code-lang mono";
    lang.textContent = opts.label;
    const actions = document.createElement("div");
    actions.className = "code-actions";
    actions.append(expandButton(opts.expandLabel), ...(opts.actions ?? []));
    head.append(lang, actions);
    block.replaceWith(frame);
    frame.append(head, block);
    // data-clipped drives the right-edge fade: on while content continues
    // past the clip edge, off once scrolled to the end. data-overflowing
    // reveals the expand button: on while the block clips at all, wherever
    // it's scrolled. ResizeObserver fires on observe, so the initial state
    // needs no separate call — and it re-fires on expand/collapse, keeping
    // the attributes honest at the new width.
    const updateFrameState = () => {
      frame.toggleAttribute(
        "data-clipped",
        block.scrollWidth - block.clientWidth - block.scrollLeft > 1,
      );
      // mirror fade: content also continues past the left clip edge
      frame.toggleAttribute("data-clipped-start", block.scrollLeft > 1);
      frame.toggleAttribute(
        "data-overflowing",
        block.scrollWidth > block.clientWidth,
      );
      // One-way: the first time a block overflows, lock its height at the
      // scrollbar-bearing measurement. Safari never paints an empty track
      // (overflow-x: scroll or not), so when an expand lets every line
      // fit, the bar's exit would otherwise shrink the block and shift
      // the prose below it. The lock holds the box; the glass fills where
      // the bar sat. Measured, not assumed — scrollbar heights differ per
      // engine (8px Chrome, 13px Safari).
      if (
        block.scrollWidth > block.clientWidth &&
        !frame.hasAttribute("data-expandable")
      ) {
        frame.setAttribute("data-expandable", "");
        block.style.minHeight = `${block.offsetHeight}px`;
      }
    };
    block.addEventListener("scroll", updateFrameState, { passive: true });
    new ResizeObserver(updateFrameState).observe(block);
    // The observer watches the block's box, which the mono font swapping
    // in doesn't resize — line widths change though, so re-measure once
    // loaded.
    document.fonts.ready.then(updateFrameState);
  };

  document.querySelectorAll<HTMLPreElement>(".post-body pre").forEach((pre) => {
    if (pre.parentElement?.classList.contains("code-frame")) return;
    const copy = document.createElement("button");
    copy.className = "copy-code mono";
    copy.type = "button";
    copy.textContent = "Copy";
    copy.setAttribute("aria-label", "Copy code to clipboard");
    // Shiki stamps data-language on the pre; "plaintext" is its unlabeled
    // fallback, not worth announcing.
    const langId = pre.dataset.language;
    frameBlock(pre, {
      label: langId && langId !== "plaintext" ? langId : "",
      expandLabel: "Expand code block to the panel width",
      actions: [copy],
    });
  });

  // Tables ride the same frame via a .table-scroll wrapper as the scroll
  // container — a table element can't clip-and-scroll itself without
  // giving up table layout (and with it, full-width row rules).
  document
    .querySelectorAll<HTMLTableElement>(".post-body table")
    .forEach((table) => {
      if (table.parentElement?.classList.contains("table-scroll")) return;
      const scroll = document.createElement("div");
      scroll.className = "table-scroll";
      table.replaceWith(scroll);
      scroll.append(table);
      frameBlock(scroll, {
        label: "table",
        expandLabel: "Expand table to the panel width",
        modifier: "table-frame",
      });
    });

  // Diagram plates ship their own header (the eyebrow figcaption) and
  // scroll container from the build, so they join the expand system
  // without a second frame: button in the eyebrow, state attributes on
  // the figure. Unlike code, a plate benefits from expanding before it
  // overflows — the svg scales down from its intrinsic width (--w)
  // first and only scrolls at the 75% floor — so below-intrinsic is
  // the signal that expanding buys type size, not just less scrolling.
  document
    .querySelectorAll<HTMLElement>(".post-body .diagram-plate")
    .forEach((plate) => {
      if (plate.querySelector(".expand-code")) return;
      const eyebrow = plate.querySelector<HTMLElement>(".diagram-eyebrow");
      const scroll = plate.querySelector<HTMLElement>(".diagram-scroll");
      const svg = scroll?.querySelector("svg");
      if (!eyebrow || !scroll || !svg) return;
      // The actions are chrome, not caption: a sibling of the figcaption
      // (CSS overlays it on the eyebrow band), so the caption's text —
      // what find-in-page, selection, and extractors read — never
      // contains a button label. Same reasoning as the code-frame's
      // header-as-sibling.
      const actions = document.createElement("div");
      actions.className = "code-actions";
      actions.append(expandButton("Expand diagram to the panel width"));
      eyebrow.after(actions);
      const intrinsic = parseFloat(plate.style.getPropertyValue("--w"));
      const updatePlateState = () => {
        // The clip fade starts below the eyebrow, whose height depends
        // on how the title wraps — measured, not assumed.
        plate.style.setProperty("--plate-head-h", `${eyebrow.offsetHeight}px`);
        plate.toggleAttribute(
          "data-clipped",
          scroll.scrollWidth - scroll.clientWidth - scroll.scrollLeft > 1,
        );
        plate.toggleAttribute("data-clipped-start", scroll.scrollLeft > 1);
        if (
          Number.isFinite(intrinsic) &&
          svg.getBoundingClientRect().width < intrinsic - 16 &&
          !plate.hasAttribute("data-expandable")
        ) {
          plate.setAttribute("data-expandable", "");
        }
      };
      scroll.addEventListener("scroll", updatePlateState, { passive: true });
      const observer = new ResizeObserver(updatePlateState);
      observer.observe(scroll);
      observer.observe(eyebrow);
      document.fonts.ready.then(updatePlateState);
    });

  updateScrollState();
});
