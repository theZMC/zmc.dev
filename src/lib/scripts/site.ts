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
// Time constant for the eased virtual scroll: ~95% settled after 3τ (¼s).
const SMOOTH_TAU = 80;

let ticking = false;

/* Wheel steps land as instant ~100px jumps in scrollY. The scroll-driven
   decoration (orrery position, orbit counter-rotation) chases scrollY through
   this exponentially eased virtual value instead of reading it raw, so wheel
   users get a glide where the document steps. Informational surfaces (cue
   fade, reading progress) and the reduced-motion path stay on the real
   scrollY, 1:1 with the document. */
let smoothY = 0;
let lastFrameAt = 0;

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

function updateScrollState(now?: number): void {
  const y = window.scrollY;

  const dt = now && lastFrameAt ? now - lastFrameAt : 17;
  lastFrameAt = now ?? 0;
  if (prefersReduced.matches || Math.abs(y - smoothY) < 0.5) {
    smoothY = y;
  } else {
    smoothY += (y - smoothY) * (1 - Math.exp(-dt / SMOOTH_TAU));
  }

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
      smoothY,
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
    updateOrbits(smoothY);
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

  // The glide outlives the scroll events that caused it: keep the frame loop
  // alive until the virtual scroll converges (it snaps inside 0.5px above).
  if (smoothY !== y) {
    ticking = true;
    window.requestAnimationFrame(updateScrollState);
  } else {
    ticking = false;
    lastFrameAt = 0;
  }
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
  // A fresh page view starts wherever the browser restored the scroll —
  // snap the virtual scroll there rather than gliding in from the old page.
  smoothY = window.scrollY;

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

  // Copy buttons on article code blocks (idempotent per page view). Each pre
  // gets a .code-frame wrapper with the button as a sibling, not a child —
  // inside the pre its label concatenates into the code's accessible text.
  document.querySelectorAll<HTMLPreElement>(".post-body pre").forEach((pre) => {
    if (pre.parentElement?.classList.contains("code-frame")) return;
    const frame = document.createElement("div");
    frame.className = "code-frame";
    const btn = document.createElement("button");
    btn.className = "copy-code mono";
    btn.type = "button";
    btn.textContent = "Copy";
    btn.setAttribute("aria-label", "Copy code to clipboard");
    pre.replaceWith(frame);
    frame.append(pre, btn);
    // data-clipped drives the right-edge fade: on while content continues
    // past the clip edge, off once scrolled to the end. ResizeObserver fires
    // on observe, so the initial state needs no separate call.
    const updateClipped = () => {
      frame.toggleAttribute(
        "data-clipped",
        pre.scrollWidth - pre.clientWidth - pre.scrollLeft > 1,
      );
    };
    pre.addEventListener("scroll", updateClipped, { passive: true });
    new ResizeObserver(updateClipped).observe(pre);
  });

  updateScrollState();
});
