/**
 * A two-route hash router.
 *
 * Hash routing rather than history routing on purpose: the built site has to
 * work from a static host, from `file://`, and from inside a single-file
 * bundle, none of which can serve a rewrite rule for `/live`.
 */

import { useEffect, useState, useCallback } from 'react'

export const ROUTES = [
  { id: 'home', label: 'Home', meta: 'The Instrument', path: '#/' },
  { id: 'live', label: 'Live', meta: 'Broadcast', path: '#/live' },
]

export function currentRoute() {
  const h = (typeof window !== 'undefined' ? window.location.hash : '') || '#/'
  if (h.startsWith('#/live')) return 'live'
  return 'home'
}

export function navigate(id) {
  const r = ROUTES.find((x) => x.id === id) ?? ROUTES[0]
  if (window.location.hash === r.path) return
  window.location.hash = r.path
}

export function useRoute() {
  const [route, setRoute] = useState(currentRoute)

  const sync = useCallback(() => setRoute(currentRoute()), [])

  useEffect(() => {
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [sync])

  return route
}
