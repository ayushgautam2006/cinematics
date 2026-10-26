/**
 * THE NAVIGATION CONTROL
 *
 * Not a navbar. A single smoked-glass chip in the top-left corner with a
 * down-arrow — the same move the Siena reference uses for its project
 * switcher, which reads as part of the cinematic interface rather than as
 * site chrome sitting on top of it.
 *
 * Closed, it states where you are. Open, it drops a two-item menu with
 * index numbers and a red marker on the active route. The aperture mark
 * opens its blades as the menu opens: one gesture, two expressions of it.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import Mark from './Mark'
import { ROUTES, useRoute, navigate } from './router'
import '../styles/nav.css'

export default function Nav() {
  const route = useRoute()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const btnRef = useRef(null)

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) close()
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        close()
        btnRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close])

  const go = (id) => {
    navigate(id)
    setOpen(false)
  }

  const active = ROUTES.find((r) => r.id === route) ?? ROUTES[0]

  return (
    <nav className="nav" ref={rootRef} aria-label="Primary">
      <div className={`nav__shell glass ${open ? 'is-open' : ''}`}>
        <button
          ref={btnRef}
          type="button"
          className="nav__trigger"
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="nav__mark" aria-hidden="true">
            <Mark size={15} open={open ? 1 : 0} />
          </span>
          <span className="nav__wordmark">
            Cinematics
            <em>Production</em>
          </span>
          <span className="nav__current t-micro">{active.label}</span>
          <span className={`nav__chevron ${open ? 'is-open' : ''}`} aria-hidden="true">
            <svg width="11" height="7" viewBox="0 0 11 7" fill="none">
              <path
                d="M1 1L5.5 5.5L10 1"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="square"
              />
            </svg>
          </span>
        </button>

        <div className="nav__menu" role="menu" aria-hidden={!open}>
          <div className="nav__menu-inner">
            <div className="nav__rule" />
            {ROUTES.map((r, i) => (
              <button
                key={r.id}
                type="button"
                role="menuitem"
                className={`nav__item ${route === r.id ? 'is-active' : ''}`}
                onClick={() => go(r.id)}
                tabIndex={open ? 0 : -1}
                style={{ '--i': i }}
              >
                <span className="nav__index t-micro">{String(i + 1).padStart(2, '0')}</span>
                <span className="nav__label">{r.label}</span>
                <span className="nav__meta t-micro">{r.meta}</span>
                <span className="nav__marker" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}
