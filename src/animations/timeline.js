/**
 * ============================================================
 * THE MASTER TIMELINE
 * ============================================================
 *
 * The single source of truth for the Home page's cinematic sequence.
 *
 * `getSceneState(p, out)` is a PURE function of scroll progress (0 → 1).
 * It writes the complete transform state of every element in the scene into
 * a preallocated object. Nothing here reads time, nothing here holds state,
 * nothing here triggers.
 *
 * That is deliberate, and it is what makes the brief's core requirement work:
 *
 *     scroll position IS animation progress
 *
 * Because the state is a pure function of `p`, scrolling backward reproduces
 * the sequence exactly in reverse, and dropping the user mid-page (a refresh,
 * a deep link, a restored scroll position) lands them at a correct frame
 * rather than at the start of a triggered animation.
 *
 * Renderers lerp *toward* this state each frame, which supplies the physical
 * weight — the object is always chasing its target, never snapped to it.
 */

import { seg, range, band, clamp, lerp, DEG } from './easing'
import {
  easeInOutQuint,
  easeInOutCubic,
  easeOutCubic,
  easeOutQuart,
  easeInQuart,
  easeMech,
  smoothstep,
} from './easing'

/**
 * Phase boundaries as fractions of total page scroll.
 * Tuned so each beat gets enough scroll distance to read as a deliberate
 * camera move rather than a transition.
 */
export const PHASES = {
  HERO: [0.0, 0.17],
  VERTICAL: [0.17, 0.37],
  GIMBAL: [0.37, 0.545],
  ORBIT: [0.545, 0.76],
  EXPLODE: [0.76, 1.0],
}

export const PHASE_LABELS = [
  { id: 'hero', index: 'A', name: 'The Instrument', at: 0.0 },
  { id: 'vertical', index: 'B', name: 'Reframe', at: 0.17 },
  { id: 'gimbal', index: 'C', name: 'Stabilise', at: 0.37 },
  { id: 'orbit', index: 'D', name: 'Orbit', at: 0.545 },
  { id: 'explode', index: 'E', name: 'Anatomy', at: 0.76 },
]

/** Total scroll length of the Home page, in viewport heights. */
export const HOME_SCROLL_VH = 760

export function createSceneState() {
  return {
    p: 0,
    phase: 'hero',
    phaseIndex: 0,

    // The camera/gimbal assembly's own transform, in stage space.
    rig: { x: 0, y: 0, z: 0, rotX: 0, rotY: 0, rotZ: 0, scale: 1 },

    // The gimbal: 0 = fully retracted and invisible, 1 = mounted.
    gimbal: { assemble: 0, opacity: 0, explode: 0 },

    // The viewer's own position — a real orbit, so world-fixed lights rake
    // across the body as you travel around it.
    orbit: { azimuth: 0, elevation: 0.02, radius: 6.0 },

    // Exploded view.
    explode: 0,
    callouts: 0,

    // Atmosphere.
    redRim: 1,
    keyIntensity: 1,
    bloomPool: 0.35,

    // DOM content layer opacities.
    ui: {
      hero: 1,
      spec: 0,
      gimbalCopy: 0,
      orbitCopy: 0,
      explodeCopy: 0,
      degrees: 0,
      scrollHint: 1,
    },
  }
}

/**
 * @param {number} p     scroll progress, 0..1
 * @param {object} out   preallocated state object (see createSceneState)
 * @param {object} opts  { mobile: boolean }
 */
export function getSceneState(p, out, opts = {}) {
  const mobile = !!opts.mobile
  p = clamp(p)
  out.p = p

  // ---------------------------------------------------------------
  // PHASE 1 — HERO (0 → 17%)
  // FX30 horizontal, right of frame, slightly floating.
  // Typography owns the left. The camera is the protagonist.
  // ---------------------------------------------------------------

  // Screen-space X: right → centre → left → centre-for-orbit.
  // Each leg is a separate eased segment so the object never drifts
  // through a position it is not supposed to occupy.
  const xHero = mobile ? 0.0 : 1.18
  const xGimbal = mobile ? 0.0 : -1.55

  let x = xHero
  x = lerp(x, 0, easeInOutQuint(range(p, 0.17, 0.37))) // → centre
  x = lerp(x, xGimbal, easeInOutQuint(range(p, 0.37, 0.545))) // → left
  x = lerp(x, 0, easeInOutCubic(range(p, 0.545, 0.63))) // → centre for orbit

  // A slow vertical settle: the rig sinks fractionally as it gains the gimbal,
  // as though it just took on weight.
  const y =
    seg(p, 0.0, 0.37, 0.06, 0.0, easeInOutCubic) +
    seg(p, 0.37, 0.545, 0.0, -0.1, easeMech) +
    seg(p, 0.76, 1.0, 0.0, 0.06, easeOutCubic)

  // ---------------------------------------------------------------
  // ROTATION — the two 90° moves
  //
  // rotZ is roll about the view axis, so it turns the silhouette in the
  // screen plane: HORIZONTAL → PORTRAIT → HORIZONTAL. Quintic easing gives
  // the long, weighted settle of a real camera being repositioned by hand.
  // ---------------------------------------------------------------
  const rotZ =
    seg(p, 0.17, 0.37, 0, -90 * DEG, easeInOutQuint) + // horizontal → portrait
    seg(p, 0.37, 0.545, 0, 90 * DEG, easeInOutQuint) // portrait → horizontal

  // Yaw. The hero sits at a deep three-quarter so the lens angles *into* the
  // composition rather than pointing down the barrel at the viewer, and the
  // grip side stays toward camera — the way a camera is photographed.
  // It opens toward frontal for the portrait beat, then settles into the
  // slightly isometric read the gimbal section asks for.
  let rotY = -58 * DEG
  rotY = lerp(rotY, -22 * DEG, easeInOutCubic(range(p, 0.17, 0.37)))
  rotY = lerp(rotY, -44 * DEG, easeInOutCubic(range(p, 0.37, 0.545)))

  // Pitch: a slight downward look during the gimbal beat, levelling for orbit.
  let rotX = 4 * DEG
  rotX = lerp(rotX, 11 * DEG, easeInOutCubic(range(p, 0.37, 0.545)))
  rotX = lerp(rotX, 2 * DEG, easeInOutCubic(range(p, 0.545, 0.66)))

  out.rig.x = x
  out.rig.y = y
  out.rig.z = 0
  out.rig.rotX = rotX
  out.rig.rotY = rotY
  out.rig.rotZ = rotZ
  out.rig.scale = 1 + seg(p, 0.76, 0.94, 0, mobile ? 0.1 : 0.24, easeOutCubic)

  // ---------------------------------------------------------------
  // PHASE 3 — THE GIMBAL ARRIVES (37% → 54.5%)
  //
  // Not a crossfade. The RS3 Mini's arms travel in from below and outboard,
  // then the quick-release plate closes onto the camera's base. `assemble`
  // drives per-part offsets inside the model, so the mount reads as a
  // mechanical action rather than an opacity change.
  // ---------------------------------------------------------------
  out.gimbal.assemble = easeMech(range(p, 0.375, 0.535))
  out.gimbal.opacity = smoothstep(range(p, 0.368, 0.44))
  // During the exploded view the gimbal separates further and outlasts its
  // welcome by exactly nothing — it clears the frame so the camera's
  // interior is the only subject.
  out.gimbal.explode = easeInQuart(range(p, 0.775, 0.93))

  // ---------------------------------------------------------------
  // PHASE 4 — THE 270° ORBIT (54.5% → 76%)
  //
  // The three.js camera travels, not the object. World-fixed lighting then
  // sweeps across the body as you go round, which is what sells it as
  // orbiting a physical thing rather than spinning a prop on a turntable.
  //
  // Stops at 270°. The last quarter turn is deliberately never completed —
  // the push toward the viewer takes over instead.
  // ---------------------------------------------------------------
  let azimuth = seg(p, 0.575, 0.76, 0, 270 * DEG, easeInOutCubic)
  // Phase 5 drifts a further 45° to land the exploded view on a clean
  // three-quarter rather than a flat side elevation.
  azimuth += seg(p, 0.76, 0.94, 0, 48 * DEG, easeOutQuart)

  let elevation = 0.02
  elevation = lerp(elevation, 0.3, easeInOutCubic(range(p, 0.56, 0.68)))
  elevation = lerp(elevation, 0.12, easeInOutCubic(range(p, 0.68, 0.78)))
  elevation = lerp(elevation, 0.16, easeOutCubic(range(p, 0.86, 1.0)))

  // ---------------------------------------------------------------
  // PHASE 5 — PUSH IN, THEN OPEN (76% → 100%)
  //
  // Radius drives the two-part move the brief describes as "entering the
  // camera": a hard push to almost inside the body, then — as the components
  // separate outward past the viewer — a pull back that reveals the whole
  // exploded array. Push and reveal, not one long zoom.
  // ---------------------------------------------------------------
  // Close enough in the opening beats that the body fills half the frame —
  // it has to read as the subject, not as an illustration beside the type.
  let radius = mobile ? 7.0 : 5.4
  // Widened for the gimbal: the mounted assembly is roughly three times the
  // height of the body alone, so the viewer has to stand further back.
  radius = lerp(radius, mobile ? 8.4 : 7.2, easeInOutCubic(range(p, 0.37, 0.6)))
  radius = lerp(radius, mobile ? 3.2 : 2.5, easeInQuart(range(p, 0.755, 0.855))) // push in
  // Opens out far enough to frame the whole exploded array plus the
  // typography sitting around it.
  radius = lerp(radius, mobile ? 11.2 : 9.2, easeOutQuart(range(p, 0.855, 1.0)))

  out.orbit.azimuth = azimuth
  out.orbit.elevation = elevation
  out.orbit.radius = radius

  // Components separate on a slight delay behind the push, so the viewer is
  // already inside the body when it starts to come apart around them.
  out.explode = easeOutQuart(range(p, 0.805, 0.985))
  // Technical callout lines resolve last, once the parts have found their
  // final positions — an engineering drawing assembling itself.
  out.callouts = smoothstep(range(p, 0.9, 0.99))

  // ---------------------------------------------------------------
  // ATMOSPHERE
  // Red is lighting, not decoration. It swells where the drama is.
  // ---------------------------------------------------------------
  // Swells where the drama is, but the ceiling stays low: past roughly 1.4
  // the rim stops being an edge light and starts painting whole faces red.
  out.redRim =
    0.8 +
    seg(p, 0.545, 0.72, 0, 0.35, easeInOutCubic) +
    seg(p, 0.82, 1.0, 0, 0.25, easeOutCubic)
  // Key lifts through the anatomy section: thirty separated components need
  // more light to stay legible than one solid body does.
  out.keyIntensity = 1 + seg(p, 0.8, 0.97, 0, 0.35, easeOutCubic)
  out.bloomPool =
    0.35 + seg(p, 0.5, 0.78, 0, 0.4, smoothstep) + seg(p, 0.86, 1, 0, 0.3, easeOutCubic)

  // ---------------------------------------------------------------
  // DOM CONTENT LAYERS
  // Existing content moves and fades; it is never cut.
  // ---------------------------------------------------------------
  const ui = out.ui
  // The hero's fade-in window starts before zero so it is already at full
  // opacity on the first frame rather than rising out of nothing.
  ui.hero = band(p, -0.05, 0, 0.1, 0.2)
  ui.spec = band(p, 0.19, 0.26, 0.33, 0.4)
  ui.gimbalCopy = band(p, 0.4, 0.47, 0.53, 0.585)
  ui.orbitCopy = band(p, 0.6, 0.65, 0.72, 0.775)
  ui.degrees = band(p, 0.57, 0.61, 0.74, 0.78)
  ui.explodeCopy = band(p, 0.84, 0.9, null, null)
  ui.scrollHint = 1 - smoothstep(range(p, 0.02, 0.07))

  // ---------------------------------------------------------------
  // PHASE READOUT (for the section index in the corner)
  // ---------------------------------------------------------------
  let phaseIndex = 0
  for (let i = PHASE_LABELS.length - 1; i >= 0; i--) {
    if (p >= PHASE_LABELS[i].at) {
      phaseIndex = i
      break
    }
  }
  out.phaseIndex = phaseIndex
  out.phase = PHASE_LABELS[phaseIndex].id

  return out
}

/** Degrees travelled around the rig — surfaced in the orbit HUD. */
export function orbitDegrees(state) {
  return Math.round((state.orbit.azimuth / DEG) % 360)
}
