/**
 * HOME — one continuous cinematic sequence.
 *
 * The page is a fixed WebGL stage with a tall, empty scroll track behind it.
 * Nothing here scrolls in the conventional sense: scroll position is fed
 * straight into the master timeline, and both the 3D scene and these DOM
 * layers read the resulting state.
 *
 * The DOM layers are written to imperatively — `style.opacity`,
 * `style.transform`, `textContent` — inside the scroll ticker. No React state
 * changes while scrolling, so the sequence holds frame rate with a 45-part
 * rig on screen.
 */

import { useRef, useEffect, useMemo } from 'react'
import Scene from '../3d/Scene'
import { updateSceneState, sceneState } from '../3d/sceneStore'
import { useScrollDriver, useScrollFrame, useDeviceTier, useScrollTo } from '../animations/scroll'
import { HOME_SCROLL_VH, PHASE_LABELS, orbitDegrees } from '../animations/timeline'
import { range, clamp } from '../animations/easing'
import { navigate } from '../components/router'
import '../styles/home.css'

/* Opacity + travel for a DOM layer across its own window of the timeline.
   Content rises in and lifts out — it is never cut. */
function layerMotion(p, i0, i1, o0, o1, travel = 26) {
  const rise = range(p, i0, i1)
  const fall = o0 == null ? 0 : range(p, o0, o1)
  const opacity = Math.min(rise, 1 - fall)
  const ty = (1 - rise) * travel - fall * travel
  return { opacity, ty }
}

/**
 * Layers are centred with their own transforms (translateY(-50%),
 * translateX(-50%)), so the scroll motion is published as a custom property
 * and composed inside each layer's transform in CSS. Writing
 * `style.transform` here instead would silently drop the centring and shift
 * every centred layer by half its own size.
 */
function apply(el, m) {
  if (!el) return
  const o = m.opacity
  el.style.opacity = o.toFixed(3)
  el.style.setProperty('--ty', `${m.ty.toFixed(2)}px`)
  const on = o > 0.012
  el.style.visibility = on ? 'visible' : 'hidden'
  el.style.pointerEvents = o > 0.6 ? 'auto' : 'none'
}

export default function Home({ onSceneReady }) {
  const { tier, mobile } = useDeviceTier()
  const track = useRef(null)
  const scrollTo = useScrollTo()

  useScrollDriver(track)

  const L = useRef({})
  const set = useMemo(
    () => (key) => (el) => {
      L.current[key] = el
    },
    [],
  )

  useEffect(() => {
    updateSceneState(0, { mobile })
  }, [mobile])

  useScrollFrame(
    (p) => {
      const s = updateSceneState(p, { mobile })
      const l = L.current

      apply(l.hero, layerMotion(p, -0.05, 0, 0.1, 0.2, 34))
      apply(l.heroChip, layerMotion(p, -0.03, 0.012, 0.1, 0.17, 18))
      apply(l.specL, layerMotion(p, 0.19, 0.26, 0.33, 0.4))
      apply(l.specR, layerMotion(p, 0.21, 0.28, 0.33, 0.4))
      apply(l.gimbal, layerMotion(p, 0.4, 0.47, 0.53, 0.585))
      apply(l.orbit, layerMotion(p, 0.6, 0.65, 0.72, 0.775, 18))
      apply(l.degrees, layerMotion(p, 0.57, 0.61, 0.745, 0.78, 12))
      apply(l.explode, layerMotion(p, 0.86, 0.92, null, null, 22))

      // scroll hint retires as soon as the sequence is under way
      if (l.hint) {
        const o = 1 - range(p, 0.015, 0.06)
        l.hint.style.opacity = o.toFixed(3)
        l.hint.style.visibility = o > 0.01 ? 'visible' : 'hidden'
      }

      // --- corner HUD ---
      if (l.hudIndex) {
        const label = PHASE_LABELS[s.phaseIndex]
        if (l.hudIndex.textContent !== label.index) l.hudIndex.textContent = label.index
        if (l.hudName.textContent !== label.name) l.hudName.textContent = label.name
      }
      if (l.hudPct) {
        const pct = String(Math.round(p * 100)).padStart(3, '0')
        if (l.hudPct.textContent !== pct) l.hudPct.textContent = pct
      }
      if (l.bar) l.bar.style.transform = `scaleY(${clamp(p, 0.002, 1).toFixed(4)})`

      // --- orbit degree readout ---
      if (l.degValue) {
        const d = String(Math.min(270, Math.max(0, orbitDegrees(s)))).padStart(3, '0')
        if (l.degValue.textContent !== d) l.degValue.textContent = d
      }
      if (l.degArc) {
        const t = clamp(range(p, 0.575, 0.76))
        l.degArc.style.strokeDashoffset = String((1 - t * 0.75) * 176)
      }
    },
    [mobile],
  )

  return (
    <main className="home">
      {/* ---------- fixed cinematic stage ---------- */}
      <div className="home__stage" aria-hidden="true">
        <Scene tier={tier} onReady={onSceneReady} />
        <div className="home__pool" />
      </div>

      {/* ---------- content layers ---------- */}
      <div className="home__layers">
        {/* A — CAMERA HERO */}
        <section className="layer layer--hero" ref={set('hero')}>
          <p className="t-micro hero__eyebrow">
            <span className="hero__tick" /> Cinematography &amp; Film Club — NIT Rourkela
          </p>
          <h1 className="hero__title">
            <span className="t-display">Cinematics</span>
            <span className="t-display hero__title--thin">Production</span>
          </h1>
          <p className="hero__tagline">
            Jahan camera, <span className="t-red">wahan Cinematics.</span>
          </p>
          <div className="hero__meta">
            <span className="t-micro">Sony FX30</span>
            <span className="hero__dot" />
            <span className="t-micro">DJI RS 3 Mini</span>
            <span className="hero__dot" />
            <span className="t-micro">Super 35</span>
          </div>
        </section>

        {/* floating spec label pinned near the camera */}
        <aside className="layer layer--chip glass" ref={set('heroChip')}>
          <span className="t-micro chip__key">Body</span>
          <span className="chip__value">ILME-FX30</span>
          <span className="t-micro chip__key">Mount · E</span>
        </aside>

        {/* B — REFRAME (portrait) */}
        <section className="layer layer--spec-l" ref={set('specL')}>
          <p className="t-micro layer__index">B — Reframe</p>
          <h2 className="t-title layer__title">
            Any frame.
            <br />
            <span className="t-thin">Any orientation.</span>
          </h2>
          <p className="t-body layer__copy">
            Horizontal for the screen. Vertical for the feed. The same sensor, the same
            colour science, turned ninety degrees — because the story decides the shape,
            not the equipment.
          </p>
        </section>

        <aside className="layer layer--spec-r glass" ref={set('specR')}>
          <div className="spec__head">
            <span className="t-micro">Specification</span>
            <span className="t-micro spec__id">FX30 / 001</span>
          </div>
          <dl className="spec__list">
            {[
              ['Sensor', '26.1 MP Super 35'],
              ['Codec', 'XAVC S-I · 10-bit 4:2:2'],
              ['Frame', '4K 120p / FHD 240p'],
              ['Look', 'S-Cinetone · S-Log3'],
              ['Stabilisation', '5-axis IBIS'],
            ].map(([k, v]) => (
              <div className="spec__row" key={k}>
                <dt className="t-micro">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </aside>

        {/* C — STABILISE (gimbal) */}
        <section className="layer layer--gimbal" ref={set('gimbal')}>
          <p className="t-micro layer__index">C — Stabilise</p>
          <h2 className="t-title layer__title">
            Motion,
            <br />
            <span className="t-thin">held still.</span>
          </h2>
          <p className="t-body layer__copy">
            Three motors, one horizon. The RS 3 Mini takes the weight of the body and the
            shake out of the walk, so a handheld shot carries the calm of a dolly.
          </p>
          <ul className="chips">
            {['3-Axis', '2 kg payload', '10 h runtime', 'Arca-Swiss'].map((c) => (
              <li className="chip glass glass-interactive" key={c}>
                {c}
              </li>
            ))}
          </ul>
        </section>

        {/* D — ORBIT */}
        <section className="layer layer--orbit" ref={set('orbit')}>
          <p className="t-micro layer__index">D — Orbit</p>
          <h2 className="t-title layer__title layer__title--center">
            Every angle.
            <br />
            <span className="t-thin">One story.</span>
          </h2>
        </section>

        <aside className="layer layer--degrees glass" ref={set('degrees')}>
          <svg className="deg__arc" viewBox="0 0 64 64" aria-hidden="true">
            <circle className="deg__track" cx="32" cy="32" r="28" />
            <circle
              className="deg__value"
              cx="32"
              cy="32"
              r="28"
              ref={set('degArc')}
              strokeDasharray="176"
              strokeDashoffset="176"
            />
          </svg>
          <div className="deg__readout">
            <span className="deg__number" ref={set('degValue')}>
              000
            </span>
            <span className="t-micro">deg · orbit</span>
          </div>
        </aside>

        {/* E — ANATOMY */}
        <section className="layer layer--explode" ref={set('explode')}>
          <div className="explode__bar glass">
            <div className="explode__id">
              <span className="t-micro">E — Anatomy</span>
              <span className="explode__title">Inside the frame</span>
            </div>
            <p className="t-body explode__copy">
              Thirty components, one image. This is the machine behind every frame we shoot
              — and the club that learns to use it.
            </p>
            <button
              type="button"
              className="explode__cta glass glass-interactive"
              onClick={() => navigate('live')}
            >
              <span className="dot-live" />
              <span>Watch us live</span>
              <svg width="13" height="9" viewBox="0 0 13 9" fill="none" aria-hidden="true">
                <path d="M0 4.5h11M8 1l3.5 3.5L8 8" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            </button>
          </div>
        </section>
      </div>

      {/* ---------- persistent HUD ---------- */}
      <div className="hud" aria-hidden="true">
        <div className="hud__section">
          <span className="hud__index" ref={set('hudIndex')}>
            A
          </span>
          <span className="t-micro hud__name" ref={set('hudName')}>
            The Instrument
          </span>
        </div>
        <div className="hud__progress">
          <span className="t-micro hud__pct" ref={set('hudPct')}>
            000
          </span>
          <div className="hud__rail">
            <div className="hud__bar" ref={set('bar')} />
            {PHASE_LABELS.map((ph) => (
              <span key={ph.id} className="hud__tick" style={{ top: `${ph.at * 100}%` }} />
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        className="scroll-hint"
        ref={set('hint')}
        onClick={() => scrollTo(window.innerHeight * 2)}
      >
        <span className="t-micro">Scroll</span>
        <span className="scroll-hint__line" />
      </button>

      {/* ---------- the scroll track ---------- */}
      <div
        className="home__track"
        ref={track}
        style={{ height: `${mobile ? HOME_SCROLL_VH * 0.78 : HOME_SCROLL_VH}vh` }}
      />
    </main>
  )
}

export { sceneState }
