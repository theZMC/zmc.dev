const SVGNS = "http://www.w3.org/2000/svg";

/** Keplerian elements for the comet track (SVG user units). */
export const COMET = {
  a: 235,
  b: 131.15,
  e: 195 / 235,
  mRate: 0.0021,
  tail: 16,
} as const;

/**
 * Generates the degree ring (ticks every 5°, taller every 15°, brass majors
 * every 30° with NN° labels at r=481) and the 30° radial graticule rays.
 * Idempotent: clears both groups before appending, so it is safe to re-run
 * on every astro:page-load.
 */
export function generateGraticule(svg: SVGSVGElement): void {
  const degreeRing = svg.querySelector<SVGGElement>("#degreeRing");
  const graticule = svg.querySelector<SVGGElement>("#graticule");
  if (!degreeRing || !graticule) return;

  degreeRing.replaceChildren();
  graticule.replaceChildren();

  for (let a = 0; a < 360; a += 5) {
    const rad = ((a - 90) * Math.PI) / 180;
    const cos = Math.cos(rad),
      sin = Math.sin(rad);
    const major = a % 30 === 0,
      mid = a % 15 === 0;
    const r1 = 456;
    const r2 = major ? 468 : mid ? 464 : 461;

    const tick = document.createElementNS(SVGNS, "line");
    tick.setAttribute("x1", `${500 + r1 * cos}`);
    tick.setAttribute("y1", `${500 + r1 * sin}`);
    tick.setAttribute("x2", `${500 + r2 * cos}`);
    tick.setAttribute("y2", `${500 + r2 * sin}`);
    tick.setAttribute("stroke", major ? "var(--tick)" : "var(--orb-outer)");
    tick.setAttribute("stroke-width", major ? ".8" : ".55");
    degreeRing.appendChild(tick);

    if (major) {
      const label = document.createElementNS(SVGNS, "text");
      label.setAttribute("class", "deg-label");
      label.setAttribute("x", `${500 + 481 * cos}`);
      label.setAttribute("y", `${500 + 481 * sin}`);
      label.textContent = a + "°";
      degreeRing.appendChild(label);

      const ray = document.createElementNS(SVGNS, "line");
      ray.setAttribute("x1", `${500 + 60 * cos}`);
      ray.setAttribute("y1", `${500 + 60 * sin}`);
      ray.setAttribute("x2", `${500 + 456 * cos}`);
      ray.setAttribute("y2", `${500 + 456 * sin}`);
      graticule.appendChild(ray);
    }
  }
}

/**
 * WebKit's getComputedTextLength() ignores CSS letter-spacing while the
 * text-on-path layout applies it, so gaps sized from the measurement come up
 * one tracking-width short per character. Detect the deficit once by
 * measuring a probe string with and without letter-spacing; returns 1 when
 * the engine under-measures (compensate), 0 when it measures faithfully.
 */
let trackingDeficit: number | null = null;
function measureTrackingDeficit(svg: SVGSVGElement): number {
  const probe = document.createElementNS("http://www.w3.org/2000/svg", "text");
  probe.setAttribute(
    "style",
    "font-family: monospace; font-size: 10px; letter-spacing: 0px",
  );
  probe.textContent = "MM";
  svg.appendChild(probe);
  const plain = probe.getComputedTextLength();
  probe.style.letterSpacing = "10px";
  const tracked = probe.getComputedTextLength();
  probe.remove();
  return tracked - plain >= 5 ? 0 : 1;
}

/**
 * Inset labels: gap each ring exactly where its text sits.
 * Ring paths share geometry (and therefore arc-length parameterization) with
 * their label paths, so a label at startOffset s% occupies the ring's arc
 * [s·C, s·C + textLength]. A two-value dasharray plus a dashoffset places
 * one gap of that size at that exact position. Runs after fonts load, since
 * the gap must fit the rendered lettering.
 */
export function cutLabelGaps(svg: SVGSVGElement): void {
  const deficit = (trackingDeficit ??= measureTrackingDeficit(svg));
  svg.querySelectorAll<SVGTextElement>("text.orbit-label").forEach((label) => {
    const group = label.closest("g");
    const ring = group && group.querySelector<SVGPathElement>(".gap-ring");
    const tp = label.querySelector("textPath");
    if (!ring || !tp) return;

    const C = ring.getTotalLength();
    const tracking = parseFloat(getComputedStyle(label).letterSpacing) || 0;
    const L =
      label.getComputedTextLength() +
      deficit * label.getNumberOfChars() * tracking;
    const pad = parseFloat(ring.dataset.labelPad || "5");
    const s = (parseFloat(tp.getAttribute("startOffset") || "0") / 100) * C;

    const gapLen = Math.min(L + pad * 2, C * 0.9);
    const drawLen = C - gapLen;
    const gapStart = (s - pad + C) % C;

    ring.setAttribute("stroke-dasharray", `${drawLen} ${gapLen}`);
    // pattern position at path point p is (p + offset) mod C; the gap region
    // of the pattern is [drawLen, C), so offset places it at gapStart
    ring.setAttribute(
      "stroke-dashoffset",
      `${(drawLen - (gapStart % C) + C) % C}`,
    );
  });
}

export interface CometPosition {
  x: number;
  y: number;
  tailX: number;
  tailY: number;
}

/**
 * Solves Kepler's equation (M = E − e·sinE) for the comet's position in the
 * track wrapper's local coordinates. The sun sits at the focus (500, 500);
 * perihelion points toward −X of the track frame. The tail always points
 * anti-sunward.
 */
export function cometPosition(scrollY: number): CometPosition {
  // mean anomaly → eccentric anomaly via Newton's method
  const M = (scrollY * COMET.mRate) % (2 * Math.PI);
  let E = M;
  for (let i = 0; i < 6; i++) {
    E -= (E - COMET.e * Math.sin(E) - M) / (1 - COMET.e * Math.cos(E));
  }
  // focus-centered position (perihelion toward -X of the track frame)
  const xf = COMET.a * (Math.cos(E) - COMET.e);
  const yf = COMET.b * Math.sin(E);
  const x = 500 - xf,
    y = 500 - yf;
  // tail points anti-sunward from the current position
  const r = Math.hypot(xf, yf) || 1;
  return {
    x,
    y,
    tailX: x - (xf / r) * COMET.tail,
    tailY: y - (yf / r) * COMET.tail,
  };
}

/** One scroll frame's geometry, as measured by the site scroll handler. */
export interface OrreryFrame {
  /** Nav bottom border (viewport px) — the docked/final position. */
  dock: number;
  /** Hero anchor centre (viewport px), or null when the page has none. */
  anchorCentre: number | null;
  /** Real scrollY. */
  y: number;
  /** Eased virtual scroll chasing y. */
  smoothY: number;
  /** [data-orrery-dock] section top (viewport px), or null when absent. */
  dockTop: number | null;
  /** That section's scroll-margin-top. */
  dockMargin: number;
  /** prefers-reduced-motion. */
  reduced: boolean;
}

/**
 * The orrery's centre (viewport px) for a scroll frame. It starts on the
 * page's hero anchor (when one exists) and eases up to dock on the nav's
 * bottom border. With a dock section present, it parallaxes: docking
 * completes exactly as that section reaches its scroll-margin anchor point,
 * so the orrery climbs slower than the hero. Parallax is added motion, so
 * reduced motion falls back to riding the anchor 1:1 — that mirrors
 * ordinary document scrolling.
 */
export function orreryTargetY(f: OrreryFrame): number {
  if (f.anchorCentre === null) return f.dock;
  if (f.reduced) return Math.max(f.dock, f.anchorCentre);
  /* Rects are viewport-relative and move with the real scroll, so lift the
     geometry into document coords (scroll-invariant) before evaluating it
     at the eased position. */
  const anchorDoc = f.anchorCentre + f.y;
  const dockScroll = f.dockTop !== null ? f.dockTop + f.y - f.dockMargin : 0;
  if (dockScroll > 0) {
    const p = Math.min(1, Math.max(0, f.smoothY / dockScroll));
    return Math.max(f.dock, anchorDoc + p * (f.dock - anchorDoc));
  }
  return Math.max(f.dock, anchorDoc - f.smoothY);
}

/* Orbit refs and their data-* rates, captured once per page view —
   updateOrbits runs every scroll frame and must not re-query or re-parse.
   Module-scope lets, DOM touched only inside functions (node-import safe). */
let orbitGroups: { el: SVGGElement; rate: number }[] = [];
let moonOrbits: { el: SVGGElement; rate: number; cx: string; cy: string }[] =
  [];
let cometBody: HTMLElement | null = null;
let cometTail: HTMLElement | null = null;

/**
 * Captures the orbit elements and their scroll-invariant data-* values.
 * Runs on every astro:page-load: client-side navs swap the svg wholesale,
 * so the previous page's refs would otherwise animate detached nodes.
 */
export function cacheOrbitRefs(): void {
  orbitGroups = [...document.querySelectorAll<SVGGElement>(".orbit-group")].map(
    (el) => ({ el, rate: parseFloat(el.dataset.rate || "0") }),
  );
  moonOrbits = [...document.querySelectorAll<SVGGElement>(".moon-orbit")].map(
    (el) => ({
      el,
      rate: parseFloat(el.dataset.rate || "0"),
      cx: el.dataset.cx ?? "",
      cy: el.dataset.cy ?? "",
    }),
  );
  cometBody = document.getElementById("cometBody");
  cometTail = document.getElementById("cometTail");
}

/**
 * Applies scroll-driven motion: CSS rotations on the orbit groups, attribute
 * transforms on the moon orbits (they pivot on an arbitrary point in the
 * parent's local frame), and the comet's Kepler position + anti-sunward tail.
 * Pure writes against the refs captured by cacheOrbitRefs.
 */
export function updateOrbits(scrollY: number): void {
  for (const { el, rate } of orbitGroups) {
    el.style.transform = `rotate(${scrollY * rate}deg)`;
  }
  for (const { el, rate, cx, cy } of moonOrbits) {
    el.setAttribute("transform", `rotate(${scrollY * rate} ${cx} ${cy})`);
  }

  if (!cometBody || !cometTail) return;
  const { x, y, tailX, tailY } = cometPosition(scrollY);
  cometBody.setAttribute("cx", `${x}`);
  cometBody.setAttribute("cy", `${y}`);
  cometTail.setAttribute("x1", `${x}`);
  cometTail.setAttribute("y1", `${y}`);
  cometTail.setAttribute("x2", `${tailX}`);
  cometTail.setAttribute("y2", `${tailY}`);
}
