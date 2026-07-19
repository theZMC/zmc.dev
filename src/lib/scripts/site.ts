import {
  cacheOrbitRefs,
  cutLabelGaps,
  generateGraticule,
  orreryTargetY,
  updateOrbits,
} from "./orrery";
import { applyStoredTheme, toggleTheme } from "./theme";

const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
// The reading dial rides CSS scroll timelines where the platform has them;
// these exist only for the engines that don't (Firefox until ~155), where
// this script summons the back-to-top instead. The threshold mirrors
// --return-range in global.css — keep the two in step.
const dialNeedsJs = !CSS.supports("animation-timeline", "scroll()");
const DIAL_SUMMON_Y = 320;
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
let dialReturn: HTMLElement | null = null;

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
  dialReturn = document.querySelector<HTMLElement>(".dial-return");
}

/* Every write in here is a raw target: the wheel-step glide that used to
   run through an eased virtual scroll now lives in the sky transitions in
   global.css, which retarget on each write and keep easing on the
   compositor. Informational surfaces (the cue fade) carry no transition
   and stay 1:1 with the document; the reading dial is CSS
   scroll-timeline-driven and never passes through here. */
function updateScrollState(): void {
  const y = window.scrollY;

  /* All layout reads happen up front, before the first style write, so the
     frame never forces a reflow against its own mutations. */
  const dock = nav ? nav.getBoundingClientRect().bottom : NAV_H_FALLBACK;
  const anchorRect = orreryAnchor?.getBoundingClientRect();
  const dockRect = orreryDock?.getBoundingClientRect();
  const cueRect = cue ? cue.getBoundingClientRect() : null;
  const viewH = window.innerHeight;

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

  // Back-to-top summon for engines without scroll timelines: their CSS
  // can't watch the scroll, so this one class toggle stands in for the
  // dial-arm/dial-summon animations.
  if (dialNeedsJs && dialReturn) {
    dialReturn.classList.toggle("dial-summoned", y > DIAL_SUMMON_Y);
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

/* Expand/collapse is the checkbox in the frame header — :checked + :has()
   run the whole interaction in CSS, no JS required. This listener is
   polish only: before the first expand, lock the scroller's height at
   the scrollbar-bearing measurement. Safari never paints an empty track
   (overflow-x: scroll or not), so when an expand lets every line fit,
   the bar's exit would otherwise shrink the block and shift the prose
   below it. The lock holds the box; the glass fills where the bar sat.
   Measured, not assumed — scrollbar heights differ per engine (8px
   Chrome, 13px Safari). It reads offsetHeight before the width
   transition moves, so the measurement is the resting one. Plates skip
   it: their svg keeps its aspect ratio, so the box resizes anyway.
   Without JS the lock is absent and an expand may shift the prose by a
   scrollbar height — degradation, not breakage. */
document.addEventListener("change", (e) => {
  const toggle = (e.target as Element | null)?.closest(".expand-toggle");
  if (toggle instanceof HTMLInputElement && toggle.checked) {
    const scroller = toggle
      .closest(".code-frame")
      ?.querySelector<HTMLElement>(":scope > pre, :scope > .table-scroll");
    if (scroller && !scroller.style.minHeight) {
      scroller.style.minHeight = `${scroller.offsetHeight}px`;
    }
  }
});

/* Cross-tab theme sync: a toggle in another tab lands here as a storage
   event. Quiet swap only — the eclipse answers a click at a point, and
   this tab has none; the --swap-dur surface transitions carry it. A
   cleared key (clear-on-match) returns this tab to auto too. */
window.addEventListener("storage", (e) => {
  if (e.key !== "theme") return;
  if (e.newValue === "dark" || e.newValue === "light") {
    document.documentElement.setAttribute("data-theme", e.newValue);
  } else {
    document.documentElement.removeAttribute("data-theme");
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

  updateScrollState();
});
