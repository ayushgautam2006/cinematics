/**
 * ============================================================
 * LIVE PAGE CONTENT — PLACEHOLDER DATA
 * ============================================================
 *
 * Everything the Live page renders comes from this one file. Replace the
 * values and the page updates; no component needs touching.
 *
 * All copy is deliberately neutral (EVENT_TITLE_01, VENUE_NAME) so nothing
 * reads as a real Cinematics Production event until you fill it in.
 *
 * FIELD REFERENCE
 *   id          unique key
 *   status      'live' | 'upcoming' | 'archive'
 *   title       display title
 *   kicker      small label above the title
 *   synopsis    one or two sentences
 *   venue       location string
 *   startsAt    ISO 8601 — drives the countdown and the date chips
 *   viewers     integer, shown only when status === 'live'
 *   duration    'HH:MM:SS' for archive items
 *   poster      1–8, selects one of the procedural poster treatments in
 *               live.css. Swap `.poster--n` for a real background-image
 *               (or add a `image` field and render it) when artwork exists.
 *   tags        short strings shown as metadata
 */

/**
 * The featured broadcast is anchored to page load rather than to a fixed
 * timestamp, so the on-air timecode always shows a running stream instead of
 * 00:00:00. Replace with a real ISO string — everything downstream expects
 * one and will behave identically.
 */
const STARTED_AGO_MINUTES = 154
const LIVE_SINCE = new Date(Date.now() - STARTED_AGO_MINUTES * 60_000).toISOString()

export const FEATURED = {
  id: 'evt-live-01',
  status: 'live',
  kicker: 'BROADCASTING NOW',
  title: 'EVENT_TITLE_01',
  synopsis:
    'LOREM_SYNOPSIS — one or two sentences describing the broadcast, the people in it and why someone should stay. Replace with the real event description.',
  venue: 'VENUE_NAME',
  startsAt: LIVE_SINCE,
  viewers: 1284,
  poster: 1,
  tags: ['MULTI-CAM', '1080P60', 'LIVE MIX'],
  crew: [
    ['Direction', 'CREW_NAME_01'],
    ['Camera', 'CREW_NAME_02'],
    ['Vision Mix', 'CREW_NAME_03'],
    ['Sound', 'CREW_NAME_04'],
  ],
}

export const EVENTS = [
  {
    id: 'evt-02',
    status: 'live',
    title: 'EVENT_TITLE_02',
    kicker: 'STAGE B',
    startsAt: '2026-08-23T19:00:00+05:30',
    venue: 'VENUE_NAME',
    viewers: 412,
    poster: 2,
    tags: ['SINGLE CAM'],
  },
  {
    id: 'evt-03',
    status: 'upcoming',
    title: 'EVENT_TITLE_03',
    kicker: 'SCHEDULED',
    startsAt: '2026-08-25T17:00:00+05:30',
    venue: 'VENUE_NAME',
    poster: 3,
    tags: ['MULTI-CAM'],
  },
  {
    id: 'evt-04',
    status: 'upcoming',
    title: 'EVENT_TITLE_04',
    kicker: 'SCHEDULED',
    startsAt: '2026-08-27T20:15:00+05:30',
    venue: 'VENUE_NAME',
    poster: 4,
    tags: ['DRONE'],
  },
  {
    id: 'evt-05',
    status: 'upcoming',
    title: 'EVENT_TITLE_05',
    kicker: 'SCHEDULED',
    startsAt: '2026-09-01T16:45:00+05:30',
    venue: 'VENUE_NAME',
    poster: 5,
    tags: ['STUDIO'],
  },
  {
    id: 'evt-06',
    status: 'upcoming',
    title: 'EVENT_TITLE_06',
    kicker: 'SCHEDULED',
    startsAt: '2026-09-04T18:00:00+05:30',
    venue: 'VENUE_NAME',
    poster: 6,
    tags: ['MULTI-CAM'],
  },
  {
    id: 'evt-07',
    status: 'upcoming',
    title: 'EVENT_TITLE_07',
    kicker: 'SCHEDULED',
    startsAt: '2026-09-09T19:30:00+05:30',
    venue: 'VENUE_NAME',
    poster: 7,
    tags: ['LIVE MIX'],
  },
]

export const ARCHIVE = [
  {
    id: 'arc-01',
    status: 'archive',
    title: 'ARCHIVE_TITLE_01',
    startsAt: '2026-07-18T18:00:00+05:30',
    duration: '01:42:06',
    poster: 8,
    tags: ['FILM'],
  },
  {
    id: 'arc-02',
    status: 'archive',
    title: 'ARCHIVE_TITLE_02',
    startsAt: '2026-06-30T20:00:00+05:30',
    duration: '00:58:20',
    poster: 3,
    tags: ['DOC'],
  },
  {
    id: 'arc-03',
    status: 'archive',
    title: 'ARCHIVE_TITLE_03',
    startsAt: '2026-06-11T17:30:00+05:30',
    duration: '02:11:44',
    poster: 5,
    tags: ['STAGE'],
  },
  {
    id: 'arc-04',
    status: 'archive',
    title: 'ARCHIVE_TITLE_04',
    startsAt: '2026-05-24T19:15:00+05:30',
    duration: '00:36:12',
    poster: 2,
    tags: ['SHORT'],
  },
  {
    id: 'arc-05',
    status: 'archive',
    title: 'ARCHIVE_TITLE_05',
    startsAt: '2026-04-29T18:40:00+05:30',
    duration: '01:14:58',
    poster: 7,
    tags: ['LIVE'],
  },
  {
    id: 'arc-06',
    status: 'archive',
    title: 'ARCHIVE_TITLE_06',
    startsAt: '2026-04-02T17:10:00+05:30',
    duration: '00:22:31',
    poster: 6,
    tags: ['TEASER'],
  },
]

/* ---------- formatting helpers ---------- */

export function formatDate(iso) {
  const d = new Date(iso)
  return d
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
    .toUpperCase()
}

export function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatViewers(n) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n)
}

/** Elapsed HH:MM:SS since the stream started — the broadcast timecode. */
export function elapsedSince(iso, now = Date.now()) {
  const start = new Date(iso).getTime()
  let s = Math.max(0, Math.floor((now - start) / 1000))
  const h = Math.floor(s / 3600)
  s -= h * 3600
  const m = Math.floor(s / 60)
  s -= m * 60
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
}

/** Days / hours until an upcoming broadcast. */
export function countdown(iso, now = Date.now()) {
  const diff = new Date(iso).getTime() - now
  if (diff <= 0) return 'STARTING'
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  if (days > 0) return `IN ${days}D ${hours}H`
  const mins = Math.floor((diff % 3600000) / 60000)
  return `IN ${hours}H ${String(mins).padStart(2, '0')}M`
}
