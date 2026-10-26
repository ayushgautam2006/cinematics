/**
 * Easing + interpolation helpers.
 *
 * Every curve here is monotonic and overshoot-free. Cinematic camera moves
 * settle; they do not bounce. Nothing in this file may return a value outside
 * [0,1] for an input inside [0,1] — the whole timeline depends on that so the
 * animation reverses cleanly when the user scrolls back up.
 */

export const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v))

export const lerp = (a, b, t) => a + (b - a) * t

/** Frame-rate independent damping. `lambda` is roughly "smoothing strength". */
export const damp = (current, target, lambda, dt) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt))

/** Normalise `p` into a 0..1 progress across the window [a,b]. */
export const range = (p, a, b) => clamp((p - a) / (b - a))

// ---------- curves ----------

export const linear = (t) => t

export const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

/** The house curve: a long, weighted settle. Used for camera rotation. */
export const easeInOutQuint = (t) =>
  t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2

export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)

export const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4)

export const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t))

export const easeInCubic = (t) => t * t * t

export const easeInQuart = (t) => t * t * t * t

/** Smoothstep — gentlest of the set, for opacity and fine offsets. */
export const smoothstep = (t) => t * t * (3 - 2 * t)

/** Mechanical: quick commit, firm settle. Gimbal assembly uses this. */
export const easeMech = (t) =>
  t < 0.42 ? 2.83 * t * t : 1 - Math.pow(-1.72 * t + 1.72, 2.2)

// ---------- composites ----------

/**
 * Interpolate between two values across a window of the master timeline.
 * seg(p, 0.2, 0.4, 0, 10) → 0 before p=0.2, 10 after p=0.4, eased between.
 */
export const seg = (p, a, b, from, to, ease = easeInOutQuint) =>
  lerp(from, to, ease(range(p, a, b)))

/**
 * Opacity band. Fades in across [i0,i1], holds, fades out across [o0,o1].
 * Pass o0/o1 as null to hold to the end of the timeline.
 */
export const band = (p, i0, i1, o0 = null, o1 = null) => {
  const rise = range(p, i0, i1)
  if (o0 === null || o1 === null) return smoothstep(rise)
  const fall = 1 - range(p, o0, o1)
  return smoothstep(Math.min(rise, fall))
}

export const DEG = Math.PI / 180
