<script setup lang="ts">
/**
 * The site's orrery as the layouts' celestial backdrop. `bold` draws the
 * full chart — rings, planets, belt, compass star, labels — for
 * cover/section/end plates, and sets it turning: the site's scroll-driven
 * motion re-geared to a clock, so the plates breathe while they're on
 * screen. `faint` keeps only the graticule and a pair of static ring arcs
 * so content slides stay legible. Motion never starts in print/export
 * mode — the PDF gets exactly the static chart — and prefers-reduced-motion
 * holds the chart still.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useNav } from '@slidev/client'

const props = withDefaults(
  defineProps<{
    variant?: 'bold' | 'faint'
    anchor?: 'left' | 'center' | 'right' | 'bottom'
  }>(),
  { variant: 'faint', anchor: 'right' },
)

// Unique id prefix per instance: overview mode renders every slide at once,
// so duplicate SVG defs ids would cross-wire textPaths between backdrops.
let uidCounter = 0
function nextUid() {
  uidCounter += 1
  return uidCounter
}
const uid = `zmc-orrery-${nextUid()}-${Math.random().toString(36).slice(2, 8)}`

const DEG = Math.PI / 180
function pt(r: number, angle: number) {
  const rad = (angle - 90) * DEG
  return { x: 500 + r * Math.cos(rad), y: 500 + r * Math.sin(rad) }
}

// radial graticule lines, every 15°
const graticule = computed(() => {
  const lines = []
  for (let a = 0; a < 360; a += 15) {
    const p1 = pt(90, a)
    const p2 = pt(448, a)
    lines.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y })
  }
  return lines
})

// degree ring: minor ticks every 3°, major every 15°
const ticks = computed(() => {
  const t = []
  for (let a = 0; a < 360; a += 3) {
    const major = a % 15 === 0
    const p1 = pt(major ? 450 : 456, a)
    const p2 = pt(462, a)
    t.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, major })
  }
  return t
})

// degree labels every 30°, bold only
const degLabels = computed(() => {
  const l = []
  for (let a = 0; a < 360; a += 30) {
    const p = pt(477, a)
    l.push({ x: p.x, y: p.y, text: `${String(a).padStart(3, '0')}°` })
  }
  return l
})

const bold = computed(() => props.variant === 'bold')

const svgEl = ref<SVGSVGElement | null>(null)

/**
 * Inset labels: gap each ring's stroke exactly where its lettering sits, so
 * the text reads as engraved into the orbital track. The site's cutLabelGaps
 * estimates the gap from getComputedTextLength() plus a WebKit tracking
 * correction — an estimate that overshoots by a glyph-spacing or two, which
 * is invisible at the site's 3.2px type but reads as the text sitting early
 * in its gap at this component's 8px. Here the rings are true circles, so we
 * skip estimation entirely: ask the engine where the first and last glyphs
 * actually landed and convert those points to arc positions by angle.
 */
function cutLabelGaps(svg: SVGSVGElement): boolean {
  let allCut = true
  svg.querySelectorAll<SVGTextElement>('text.orbit-label').forEach((label) => {
    const group = label.closest('g')
    const ring = group?.querySelector<SVGPathElement>('.gap-ring')
    if (!ring || !label.querySelector('textPath'))
      return
    // a slide preloaded while hidden reports zero glyphs — retry when shown
    const n = label.getNumberOfChars()
    if (!n) {
      allCut = false
      return
    }

    const C = ring.getTotalLength()
    const pad = Number.parseFloat(ring.dataset.labelPad || '5')
    // ring paths start at 12 o'clock and run clockwise
    const toArc = (p: DOMPoint) => {
      const deg = (Math.atan2(p.y - 500, p.x - 500) * 180) / Math.PI
      return (((deg + 90 + 360) % 360) / 360) * C
    }
    const s0 = toArc(label.getStartPositionOfChar(0))
    const s1 = toArc(label.getEndPositionOfChar(n - 1))

    const gapLen = Math.min(((s1 - s0 + C) % C) + pad * 2, C * 0.9)
    const drawLen = C - gapLen
    const gapStart = (s0 - pad + C) % C

    ring.setAttribute('stroke-dasharray', `${drawLen} ${gapLen}`)
    // pattern position at path point p is (p + offset) mod C; the gap region
    // of the pattern is [drawLen, C), so offset places it at gapStart
    ring.setAttribute('stroke-dashoffset', `${(drawLen - gapStart + C) % C}`)
  })
  return allCut
}

let visibilityRetry: IntersectionObserver | undefined

/**
 * Time-based motion: the site's orrery turns with scroll (data-rate = deg
 * per scroll px); here a clock stands in for the scroll bar. `travel`
 * accrues at DRIFT virtual px per second and feeds the same rotation math,
 * so the plates keep the site's gear ratios — inner rings quick, outer
 * rings stately, moon retrograde, comet on its Kepler track.
 */
const DRIFT = 24

/** Keplerian elements for the comet track (SVG user units). */
const COMET = { a: 235, b: 131.15, e: 195 / 235, mRate: 0.0021, tail: 16 } as const

/**
 * Solves Kepler's equation (M = E − e·sinE) for the comet's position in the
 * track wrapper's local coordinates. The sun sits at the focus (500, 500);
 * perihelion points toward −X of the track frame. The tail always points
 * anti-sunward.
 */
function cometPosition(travel: number) {
  const M = (travel * COMET.mRate) % (2 * Math.PI)
  let E = M
  for (let i = 0; i < 6; i++)
    E -= (E - COMET.e * Math.sin(E) - M) / (1 - COMET.e * Math.cos(E))
  const xf = COMET.a * (Math.cos(E) - COMET.e)
  const yf = COMET.b * Math.sin(E)
  const x = 500 - xf
  const y = 500 - yf
  const r = Math.hypot(xf, yf) || 1
  return { x, y, tailX: x - (xf / r) * COMET.tail, tailY: y - (yf / r) * COMET.tail }
}

const cometBody = ref<SVGCircleElement | null>(null)
const cometTail = ref<SVGLineElement | null>(null)

let orbitGroups: { el: SVGGElement, rate: number }[] = []
let moonOrbits: { el: SVGGElement, rate: number, cx: string, cy: string }[] = []
let raf = 0
let lastT = 0
let travel = 0

function frame(t: number) {
  // cap dt: background-tab throttling and overview pauses resume as a
  // gentle continuation, not a fast-forward lurch
  travel += Math.min(Math.max(t - lastT, 0) / 1000, 0.1) * DRIFT
  lastT = t
  for (const { el, rate } of orbitGroups)
    el.style.transform = `rotate(${travel * rate}deg)`
  for (const { el, rate, cx, cy } of moonOrbits)
    el.setAttribute('transform', `rotate(${travel * rate} ${cx} ${cy})`)
  if (cometBody.value && cometTail.value) {
    const { x, y, tailX, tailY } = cometPosition(travel)
    cometBody.value.setAttribute('cx', `${x}`)
    cometBody.value.setAttribute('cy', `${y}`)
    cometTail.value.setAttribute('x1', `${x}`)
    cometTail.value.setAttribute('y1', `${y}`)
    cometTail.value.setAttribute('x2', `${tailX}`)
    cometTail.value.setAttribute('y2', `${tailY}`)
  }
  raf = requestAnimationFrame(frame)
}

const { isPrintMode } = useNav()
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
let inView = false
let viewWatch: IntersectionObserver | undefined

function syncMotion() {
  const run = inView && !reducedMotion.matches && !isPrintMode.value
  if (run && !raf) {
    lastT = performance.now()
    raf = requestAnimationFrame(frame)
  }
  else if (!run && raf) {
    cancelAnimationFrame(raf)
    raf = 0
  }
}

onMounted(() => {
  if (!bold.value)
    return
  // gaps must fit the rendered lettering, so wait for Cormorant to load
  const attempt = () => !svgEl.value || cutLabelGaps(svgEl.value)
  const ready = document.fonts?.ready ?? Promise.resolve()
  ready.then(() => {
    if (attempt())
      return
    visibilityRetry = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting) && attempt())
        visibilityRetry?.disconnect()
    })
    if (svgEl.value)
      visibilityRetry.observe(svgEl.value)
  })

  if (!svgEl.value)
    return
  orbitGroups = [...svgEl.value.querySelectorAll<SVGGElement>('g.orbit-group')]
    .map(el => ({ el, rate: Number.parseFloat(el.dataset.rate || '0') }))
  moonOrbits = [...svgEl.value.querySelectorAll<SVGGElement>('g.moon-orbit')]
    .map(el => ({
      el,
      rate: Number.parseFloat(el.dataset.rate || '0'),
      cx: el.dataset.cx ?? '',
      cy: el.dataset.cy ?? '',
    }))
  // run only while on screen: overview and preloaded slides stay parked
  viewWatch = new IntersectionObserver((entries) => {
    inView = entries.some(e => e.isIntersecting)
    syncMotion()
  })
  viewWatch.observe(svgEl.value)
  reducedMotion.addEventListener('change', syncMotion)
})

watch(isPrintMode, syncMotion)

onBeforeUnmount(() => {
  visibilityRetry?.disconnect()
  viewWatch?.disconnect()
  reducedMotion.removeEventListener('change', syncMotion)
  if (raf)
    cancelAnimationFrame(raf)
  raf = 0
})
</script>

<template>
  <div class="zmc-backdrop" :data-variant="variant" :data-anchor="anchor" aria-hidden="true">
    <svg ref="svgEl" viewBox="0 0 1000 1000">
      <defs v-if="bold">
        <path :id="`${uid}-lp152`" d="M 500 348 A 152 152 0 1 1 499.98 348" />
        <path :id="`${uid}-lp294`" d="M 500 206 A 294 294 0 1 1 499.98 206" />
        <path :id="`${uid}-lp410`" d="M 500 90 A 410 410 0 1 1 499.98 90" />
        <radialGradient :id="`${uid}-core`">
          <stop offset="0%" stop-color="var(--bg-core)" />
          <stop offset="100%" stop-color="var(--bg-core)" stop-opacity="0" />
        </radialGradient>
        <mask :id="`${uid}-starHole`">
          <rect x="440" y="440" width="120" height="120" fill="#fff" />
          <circle cx="500" cy="500" r="14" fill="#000" />
        </mask>
      </defs>

      <!-- core glow behind the sun -->
      <circle
        v-if="bold"
        cx="500"
        cy="500"
        r="270"
        :fill="`url(#${uid}-core)`"
        :opacity="`var(--core-glow-opacity)`"
      />

      <!-- graticule + degree ring -->
      <g stroke="var(--grat)" stroke-width="0.6">
        <line v-for="(l, i) in graticule" :key="`g${i}`" v-bind="l" />
      </g>
      <circle cx="500" cy="500" r="456" fill="none" stroke="var(--orb-outer)" stroke-width="0.7" />
      <circle cx="500" cy="500" r="462" fill="none" stroke="var(--orb-outer)" stroke-width="0.7" />
      <g>
        <line
          v-for="(t, i) in ticks"
          :key="`t${i}`"
          :x1="t.x1"
          :y1="t.y1"
          :x2="t.x2"
          :y2="t.y2"
          :stroke="t.major ? 'var(--tick)' : 'var(--grat)'"
          :stroke-width="t.major ? 0.7 : 0.5"
        />
      </g>
      <g v-if="bold" class="deg-labels">
        <text v-for="(d, i) in degLabels" :key="`d${i}`" :x="d.x" :y="d.y">{{ d.text }}</text>
      </g>

      <!-- faint: a pair of quiet ring arcs is all the content slides carry -->
      <template v-if="!bold">
        <circle cx="500" cy="500" r="196" fill="none" stroke="var(--orb-celest)" stroke-width="0.6" />
        <circle cx="500" cy="500" r="356" fill="none" stroke="var(--orb-brass)" stroke-width="0.6" />
      </template>

      <!-- bold: the chart proper -->
      <template v-if="bold">
        <!-- compass star + the sun's chart symbol ☉ -->
        <path
          :mask="`url(#${uid}-starHole)`"
          fill="var(--tick)"
          d="M 500 452 L 504.59 488.91 L 521.82 478.18 L 511.09 495.41 L 548 500 L 511.09 504.59 L 521.82 521.82 L 504.59 511.09 L 500 548 L 495.41 511.09 L 478.18 521.82 L 488.91 504.59 L 452 500 L 488.91 495.41 L 478.18 478.18 L 495.41 488.91 Z"
        />
        <circle cx="500" cy="500" r="11" fill="none" stroke="var(--brass)" stroke-width="0.8" />
        <circle cx="500" cy="500" r="2.6" fill="var(--brass)" />

        <!-- orbits: data-rate = degrees per virtual scroll px, the site's gearing -->
        <g class="orbit-group" data-rate="0.10">
          <circle cx="500" cy="500" r="72" fill="none" stroke="var(--orb-brass)" stroke-width="0.6" />
          <circle cx="572" cy="500" r="1.8" fill="var(--brass)" />
        </g>

        <g class="orbit-group" data-rate="-0.078">
          <circle cx="500" cy="500" r="110" fill="none" stroke="var(--orb-ink)" stroke-width="0.6" />
          <circle cx="500" cy="390" r="2.2" fill="var(--ink)" opacity="0.75" />
        </g>

        <g class="orbit-group" data-rate="0.058">
          <path
            class="gap-ring"
            data-label-pad="5"
            d="M 500 348 A 152 152 0 1 1 499.98 348"
            fill="none"
            stroke="var(--orb-brass)"
            stroke-width="0.7"
          />
          <circle cx="652" cy="500" r="3" fill="var(--brass)" />
          <circle cx="652" cy="500" r="9" fill="none" stroke="var(--orb-brass)" stroke-width="0.4" />
          <g class="moon-orbit" data-rate="-0.45" data-cx="652" data-cy="500">
            <circle cx="661" cy="500" r="1.1" fill="var(--ink)" opacity="0.8" />
          </g>
          <text class="orbit-label brass">
            <textPath :href="`#${uid}-lp152`" startOffset="55%">
              <tspan dy="2.33">ORBIS·III · LVNA·RETROGRADA</tspan>
            </textPath>
          </text>
        </g>

        <g class="orbit-group" data-rate="-0.044">
          <circle cx="500" cy="500" r="196" fill="none" stroke="var(--orb-celest)" stroke-width="0.6" />
          <circle cx="361" cy="361" r="2.4" fill="var(--celest)" />
        </g>

        <g class="orbit-group" data-rate="0.033">
          <circle cx="500" cy="500" r="242" fill="none" stroke="var(--orb-ink)" stroke-width="0.6" />
          <circle cx="742" cy="500" r="4" fill="var(--ink)" opacity="0.8" />
          <ellipse
            cx="742"
            cy="500"
            rx="9.5"
            ry="3.2"
            fill="none"
            stroke="var(--orb-brass)"
            stroke-width="0.6"
            transform="rotate(-18 742 500)"
          />
        </g>

        <!-- asteroid belt -->
        <g class="orbit-group" data-rate="-0.020">
          <circle cx="500" cy="500" r="286" fill="none" stroke="var(--orb-ink)" stroke-width="0.45" stroke-dasharray="1 6" />
          <circle cx="500" cy="500" r="302" fill="none" stroke="var(--orb-ink)" stroke-width="0.45" stroke-dasharray="1 6" />
          <circle cx="793" cy="512" r="1.1" fill="var(--ink)" opacity="0.55" />
          <circle cx="760" cy="644" r="1.3" fill="var(--brass)" opacity="0.5" />
          <circle cx="643" cy="759" r="1.2" fill="var(--celest)" opacity="0.6" />
          <circle cx="348" cy="752" r="1.3" fill="var(--brass)" opacity="0.45" />
          <circle cx="240" cy="644" r="1.2" fill="var(--celest)" opacity="0.55" />
          <circle cx="294" cy="288" r="1.2" fill="var(--ink)" opacity="0.5" />
          <circle cx="503" cy="207" r="1.2" fill="var(--ink)" opacity="0.55" />
          <circle cx="711" cy="293" r="1.2" fill="var(--ink)" opacity="0.5" />
          <text class="orbit-label">
            <textPath :href="`#${uid}-lp294`" startOffset="40%">
              <tspan dy="2.33">CINGVLVM·ASTEROIDVM</tspan>
            </textPath>
          </text>
        </g>

        <g class="orbit-group" data-rate="0.016">
          <circle cx="500" cy="500" r="356" fill="none" stroke="var(--orb-celest)" stroke-width="0.6" />
          <circle cx="147.5" cy="450.2" r="2.6" fill="var(--celest)" />
        </g>

        <g class="orbit-group" data-rate="-0.011">
          <path
            class="gap-ring"
            data-label-pad="5"
            d="M 500 90 A 410 410 0 1 1 499.98 90"
            fill="none"
            stroke="var(--orb-ink)"
            stroke-width="0.6"
          />
          <circle cx="115" cy="360" r="2.8" fill="var(--ink)" opacity="0.8" />
          <circle cx="205" cy="215" r="1.2" fill="var(--ink)" opacity="0.5" />
          <circle cx="145" cy="705" r="1.2" fill="var(--ink)" opacity="0.5" />
          <text class="orbit-label">
            <textPath :href="`#${uid}-lp410`" startOffset="62%">
              <tspan dy="2.33">ORBIS·VII · CVM·TROIANIS</tspan>
            </textPath>
          </text>
        </g>

        <!-- comet on its eccentric track -->
        <g transform="rotate(25 500 500)">
          <path
            d="M 695 368.85 A 235 131.15 0 1 1 694.98 368.85"
            fill="none"
            stroke="var(--orb-celest)"
            stroke-width="0.55"
          />
          <circle ref="cometBody" cx="460" cy="500" r="1.8" fill="var(--celest)" />
          <line ref="cometTail" x1="460" y1="500" x2="444" y2="500" stroke="var(--orb-celest)" stroke-width="0.8" />
        </g>
      </template>
    </svg>
  </div>
</template>

<style>
.zmc-backdrop .orbit-group {
  transform-box: view-box;
  transform-origin: center;
  will-change: transform;
}
.zmc-backdrop .orbit-label {
  font-family: "Cormorant", serif;
  font-style: italic;
  font-weight: 500;
  font-size: 8px;
  letter-spacing: 0.24em;
  fill: var(--label);
}
.zmc-backdrop .orbit-label.brass {
  fill: var(--label-brass);
}
.zmc-backdrop .deg-labels text {
  font-family: "Spline Sans Mono", monospace;
  font-weight: 300;
  font-size: 9.5px;
  letter-spacing: 0.08em;
  fill: var(--label);
  text-anchor: middle;
  dominant-baseline: middle;
}
</style>
