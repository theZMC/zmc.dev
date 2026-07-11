import { cutLabelGaps, generateGraticule, updateOrbits } from "./orrery";
import { applyStoredTheme, toggleTheme } from "./theme";

const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
const DIAL_CIRC = 2 * Math.PI * 9; // progress dial circumference

let ticking = false;

function updateScrollState(): void {
  const y = window.scrollY;
  const nav = document.querySelector("nav");
  const dock = nav ? nav.getBoundingClientRect().bottom : 70;

  // The orrery's centre rides the page's hero anchor (when one exists) until
  // it docks on the nav's bottom border. This mirrors ordinary document
  // scrolling — not added motion — so it stays live under reduced motion.
  const orrery = document.querySelector<SVGSVGElement>("svg.orrery");
  if (orrery) {
    const anchor = document.querySelector("[data-orrery-anchor]");
    let target = dock;
    if (anchor) {
      const r = anchor.getBoundingClientRect();
      target = Math.max(dock, r.top + r.height / 2);
    }
    orrery.style.setProperty("--orrery-y", `${target}px`);
  }

  // The descend cue fades once the user complies: opaque until it climbs to
  // the viewport's midline, gone before it slips under the docked nav. It is
  // a link, so it also stops being clickable once invisible.
  const cue = document.querySelector<HTMLElement>(".scroll-cue");
  if (cue) {
    const r = cue.getBoundingClientRect();
    const fadeStart = window.innerHeight / 2;
    const fadeEnd = dock + 48;
    const t = (r.top + r.height / 2 - fadeEnd) / Math.max(1, fadeStart - fadeEnd);
    const opacity = Math.min(1, Math.max(0, t));
    cue.style.opacity = `${opacity}`;
    cue.style.pointerEvents = opacity === 0 ? "none" : "";
  }

  if (!prefersReduced.matches) {
    updateOrbits(y);
  }

  // reading progress: how far through the article the viewport bottom has
  // traveled. Stays live under reduced motion — information, not decoration.
  const post = document.getElementById("post");
  const arc = document.getElementById("progressArc");
  if (post && arc) {
    const end = post.offsetTop + post.offsetHeight - window.innerHeight;
    const p = Math.min(1, Math.max(0, y / Math.max(1, end)));
    (arc as unknown as SVGCircleElement).style.strokeDashoffset =
      `${DIAL_CIRC * (1 - p)}`;
    const dialBody = document.getElementById("progressBody");
    if (dialBody) {
      const a = p * 2 * Math.PI - Math.PI / 2; // dial svg is pre-rotated -90°
      dialBody.setAttribute("cx", `${11 + 9 * Math.cos(a + Math.PI / 2)}`);
      dialBody.setAttribute("cy", `${11 + 9 * Math.sin(a + Math.PI / 2)}`);
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

document.addEventListener("pointermove", (e) => {
  // Shimmer surfaces nest (rows inside panels): feed the cursor position to
  // every enclosing surface so both rings track it.
  let surface: Element | null | undefined = (
    e.target as Element | null
  )?.closest(".panel, .glint-row");
  while (surface instanceof HTMLElement) {
    const r = surface.getBoundingClientRect();
    surface.style.setProperty("--mx", `${e.clientX - r.left}px`);
    surface.style.setProperty("--my", `${e.clientY - r.top}px`);
    surface = surface.parentElement?.closest(".panel, .glint-row");
  }
});

window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", onScroll, { passive: true });

/* Per-page-view init: fires on first load and on every client-side nav. */
document.addEventListener("astro:page-load", () => {
  applyStoredTheme();

  const svg = document.querySelector<SVGSVGElement>("svg.orrery");
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
  document
    .querySelectorAll<HTMLPreElement>(".post-body pre")
    .forEach((pre) => {
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
    });

  updateScrollState();
});
