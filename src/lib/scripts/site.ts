import { cutLabelGaps, generateGraticule, updateOrbits } from "./orrery";
import { applyStoredTheme, toggleTheme } from "./theme";

const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
const DIAL_CIRC = 2 * Math.PI * 9; // progress dial circumference

let ticking = false;

function updateScrollState(): void {
  const y = window.scrollY;

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
    const pre = copy.closest("pre");
    const code = pre?.querySelector("code");
    if (code) {
      const done = () => {
        copy.textContent = "Copied ✓";
        setTimeout(() => {
          copy.textContent = "Copy";
        }, 1600);
      };
      navigator.clipboard.writeText(code.innerText).then(done, () => {
        // Clipboard API unavailable (permissions/insecure context):
        // select the block so a manual ⌘C still lands the right text.
        const range = document.createRange();
        range.selectNodeContents(code);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      });
    }
  }
});

document.addEventListener("pointermove", (e) => {
  const panel = (e.target as Element | null)?.closest(".panel");
  if (!(panel instanceof HTMLElement)) return;
  const r = panel.getBoundingClientRect();
  panel.style.setProperty("--mx", `${e.clientX - r.left}px`);
  panel.style.setProperty("--my", `${e.clientY - r.top}px`);
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

  // Copy buttons on article code blocks (idempotent per page view).
  document
    .querySelectorAll<HTMLPreElement>(".post-body pre")
    .forEach((pre) => {
      if (pre.querySelector(".copy-code")) return;
      const btn = document.createElement("button");
      btn.className = "copy-code mono";
      btn.type = "button";
      btn.textContent = "Copy";
      btn.setAttribute("aria-label", "Copy code to clipboard");
      pre.appendChild(btn);
    });

  updateScrollState();
});
