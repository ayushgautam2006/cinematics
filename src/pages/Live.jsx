/**
 * LIVE — the broadcast page.
 *
 * A completely different composition to Home, in the same visual language.
 * Where Home is one continuous camera move, this is an interface: a large
 * player holding the frame, smoked-glass panels carrying the metadata around
 * it, and a strip accordion for the schedule — the expanding vertical poster
 * rail from the streaming reference, which fills the width without the row of
 * identical rectangles every streaming UI ends up with.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  FEATURED,
  EVENTS,
  ARCHIVE,
  formatDate,
  formatTime,
  formatViewers,
  elapsedSince,
  countdown,
} from '../data/liveEvents'
import { navigate } from '../components/router'
import '../styles/live.css'

/* ============================================================
   PROCEDURAL POSTER
   No artwork exists yet, so each card gets a deterministic dark
   treatment from live.css rather than a grey "missing image" box.
   Swap `.poster--n` for a real background-image when stills arrive.
   ============================================================ */
function Poster({ n, className = '', children }) {
  return (
    <div className={`poster poster--${n} ${className}`}>
      <span className="poster__grain" aria-hidden="true" />
      <span className="poster__scrim" aria-hidden="true" />
      {children}
    </div>
  )
}

/* Broadcast timecode, ticking once a second. */
function Timecode({ startsAt }) {
  const ref = useRef(null)
  useEffect(() => {
    const tick = () => {
      if (ref.current) ref.current.textContent = elapsedSince(startsAt)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startsAt])
  return (
    <span className="timecode" ref={ref}>
      00:00:00
    </span>
  )
}

/* ============================================================
   STRIP ACCORDION
   ============================================================ */

function StripRail({ items }) {
  const [active, setActive] = useState(0)

  const onKey = useCallback(
    (e, i) => {
      if (e.key === 'ArrowRight') setActive(Math.min(items.length - 1, i + 1))
      if (e.key === 'ArrowLeft') setActive(Math.max(0, i - 1))
    },
    [items.length],
  )

  return (
    <div className="rail" role="list">
      {items.map((ev, i) => (
        <article
          role="listitem"
          key={ev.id}
          className={`strip ${active === i ? 'is-active' : ''}`}
          onMouseEnter={() => setActive(i)}
          onFocus={() => setActive(i)}
          onKeyDown={(e) => onKey(e, i)}
          tabIndex={0}
        >
          <Poster n={ev.poster} className="strip__poster">
            {ev.status === 'live' && (
              <span className="badge badge--live">
                <span className="dot-live" />
                Live
              </span>
            )}
          </Poster>

          {/* Collapsed: the title runs vertically up the strip. */}
          <span className="strip__spine t-micro">{ev.title}</span>

          {/* Expanded: the full card body. */}
          <div className="strip__body">
            <span className="t-micro strip__kicker">{ev.kicker}</span>
            <h3 className="strip__title">{ev.title}</h3>
            <div className="strip__meta">
              <span className="t-micro">{formatDate(ev.startsAt)}</span>
              <span className="strip__sep" />
              <span className="t-micro">{formatTime(ev.startsAt)}</span>
              <span className="strip__sep" />
              <span className="t-micro">{ev.venue}</span>
            </div>
            <div className="strip__status t-micro">
              {ev.status === 'live'
                ? `${formatViewers(ev.viewers)} watching`
                : countdown(ev.startsAt)}
            </div>
          </div>

          <span className="strip__edge" aria-hidden="true" />
        </article>
      ))}
    </div>
  )
}

/* ============================================================
   PAGE
   ============================================================ */

export default function Live() {
  const [muted, setMuted] = useState(true)

  useEffect(() => {
    document.body.classList.add('is-live-route')
    return () => document.body.classList.remove('is-live-route')
  }, [])

  return (
    <main className="live">
      <div className="live__bg" aria-hidden="true" />

      {/* ---------- masthead ---------- */}
      <header className="live__head">
        <div className="live__head-left">
          <h1 className="live__wordmark">
            Live
            <span className="live__wordmark-dot" />
          </h1>
          <p className="t-micro live__strap">
            Cinematics Production — Broadcast Desk
          </p>
        </div>
        <div className="live__head-right">
          <div className="status glass">
            <span className="dot-live" />
            <span className="t-micro">1 stream on air</span>
          </div>
          <div className="status glass">
            <span className="t-micro">Feed</span>
            <span className="status__value">STABLE</span>
          </div>
        </div>
      </header>

      {/* ---------- featured broadcast ---------- */}
      <section className="feature">
        <div className="feature__player">
          <Poster n={FEATURED.poster} className="player__frame">
            {/* slow drift on the poster so the frame reads as a live feed
                rather than a still */}
            <span className="player__drift" aria-hidden="true" />

            <div className="player__top">
              <span className="badge badge--live">
                <span className="dot-live" />
                Live
              </span>
              <span className="badge">
                <Timecode startsAt={FEATURED.startsAt} />
              </span>
              <span className="badge badge--ghost t-micro">
                {formatViewers(FEATURED.viewers)} watching
              </span>
            </div>

            <button type="button" className="player__play" aria-label="Play stream">
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                <path d="M7 4.5v15L20 12z" fill="currentColor" />
              </svg>
            </button>

            <div className="player__bottom glass">
              <div className="player__scrub">
                <span className="player__scrub-fill" />
                <span className="player__scrub-head" />
              </div>
              <div className="player__controls">
                <span className="t-micro player__live">● Live edge</span>
                <div className="player__spacer" />
                <button
                  type="button"
                  className="player__btn t-micro"
                  aria-pressed={!muted}
                  onClick={() => setMuted((m) => !m)}
                >
                  {muted ? 'Unmute' : 'Mute'}
                </button>
                <button type="button" className="player__btn t-micro">
                  Quality · 1080p
                </button>
                <button type="button" className="player__btn t-micro">
                  Full screen
                </button>
              </div>
            </div>
          </Poster>

          <div className="feature__caption">
            <span className="t-micro feature__kicker">{FEATURED.kicker}</span>
            <h2 className="feature__title">{FEATURED.title}</h2>
            <p className="t-body feature__synopsis">{FEATURED.synopsis}</p>
          </div>
        </div>

        {/* ---------- side panel ---------- */}
        <aside className="feature__aside">
          <div className="panel glass">
            <div className="panel__head">
              <span className="t-micro">Broadcast</span>
              <span className="t-micro panel__id">{FEATURED.id.toUpperCase()}</span>
            </div>
            <dl className="panel__rows">
              <div className="panel__row">
                <dt className="t-micro">Status</dt>
                <dd className="panel__live">
                  <span className="dot-live" /> On air
                </dd>
              </div>
              <div className="panel__row">
                <dt className="t-micro">Started</dt>
                <dd>{formatTime(FEATURED.startsAt)}</dd>
              </div>
              <div className="panel__row">
                <dt className="t-micro">Date</dt>
                <dd>{formatDate(FEATURED.startsAt)}</dd>
              </div>
              <div className="panel__row">
                <dt className="t-micro">Venue</dt>
                <dd>{FEATURED.venue}</dd>
              </div>
              <div className="panel__row">
                <dt className="t-micro">Viewers</dt>
                <dd>{formatViewers(FEATURED.viewers)}</dd>
              </div>
            </dl>
            <div className="panel__tags">
              {FEATURED.tags.map((t) => (
                <span className="tag" key={t}>
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="panel glass">
            <div className="panel__head">
              <span className="t-micro">Crew</span>
            </div>
            <dl className="panel__rows">
              {FEATURED.crew.map(([role, name]) => (
                <div className="panel__row" key={role}>
                  <dt className="t-micro">{role}</dt>
                  <dd>{name}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Up next — keeps the rail's schedule reachable without scrolling. */}
          <div className="panel glass">
            <div className="panel__head">
              <span className="t-micro">Up next</span>
            </div>
            <ul className="upnext">
              {EVENTS.filter((e) => e.status === 'upcoming')
                .slice(0, 3)
                .map((ev) => (
                  <li className="upnext__row" key={ev.id}>
                    <Poster n={ev.poster} className="upnext__thumb" />
                    <div className="upnext__meta">
                      <span className="upnext__title">{ev.title}</span>
                      <span className="t-micro">
                        {formatDate(ev.startsAt)} · {formatTime(ev.startsAt)}
                      </span>
                    </div>
                    <span className="t-micro upnext__in">{countdown(ev.startsAt)}</span>
                  </li>
                ))}
            </ul>
          </div>
        </aside>
      </section>

      {/* ---------- schedule rail ---------- */}
      <section className="section">
        <div className="section__head">
          <h2 className="section__title">
            Upcoming <span className="t-thin">&amp; on air</span>
          </h2>
          <span className="t-micro section__count">{EVENTS.length} scheduled</span>
        </div>
        <StripRail items={EVENTS} />
      </section>

      {/* ---------- archive ---------- */}
      <section className="section">
        <div className="section__head">
          <h2 className="section__title">
            Archive <span className="t-thin">— past broadcasts</span>
          </h2>
        </div>
        <div className="grid">
          {ARCHIVE.map((ev) => (
            <article className="card glass glass-interactive" key={ev.id} tabIndex={0}>
              <Poster n={ev.poster} className="card__poster">
                <span className="card__duration t-micro">{ev.duration}</span>
                <span className="card__play" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="14" height="14">
                    <path d="M7 4.5v15L20 12z" fill="currentColor" />
                  </svg>
                </span>
              </Poster>
              <div className="card__body">
                <h3 className="card__title">{ev.title}</h3>
                <div className="card__meta">
                  <span className="t-micro">{formatDate(ev.startsAt)}</span>
                  <span className="strip__sep" />
                  <span className="t-micro">{ev.tags[0]}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ---------- footer ---------- */}
      <footer className="live__foot">
        <div className="live__foot-rule" />
        <div className="live__foot-inner">
          <p className="t-micro">Cinematics Production — NIT Rourkela</p>
          <button type="button" className="live__back t-micro" onClick={() => navigate('home')}>
            ← Back to the instrument
          </button>
        </div>
      </footer>
    </main>
  )
}
