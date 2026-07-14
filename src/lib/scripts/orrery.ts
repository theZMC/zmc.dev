const SVGNS = "http://www.w3.org/2000/svg";

/** Keplerian elements for the comet track (SVG user units). */
export const COMET = {
  a: 235,
  b: 131.15,
  e: 195 / 235,
  mRate: 0.0021,
  tail: 16,
} as const;

/** Scroll pixels per comet orbit: one full mean-anomaly cycle. */
export const COMET_PERIOD = (2 * Math.PI) / COMET.mRate;

/**
 * The comet's offset-path: the same ellipse as the drawn track, but starting
 * at perihelion (460,500) and running in the travel direction, so
 * offset-distance 0% is perihelion and grows with scroll. The arc ends a
 * 0.05-unit hair short of its start (engines reject coincident arc
 * endpoints); Z closes the sliver, making the path a closed loop so
 * offset-distance wraps modulo the circumference.
 */
export const COMET_OFFSET_PATH =
  "M 460 500 A 235 131.15 0 1 1 460.00002 500.05 Z";

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

export interface CometStop {
  /** Timeline fraction through one period (equal mean-anomaly steps). */
  t: number;
  /** Arc-length fraction from perihelion along the travel direction. */
  offset: number;
  /** Anti-sunward tail angle (deg), unwrapped: 180 at perihelion → 540. */
  angle: number;
}

/**
 * Samples one comet period into equal mean-anomaly stops carrying the CSS
 * values the animation layers need: how far along the track (arc-length
 * fraction — offset-distance interpolates by arc length, so equal-M stops
 * reproduce Kepler's speed-up between them) and which way the tail points.
 * Both the build-time keyframes and the runtime writer read this table, so
 * the two layers can never drift apart.
 */
export function cometTable(samples: number): CometStop[] {
  // Cumulative arc length over eccentric anomaly on a dense trapezoid grid;
  // the integrand is smooth, so the error sits far below a viewbox unit.
  const GRID = 4096;
  const h = (2 * Math.PI) / GRID;
  const cum = new Float64Array(GRID + 1);
  let prevF = Math.hypot(COMET.a * Math.sin(0), COMET.b * Math.cos(0));
  for (let i = 1; i <= GRID; i++) {
    const f = Math.hypot(COMET.a * Math.sin(i * h), COMET.b * Math.cos(i * h));
    cum[i] = cum[i - 1] + ((f + prevF) / 2) * h;
    prevF = f;
  }
  const total = cum[GRID];
  const arcAt = (E: number): number => {
    const u = E / h;
    const i = Math.min(GRID - 1, Math.floor(u));
    return cum[i] + (cum[i + 1] - cum[i]) * (u - i);
  };

  const stops: CometStop[] = [];
  let prevAngle = 180;
  for (let k = 0; k <= samples; k++) {
    const M = (2 * Math.PI * k) / samples;
    let E = M;
    for (let i = 0; i < 6; i++) {
      E -= (E - COMET.e * Math.sin(E) - M) / (1 - COMET.e * Math.cos(E));
    }
    // page-coordinate vector from the sun (500,500) to the comet
    const sx = COMET.e * COMET.a - COMET.a * Math.cos(E);
    const sy = -COMET.b * Math.sin(E);
    let angle = (Math.atan2(sy, sx) * 180) / Math.PI;
    // In page coords the position angle rises monotonically (one revolution
    // per period); atan2 drops 360 crossing the −x axis — unwrap it back up.
    // (Also lifts the −0-tainted atan2 at perihelion onto +180.)
    while (angle < prevAngle - 1e-9) angle += 360;
    prevAngle = angle;
    stops.push({ t: k / samples, offset: arcAt(E) / total, angle });
  }
  return stops;
}

/** The shared 48-stop table both animation layers read. */
export const COMET_STOPS = cometTable(48);

/**
 * Emits the no-JS comet keyframes: one block moving #comet along its
 * offset-path, one rotating #cometTail anti-sunward. Stops sit at equal
 * mean anomaly, so scroll progress plays the Kepler timing. Injected at
 * build time by Cosmos.astro.
 */
export function cometKeyframesCSS(stops: CometStop[]): string {
  const pct = (v: number) => `${(v * 100).toFixed(4)}%`;
  const track = stops
    .map((s) => `${pct(s.t)}{offset-distance:${pct(s.offset)}}`)
    .join("");
  const tail = stops
    .map((s) => `${pct(s.t)}{rotate:${s.angle.toFixed(3)}deg}`)
    .join("");
  return `@keyframes cometa-track{${track}}@keyframes cometa-tail{${tail}}`;
}

/**
 * The comet's CSS values for a scroll position. offset-distance grows
 * without wrapping (the closed offset-path wraps modulo its length, and a
 * wrapped write would transition backwards through the seam); the tail
 * angle stays continuous across periods for the same reason.
 */
export function cometScrollValues(scrollY: number): {
  offset: number;
  angle: number;
} {
  const periods = Math.floor(scrollY / COMET_PERIOD);
  const frac = scrollY / COMET_PERIOD - periods;
  const u = frac * (COMET_STOPS.length - 1);
  const i = Math.min(COMET_STOPS.length - 2, Math.floor(u));
  const w = u - i;
  const s0 = COMET_STOPS[i];
  const s1 = COMET_STOPS[i + 1];
  return {
    offset: (periods + s0.offset + (s1.offset - s0.offset) * w) * 100,
    angle: s0.angle + (s1.angle - s0.angle) * w + periods * 360,
  };
}

/** One scroll frame's geometry, as measured by the site scroll handler. */
export interface OrreryFrame {
  /** Nav bottom border (viewport px) — the docked/final position. */
  dock: number;
  /** Hero anchor centre (viewport px), or null when the page has none. */
  anchorCentre: number | null;
  /** Real scrollY — lifts viewport rects into document coords. */
  y: number;
  /** [data-orrery-dock] section top (viewport px), or null when absent. */
  dockTop: number | null;
  /** That section's scroll-margin-top. */
  dockMargin: number;
  /** prefers-reduced-motion. */
  reduced: boolean;
}

/**
 * The orrery's centre (viewport px) for a scroll frame. It starts on the
 * page's hero anchor (when one exists) and climbs to dock on the nav's
 * bottom border. With a dock section present, it parallaxes: docking
 * completes exactly as that section reaches its scroll-margin anchor point,
 * so the orrery climbs slower than the hero. Parallax is added motion, so
 * reduced motion falls back to riding the anchor 1:1 — that mirrors
 * ordinary document scrolling. The wheel-step glide is no longer computed
 * here: raw targets ease through the transform transition in global.css.
 */
export function orreryTargetY(f: OrreryFrame): number {
  if (f.anchorCentre === null) return f.dock;
  const dockScroll = f.dockTop !== null ? f.dockTop + f.y - f.dockMargin : 0;
  if (f.reduced || dockScroll <= 0) return Math.max(f.dock, f.anchorCentre);
  /* Rects are viewport-relative and move with the real scroll, so lift the
     geometry into document coords (scroll-invariant) before interpolating. */
  const anchorDoc = f.anchorCentre + f.y;
  const p = Math.min(1, Math.max(0, f.y / dockScroll));
  return Math.max(f.dock, anchorDoc + p * (f.dock - anchorDoc));
}

/* Orbit refs and their inline --rate values, captured once per page view —
   updateOrbits runs every scroll frame and must not re-query or re-parse.
   Module-scope lets, DOM touched only inside functions (node-import safe). */
let orbitGroups: { el: SVGGElement; rate: number }[] = [];
let moonOrbits: { el: SVGGElement; rate: number }[] = [];
let comet: SVGGElement | null = null;
let cometTail: SVGLineElement | null = null;

/**
 * Captures the orbit elements and their scroll-invariant inline --rate
 * values (the same custom property the no-JS animation layer reads).
 * Runs on every astro:page-load: client-side navs swap the svg wholesale,
 * so the previous page's refs would otherwise animate detached nodes.
 */
export function cacheOrbitRefs(): void {
  const rated = (el: SVGGElement) => ({
    el,
    rate: parseFloat(el.style.getPropertyValue("--rate")) || 0,
  });
  orbitGroups = [
    ...document.querySelectorAll<SVGGElement>(".orbit-group"),
  ].map(rated);
  moonOrbits = [...document.querySelectorAll<SVGGElement>(".moon-orbit")].map(
    rated,
  );
  comet = document.querySelector<SVGGElement>("#comet");
  cometTail = document.querySelector<SVGLineElement>("#cometTail");
}

/**
 * Applies scroll-driven motion by writing raw CSS targets: individual
 * rotate on the orbit and moon groups (moons pivot on their inline
 * transform-origin), the comet's path offset, and its tail angle. The glide
 * lives in CSS — the per-property transitions in global.css retarget on
 * every write, which under a stream of writes behaves as an exponential
 * chase. Pure writes against the refs captured by cacheOrbitRefs.
 */
export function updateOrbits(scrollY: number): void {
  for (const { el, rate } of orbitGroups) {
    el.style.rotate = `${scrollY * rate}deg`;
  }
  for (const { el, rate } of moonOrbits) {
    el.style.rotate = `${scrollY * rate}deg`;
  }

  if (!comet || !cometTail) return;
  const { offset, angle } = cometScrollValues(scrollY);
  comet.style.setProperty("offset-distance", `${offset}%`);
  cometTail.style.rotate = `${angle}deg`;
}
