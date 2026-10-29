import { useState, useEffect, lazy, Suspense, useCallback } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { ScrollProvider } from './animations/scroll'
import { useRoute } from './components/router'
import Nav from './components/Nav'
import LoadingScreen from './components/LoadingScreen'
import Home from './pages/Home'
import './styles/global.css'

/* The Live page carries its own layout and imagery and is never needed for
   the first paint, so it is split out of the initial bundle. */
const Live = lazy(() => import('./pages/Live'))

function Atmosphere() {
  return (
    <>
      <div className="atmos atmos-matte" aria-hidden="true" />
      <div className="atmos atmos-vignette" aria-hidden="true" />
      <div className="atmos atmos-grain" aria-hidden="true" />
    </>
  )
}

export default function App() {
  const route = useRoute()
  const [sceneReady, setSceneReady] = useState(false)

  const onReady = useCallback(() => setSceneReady(true), [])

  /* Every route change starts at the top. On Home that also means the
     sequence starts at its opening frame rather than mid-move. */
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [route])

  /* If WebGL never comes up — blocked, software-rendered, an ancient GPU, an
     embed that disallows it — the loader must not trap the visitor behind it.
     3.5s: long enough for a real context to initialise, short enough that a
     failure reads as a slow load rather than a hang. */
  useEffect(() => {
    const t = setTimeout(() => setSceneReady(true), 3500)
    return () => clearTimeout(t)
  }, [])

  return (
    <ScrollProvider>
      <Nav />

      {route === 'live' ? (
        <Suspense fallback={<div className="route-fallback" />}>
          <Live />
        </Suspense>
      ) : (
        <Home onSceneReady={onReady} />
      )}

      <Atmosphere />
      <LoadingScreen ready={sceneReady || route === 'live'} />
      <Analytics />
    </ScrollProvider>
  )
}
