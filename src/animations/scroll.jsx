/**
 * Scroll infrastructure.
 *
 * One Lenis instance provides inertial smoothing, one GSAP ScrollTrigger
 * converts document scroll into a single scalar 0..1, and one ticker fans
 * that scalar out to subscribers.
 *
 * Progress lives in a ref, never in React state. A scroll-driven scene that
 * re-renders React 60 times a second is a scene that drops frames — the DOM
 * layers are written to directly, and the 3D scene reads the same ref inside
 * its own frame loop.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  useState,
} from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

gsap.registerPlugin(ScrollTrigger)

const ScrollCtx = createContext(null)

export function ScrollProvider({ children }) {
  const progress = useRef(0)
  const subscribers = useRef(new Set())
  const lenisRef = useRef(null)
  /** 'native' when the document scrolls, 'input' in the embedded fallback. */
  const mode = useRef('native')

  const subscribe = useCallback((fn) => {
    subscribers.current.add(fn)
    return () => subscribers.current.delete(fn)
  }, [])

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const lenis = new Lenis({
      duration: reduced ? 0 : 1.15,
      // A long, flat decay curve. Scroll should feel like easing a fluid head,
      // not like flicking a phone list.
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: !reduced,
      syncTouch: false,
      touchMultiplier: 1.6,
      wheelMultiplier: 0.9,
    })
    lenisRef.current = lenis

    lenis.on('scroll', ScrollTrigger.update)

    const raf = (time) => {
      lenis.raf(time * 1000)
      const p = progress.current
      subscribers.current.forEach((fn) => fn(p))
    }

    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)

    /* Debug handle. Useful for jumping the sequence to a given beat while
       tuning: __cinematics.seek(0.62) parks the rig mid-orbit. */
    window.__cinematics = {
      lenis,
      progress,
      mode,
      seek(t) {
        const max = document.documentElement.scrollHeight - window.innerHeight
        if (max > 8) {
          lenis.scrollTo(max * t, { immediate: true, force: true })
          ScrollTrigger.update()
        } else {
          progress.current = t
        }
      },
    }

    return () => {
      delete window.__cinematics
      gsap.ticker.remove(raf)
      lenis.destroy()
      lenisRef.current = null
    }
  }, [])

  const value = useMemo(
    () => ({ progress, subscribe, lenis: lenisRef, mode }),
    [subscribe],
  )

  return <ScrollCtx.Provider value={value}>{children}</ScrollCtx.Provider>
}

export function useScroll() {
  const ctx = useContext(ScrollCtx)
  if (!ctx) throw new Error('useScroll must be used inside <ScrollProvider>')
  return ctx
}

/* ============================================================
   EMBEDDED FALLBACK — INPUT-DRIVEN PROGRESS
   ============================================================
   Some hosts render a page inside a frame sized to its own content. There is
   then nothing for the document to scroll: `window.scrollY` stays at 0
   forever, ScrollTrigger reports progress 0, and the whole sequence sits
   frozen on its opening frame however hard the visitor scrolls.

   So when the document genuinely has no scroll distance, wheel, touch and
   keyboard input are read directly and integrated into the same 0..1 scalar.
   Identical timeline, identical feel, no dependency on a scrollbar existing.

   This only ever activates when native scrolling is impossible, so the
   deployed site keeps real scrolling with Lenis smoothing.
   ============================================================ */

function attachInputDriver(progress, distancePx) {
  let target = progress.current || 0
  let current = target
  let raf = 0

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
  const push = (dy) => {
    target = clamp01(target + dy / distancePx)
  }

  const step = () => {
    // Same easing character as Lenis: a long, flat decay.
    current += (target - current) * 0.1
    if (Math.abs(target - current) < 0.00002) current = target
    progress.current = current
    raf = requestAnimationFrame(step)
  }

  const onWheel = (e) => {
    e.preventDefault()
    // deltaMode 1 is lines, 2 is pages
    const scale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? distancePx : 1
    push(e.deltaY * scale)
  }

  let lastTouch = null
  const onTouchStart = (e) => {
    lastTouch = e.touches[0].clientY
  }
  const onTouchMove = (e) => {
    if (lastTouch === null) return
    e.preventDefault()
    const y = e.touches[0].clientY
    push((lastTouch - y) * 2.4)
    lastTouch = y
  }
  const onTouchEnd = () => {
    lastTouch = null
  }

  const KEYS = {
    ArrowDown: 140,
    ArrowUp: -140,
    PageDown: 760,
    PageUp: -760,
    ' ': 760,
    Home: -Infinity,
    End: Infinity,
  }
  const onKey = (e) => {
    if (!(e.key in KEYS)) return
    e.preventDefault()
    const d = KEYS[e.key]
    if (d === Infinity) target = 1
    else if (d === -Infinity) target = 0
    else push(d)
  }

  window.addEventListener('wheel', onWheel, { passive: false })
  window.addEventListener('touchstart', onTouchStart, { passive: true })
  window.addEventListener('touchmove', onTouchMove, { passive: false })
  window.addEventListener('touchend', onTouchEnd, { passive: true })
  window.addEventListener('keydown', onKey)
  raf = requestAnimationFrame(step)

  return {
    seek(t) {
      target = clamp01(t)
      current = target
      progress.current = current
    },
    destroy() {
      cancelAnimationFrame(raf)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('keydown', onKey)
    },
  }
}

/**
 * Bind the master progress scalar to a scroll container.
 *
 * `scrub: true` (not a number) keeps progress locked to the scrollbar — Lenis
 * already supplies the smoothing, and layering a second smoother on top makes
 * the object feel like it is lagging rather than moving with weight.
 *
 * Falls back to the input driver above when the document cannot scroll.
 */
export function useScrollDriver(targetRef, { enabled = true } = {}) {
  const { progress, mode } = useScroll()

  useEffect(() => {
    if (!enabled || !targetRef.current) return
    const el = targetRef.current

    let trigger = null
    let input = null
    let refreshTimer = 0

    /* The track's height is an inline style React owns — it is the entire
       source of the page's scroll length. Clearing it (rather than restoring
       it) collapses the track to zero, and since React has no reason to
       re-render, it never comes back. */
    const naturalHeight = el.style.height

    /**
     * Empirical, not inferred.
     *
     * "Content is taller than the viewport" is not the same question as "this
     * document scrolls" — a host that sets `overflow: hidden`, or one that
     * grows its frame to fit the content, satisfies the first and fails the
     * second. So nudge the scroll position by a pixel and see whether it
     * actually moved, then put it back. One synchronous read/write inside a
     * single task: nothing renders in between, so there is nothing to see.
     */
    const canScroll = () => {
      const de = document.scrollingElement || document.documentElement
      if (de.scrollHeight - de.clientHeight <= 8) return false
      const before = de.scrollTop
      de.scrollTop = before + 2
      const moved = de.scrollTop !== before
      de.scrollTop = before
      return moved
    }

    const enableNative = () => {
      if (trigger) return
      input?.destroy()
      input = null
      el.style.height = naturalHeight
      mode.current = 'native'

      trigger = ScrollTrigger.create({
        trigger: el,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        onUpdate: (self) => {
          progress.current = self.progress
        },
        onRefresh: (self) => {
          progress.current = self.progress
        },
      })
    }

    const enableInput = () => {
      if (input) return
      trigger?.kill()
      trigger = null
      mode.current = 'input'

      // The track exists only to create scroll length. Without native
      // scrolling it would just make the document tall for no reason — and in
      // a content-fitted frame that tall document is exactly what breaks the
      // fixed stage. Collapse it.
      const distance = Math.max(
        window.innerHeight * 6,
        el.offsetHeight - window.innerHeight,
      )
      // Exactly one viewport, in pixels. Not 0 (a host that sizes itself to
      // content would collapse to nothing, since fixed elements contribute no
      // height) and not a vh value (which would be circular in that same
      // host). One concrete viewport of content, and no scroll distance.
      el.style.height = `${window.innerHeight}px`
      input = attachInputDriver(progress, distance)
      if (window.__cinematics) window.__cinematics.seek = input.seek
    }

    /**
     * Deliberately one-way. Once the input driver is in charge it stays in
     * charge: re-measuring would mean restoring the track's full height, and
     * in the very host this exists for, that makes the frame grow, which makes
     * the document look scrollable again, which flips the mode back — an
     * oscillation the visitor would feel as the page fighting them.
     */
    const decide = () => {
      if (input) return
      if (canScroll()) enableNative()
      else enableInput()
    }

    // Two frames of settling: fonts and the canvas both change layout height
    // after first paint, and the frame may still be resizing.
    refreshTimer = setTimeout(() => {
      decide()
      ScrollTrigger.refresh()
    }, 140)
    const late = setTimeout(decide, 900)

    window.addEventListener('resize', decide)

    return () => {
      clearTimeout(refreshTimer)
      clearTimeout(late)
      window.removeEventListener('resize', decide)
      trigger?.kill()
      input?.destroy()
    }
  }, [targetRef, enabled, progress, mode])

  return progress
}

/** Run `fn(progress)` every frame. Cheap: no React render involved. */
export function useScrollFrame(fn, deps = []) {
  const { subscribe } = useScroll()
  useEffect(() => subscribe(fn), deps) // eslint-disable-line react-hooks/exhaustive-deps
}

/** Jump the page, respecting Lenis. */
export function useScrollTo() {
  const { lenis } = useScroll()
  return useCallback(
    (target, opts) => lenis.current?.scrollTo(target, { duration: 1.2, ...opts }),
    [lenis],
  )
}

/* ============================================================
   DEVICE / CAPABILITY TIERS
   ============================================================ */

function detectTier() {
  if (typeof window === 'undefined') return { tier: 'desktop', mobile: false }
  const w = window.innerWidth
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const cores = navigator.hardwareConcurrency || 8
  const mem = navigator.deviceMemory || 8
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const mobile = w < 768 || (coarse && w < 1024)

  /* Thresholds are deliberately forgiving. `deviceMemory` caps out at 8 on
     most browsers and is absent entirely on Safari, and plenty of capable
     laptops report 4 cores — treating those as low-end downgrades the
     experience for machines that render this scene comfortably. */
  let tier = 'desktop'
  if (mobile || cores <= 2 || mem <= 2) tier = 'low'
  else if (cores <= 4 || w < 1280) tier = 'mid'

  /* ?tier=desktop|mid|low forces a tier — used by the screenshot harness and
     handy for checking the reduced path without a second device. */
  const forced = new URLSearchParams(window.location.search).get('tier')
  if (forced && ['desktop', 'mid', 'low'].includes(forced)) tier = forced

  return { tier, mobile, reduced, coarse }
}

export function useDeviceTier() {
  const [info, setInfo] = useState(detectTier)
  useEffect(() => {
    let frame
    const onResize = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setInfo(detectTier()))
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(frame)
    }
  }, [])
  return info
}
