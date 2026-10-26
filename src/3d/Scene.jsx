/**
 * The WebGL stage.
 *
 * One fixed, full-viewport canvas sits behind the whole Home page. Sections
 * scroll over it; the scene never unmounts and never restarts. That is what
 * lets the sequence read as one continuous camera move rather than a series
 * of section animations.
 */

import { Suspense, useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { AdaptiveDpr, ContactShadows, Preload } from '@react-three/drei'
import * as THREE from 'three'

import Lighting, { GlowPool } from './Lighting'
import Rig from './Rig'
import SceneType from './SceneType'
import { useMaterials } from './materials'
import { stateRef } from './sceneStore'
import { damp } from '../animations/easing'

/* ============================================================
   THE VIEWER
   The three.js camera orbits; the object does not spin in place.
   World-fixed lighting then rakes across the body as you travel,
   which is what makes it feel like moving around a physical object.
   ============================================================ */

function Viewer() {
  const { camera } = useThree()
  const cur = useRef({ az: 0, el: 0.02, r: 6 })
  const target = useMemo(() => new THREE.Vector3(0, 0, 0), [])

  useFrame((_, dt) => {
    const s = stateRef.current
    if (!s) return
    const d = Math.min(dt, 0.05)
    const c = cur.current

    c.az = damp(c.az, s.orbit.azimuth, 6, d)
    c.el = damp(c.el, s.orbit.elevation, 6, d)
    c.r = damp(c.r, s.orbit.radius, 5.5, d)

    const cosEl = Math.cos(c.el)
    camera.position.set(
      c.r * Math.sin(c.az) * cosEl,
      c.r * Math.sin(c.el),
      c.r * Math.cos(c.az) * cosEl,
    )

    // Look slightly above centre early on so the hero composition sits low in
    // frame with air above it; level out as the sequence progresses.
    target.set(0, 0.1 * (1 - Math.min(1, s.p / 0.4)), 0)
    camera.lookAt(target)
  })

  return null
}

/* Fades the grounding shadow away once the rig leaves the "product on a
   surface" register and becomes something you orbit in open space. */
function Grounding() {
  const grp = useRef()
  const mat = useRef(null)

  useFrame((_, dt) => {
    const s = stateRef.current
    if (!s || !grp.current) return
    if (!mat.current) {
      grp.current.traverse((o) => {
        if (o.isMesh && o.material && 'opacity' in o.material) mat.current = o.material
      })
      if (!mat.current) return
    }
    const want = 0.62 * (1 - Math.min(1, Math.max(0, (s.p - 0.5) / 0.22)))
    mat.current.opacity = damp(mat.current.opacity, want, 4, Math.min(dt, 0.05))
  })

  return (
    <group ref={grp}>
      <ContactShadows
        position={[0, -1.05, 0]}
        opacity={0.62}
        scale={9}
        blur={2.9}
        far={2.6}
        resolution={512}
        color="#000000"
      />
    </group>
  )
}

function SceneContents({ tier }) {
  const materials = useMaterials(tier)
  const hi = tier === 'desktop'

  return (
    <>
      <fog attach="fog" args={['#050505', 7.5, 21]} />
      <Viewer />
      <Lighting stateRef={stateRef} tier={tier} />
      <GlowPool stateRef={stateRef} />
      <Rig materials={materials} tier={tier} />
      <SceneType tier={tier} />
      {hi && <Grounding />}
      <Preload all />
    </>
  )
}

/* 28° — a long lens. Flattens perspective the way a product shot does, and
   stops the body skewing when it sits off the view axis. */
const CAM = { position: [0, 0, 6], fov: 28, near: 0.1, far: 60 }

/** One probe, cached. A page that cannot render the scene should say so
 *  rather than showing an empty black stage and a dead scrollbar. */
let webglSupport = null
export function hasWebGL() {
  if (webglSupport !== null) return webglSupport
  try {
    const c = document.createElement('canvas')
    webglSupport = !!(
      window.WebGLRenderingContext &&
      (c.getContext('webgl2') || c.getContext('webgl'))
    )
  } catch {
    webglSupport = false
  }
  return webglSupport
}

export default function Scene({ tier = 'desktop', onReady }) {
  const dpr = tier === 'desktop' ? [1, 2] : tier === 'mid' ? [1, 1.6] : [1, 1.35]

  if (!hasWebGL()) {
    onReady?.()
    return (
      <div className="no-webgl">
        <p className="t-micro">3D unavailable</p>
        <p className="t-body">
          This browser can&rsquo;t open a WebGL context, so the camera sequence
          can&rsquo;t run. The rest of the site works — try a different browser,
          or enable hardware acceleration.
        </p>
      </div>
    )
  }

  return (
    <Canvas
      className="scene-canvas"
      dpr={dpr}
      shadows={tier === 'desktop' ? 'soft' : false}
      frameloop="always"
      gl={{
        antialias: tier !== 'low',
        alpha: true,
        powerPreference: 'high-performance',
        stencil: false,
        depth: true,
      }}
      camera={CAM}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.16
        scene.background = null
        onReady?.()
      }}
    >
      <Suspense fallback={null}>
        <SceneContents tier={tier} />
      </Suspense>
      {tier !== 'desktop' && <AdaptiveDpr pixelated />}
    </Canvas>
  )
}

/** Keeps the canvas sized to the visual viewport on mobile browsers whose
 *  toolbars change the viewport height mid-scroll. */
export function useViewportUnit() {
  useEffect(() => {
    const set = () => {
      document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`)
    }
    set()
    window.addEventListener('resize', set)
    window.addEventListener('orientationchange', set)
    return () => {
      window.removeEventListener('resize', set)
      window.removeEventListener('orientationchange', set)
    }
  }, [])
}
