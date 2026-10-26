/**
 * ============================================================
 * CINEMATIC LIGHTING
 * ============================================================
 *
 * Not generic white studio lighting. The setup is a real one:
 *
 *   KEY    soft neutral, high and camera-left, slightly warm
 *   RIM    deep cinematic red, low and almost directly behind — placed to
 *          graze the silhouette's edges. Swung round toward the side it
 *          floods whole panels instead, and the body stops reading as black
 *   FILL   very dark, cool, just enough to keep shadow detail alive
 *   KICK   a narrow specular from above to catch machined metal edges
 *
 * The rim is world-fixed. During the 270° orbit the viewer travels around a
 * stationary light, so the red rakes across the body and moves from edge to
 * edge — which is the thing that makes it read as a physical object in a
 * lit room rather than a model spinning on a turntable.
 *
 * Reflections come from procedural Lightformers, not an HDRI file. No
 * network request, nothing to preload, and full control over where the
 * highlights land on the metal.
 */

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import { damp } from '../animations/easing'

export default function Lighting({ stateRef, tier = 'desktop' }) {
  const key = useRef()
  const rim = useRef()
  const rimBack = useRef()
  const kick = useRef()

  const hi = tier === 'desktop'

  useFrame((_, dt) => {
    const s = stateRef.current
    if (!s) return
    const d = Math.min(dt, 0.05)
    if (key.current) key.current.intensity = damp(key.current.intensity, 4.2 * s.keyIntensity, 6, d)
    if (rim.current) rim.current.intensity = damp(rim.current.intensity, 0.8 * s.redRim, 6, d)
    if (rimBack.current) rimBack.current.intensity = damp(rimBack.current.intensity, 0.34 * s.redRim, 6, d)
    if (kick.current) kick.current.intensity = damp(kick.current.intensity, 2.1 * s.keyIntensity, 6, d)
  })

  return (
    <>
      {/* Deep ambient — barely there. The scene must stay 70% black. */}
      <ambientLight intensity={0.24} color="#93989d" />

      {/* KEY — soft neutral, camera-left and high */}
      <directionalLight
        ref={key}
        position={[-4.2, 5.4, 4.6]}
        intensity={2.6}
        color="#fbf7f4"
        castShadow={hi}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.5}
        shadow-camera-far={22}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
        shadow-bias={-0.0012}
        shadow-normalBias={0.022}
      />

      {/* RED RIM — a single source, low and behind camera-right.
          One rim, not two: a second red light from the opposite side puts a
          red edge on every silhouette at once, which stops reading as
          lighting and starts reading as a neon outline. */}
      <directionalLight
        ref={rim}
        position={[2.6, -1.0, -6.4]}
        intensity={0.8}
        color="#d7192f"
      />
      {/* barely-there burgundy bounce, so the shadow side is not dead black */}
      <directionalLight
        ref={rimBack}
        position={[-5.2, 1.4, -4.8]}
        intensity={0.34}
        color="#680b12"
      />

      {/* KICK — narrow top specular for machined metal edges */}
      <spotLight
        ref={kick}
        position={[0.6, 6.2, 1.2]}
        angle={0.42}
        penumbra={0.9}
        intensity={2.1}
        distance={16}
        color="#e8eef4"
      />

      {/* FILL — cool, very dark, keeps the shadow side from going to mud */}
      <directionalLight position={[2.4, -3.2, 3.0]} intensity={0.5} color="#3a4756" />

      {/* Procedural reflection environment. frames={1} bakes it once. */}
      <Environment resolution={hi ? 256 : 128} frames={1}>
        <color attach="background" args={['#050505']} />
        {/* large soft key panel */}
        <Lightformer
          form="rect"
          intensity={3.6}
          color="#ffffff"
          scale={[9, 6, 1]}
          position={[-5, 4, 4]}
          target={[0, 0, 0]}
        />
        {/* long thin strip — the highlight that runs along the lens barrel */}
        <Lightformer
          form="rect"
          intensity={4.4}
          color="#e6edf5"
          scale={[0.6, 9, 1]}
          position={[3.4, 1.6, 3.2]}
          target={[0, 0, 0]}
        />
        {/* red environment wash from behind — kept low. This is a reflection
            source, and metal picks reflections up fast. */}
        <Lightformer
          form="rect"
          intensity={0.55}
          color="#d7192f"
          scale={[7, 4, 1]}
          position={[4.5, -1.2, -5]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="rect"
          intensity={0.4}
          color="#680b12"
          scale={[6, 4, 1]}
          position={[-4.5, 0.6, -5]}
          target={[0, 0, 0]}
        />
        {/* ceiling bounce */}
        <Lightformer
          form="ring"
          intensity={1.1}
          color="#9fb0c4"
          scale={[4, 4, 1]}
          position={[0, 6, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          target={[0, 0, 0]}
        />
      </Environment>
    </>
  )
}

/* ============================================================
   ATMOSPHERIC GLOW POOL
   A single additive billboard behind the rig. This is where the
   "red light naturally illuminating the scene" comes from — it sits in
   3D space and is occluded by the equipment, so it reads as depth rather
   than as a CSS gradient pasted over the canvas.
   ============================================================ */

function radialTexture(inner, outer) {
  const size = 256
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, inner)
  g.addColorStop(0.45, outer)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function GlowPool({ stateRef }) {
  const mat = useRef()
  const grp = useRef()

  const texture = useMemo(
    () => radialTexture('rgba(215,25,47,0.8)', 'rgba(104,11,18,0.22)'),
    [],
  )

  useFrame(({ camera }, dt) => {
    const s = stateRef.current
    if (!s || !mat.current || !grp.current) return
    mat.current.opacity = damp(mat.current.opacity, 0.15 * s.bloomPool, 4, Math.min(dt, 0.05))
    // Billboard, but pushed behind the rig along the view axis so the
    // equipment always occludes the brightest part of the pool.
    grp.current.quaternion.copy(camera.quaternion)
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
    grp.current.position.copy(dir.multiplyScalar(2.6))
  })

  return (
    <group ref={grp}>
      <mesh>
        <planeGeometry args={[6.4, 4.6]} />
        <meshBasicMaterial
          ref={mat}
          map={texture}
          transparent
          opacity={0.2}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}
