/**
 * Loading screen.
 *
 * Holds until the WebGL context reports ready, then a minimum beat so the
 * transition never flashes. Styled as a lens iris closing open — the site's
 * first frame is already part of the camera language.
 */

import { useEffect, useRef, useState } from 'react'
import Mark from './Mark'
import '../styles/loader.css'

export default function LoadingScreen({ ready }) {
  const [gone, setGone] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const barRef = useRef(null)
  const startedAt = useRef(Date.now())

  useEffect(() => {
    let raf
    const tick = () => {
      const elapsed = Date.now() - startedAt.current
      // Creeps toward 90% on its own, completes when the scene is actually up.
      const auto = Math.min(0.9, 1 - Math.exp(-elapsed / 900))
      const v = ready ? 1 : auto
      if (barRef.current) barRef.current.style.transform = `scaleX(${v.toFixed(3)})`
      if (!(ready && v >= 1)) raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [ready])

  useEffect(() => {
    if (!ready) return
    const minimum = Math.max(0, 700 - (Date.now() - startedAt.current))
    const t1 = setTimeout(() => setLeaving(true), minimum)
    const t2 = setTimeout(() => setGone(true), minimum + 900)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [ready])

  if (gone) return null

  return (
    <div className={`loader ${leaving ? 'is-leaving' : ''}`} role="status" aria-live="polite">
      <div className="loader__inner">
        <span className="loader__mark">
          <Mark size={26} open={leaving ? 1 : 0} />
        </span>
        <div className="loader__wordmark">
          <span>Cinematics</span>
          <em>Production</em>
        </div>
        <div className="loader__rail">
          <div className="loader__bar" ref={barRef} />
        </div>
        <p className="t-micro loader__note">Preparing the stage</p>
      </div>
      <span className="sr-only">Loading</span>
    </div>
  )
}
