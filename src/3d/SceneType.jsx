/**
 * ============================================================
 * TYPOGRAPHY IN THE SCENE
 * ============================================================
 *
 * The exploded-view copy is not an HTML layer sitting on top of the canvas.
 * It is SDF text rendered inside the 3D scene, so it takes perspective,
 * shares the scene's depth buffer, and is occluded by the components that
 * drift in front of it.
 *
 * The type group billboards on Y only. Full billboarding would flatten the
 * words into stickers; no billboarding at all would leave them edge-on after
 * a 318° orbit. Rotating about Y alone keeps every line readable while the
 * vertical perspective — words above you reading upward, words below reading
 * down — stays intact.
 *
 * The billboard also lags the camera slightly, so the words settle into
 * place a beat after you stop moving instead of being welded to your view.
 */

import { useRef, useMemo, useLayoutEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Line } from '@react-three/drei'
import * as THREE from 'three'
import { stateRef } from './sceneStore'
import { damp, clamp, smoothstep } from '../animations/easing'

import displayFont from '@fontsource/archivo/files/archivo-latin-800-normal.woff'
import monoFont from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff'

/* ---------- content ---------- */

/**
 * Layout.
 *
 * At the closing frame the viewer sits ~9.2 units back at 28°, so the visible
 * field is about ±4.05 horizontally and ±2.29 vertically, and the separated
 * components occupy the middle ±2.6 × ±2.0. Everything below y = −1.6 is
 * covered by the glass bar along the bottom of the page.
 *
 * So the words are placed on a ring *around* the components — corners and
 * edges, nothing in the middle — and the four statements take the four
 * corners so no two lines ever share a region of the frame.
 */
const STATEMENTS = [
  { text: 'WE SHOOT.', pos: [-2.5, 1.62, -0.4], size: 0.34, delay: 0.0 }, // top-left
  { text: 'WE CREATE.', pos: [2.4, -1.28, -0.9], size: 0.34, delay: 0.12 }, // bottom-right
  { text: 'WE TELL', pos: [-2.68, -0.6, 0.85], size: 0.34, delay: 0.24 }, // bottom-left
  { text: 'STORIES.', pos: [-2.68, -0.98, 0.85], size: 0.34, delay: 0.3, accent: true },
]

const DISCIPLINES = [
  { text: 'CINEMATOGRAPHY', pos: [-0.2, 1.7, 0.3], delay: 0.1 }, // top centre
  { text: 'PRODUCTION', pos: [-2.35, 1.72, -1.3], delay: 0.6 },
  { text: 'VFX', pos: [2.55, 1.34, 1.1], delay: 0.4 },
  { text: 'DIRECTION', pos: [2.78, 0.72, -1.2], delay: 0.3 },
  { text: 'STORYTELLING', pos: [2.62, -0.12, 0.65], delay: 0.5 },
  { text: 'EDITING', pos: [-3.05, 0.55, 0.9], delay: 0.2 },
]

/**
 * Technical callouts.
 *
 * Anchors are each part's *exploded* position — its rest position plus its
 * explode vector — multiplied by the rig's closing scale (1.23) and lifted by
 * the rig's closing y offset, so the leader lines land on the components they
 * name once separation finishes rather than pointing at empty space.
 *
 * Two, not eight. Every extra label competes with the four statements for
 * the same ring of clear frame, and an engineering drawing that names
 * everything names nothing.
 */
const S = 1.23
const LIFT = 0.06
const at = (x, y, z) => [x * S, y * S + LIFT, z * S]

const CALLOUTS = [
  {
    label: 'IMAGE SENSOR',
    spec: '26.1 MP · SUPER-35 EXMOR R',
    anchor: at(-0.12, 0.16, 0.24),
    to: [1.15, 1.12, 0.5],
    delay: 0.0,
  },
  {
    label: 'BIONZ XR',
    spec: 'S-CINETONE PIPELINE',
    anchor: at(-0.56, 0.48, -1.39),
    to: [-1.35, 1.18, -1.7],
    delay: 0.2,
    flip: true,
  },
]

/* ============================================================
   PRIMITIVES
   ============================================================ */

function FadeText({
  children,
  font,
  size,
  color,
  position,
  delay,
  letterSpacing = 0,
  anchorX = 'center',
  maxWidth,
  weightKey,
  registry,
}) {
  const mat = useRef()
  const grp = useRef()
  void weightKey

  useLayoutEffect(() => {
    const entry = { mat, grp, delay, basePos: position }
    const reg = registry.current
    reg.push(entry)
    return () => {
      const i = reg.indexOf(entry)
      if (i > -1) reg.splice(i, 1)
    }
  }, [registry, delay, position])

  return (
    <group ref={grp} position={position}>
      <Text
        font={font}
        fontSize={size}
        anchorX={anchorX}
        anchorY="middle"
        letterSpacing={letterSpacing}
        maxWidth={maxWidth}
        outlineWidth={0}
      >
        {children}
        <meshBasicMaterial
          ref={mat}
          color={color}
          transparent
          opacity={0}
          toneMapped={false}
          depthWrite={false}
        />
      </Text>
    </group>
  )
}

function Callout({ item, registry }) {
  const mat = useRef()
  const specMat = useRef()
  const lineRef = useRef()
  const dotMat = useRef()
  const grp = useRef()

  const points = useMemo(() => {
    const a = new THREE.Vector3(...item.anchor)
    const b = new THREE.Vector3(...item.to)
    // A single elbow — the convention of an engineering drawing.
    const elbow = new THREE.Vector3(b.x, b.y, a.z + (b.z - a.z) * 0.45)
    const tail = new THREE.Vector3(b.x + (item.flip ? -0.42 : 0.42), b.y, elbow.z)
    return [a, elbow, tail]
  }, [item])

  useLayoutEffect(() => {
    const entry = { mat, specMat, lineRef, dotMat, grp, delay: item.delay, callout: true }
    const reg = registry.current
    reg.push(entry)
    return () => {
      const i = reg.indexOf(entry)
      if (i > -1) reg.splice(i, 1)
    }
  }, [registry, item])

  const textX = points[2].x + (item.flip ? -0.08 : 0.08)

  return (
    <group ref={grp}>
      <mesh position={item.anchor}>
        <sphereGeometry args={[0.022, 10, 8]} />
        <meshBasicMaterial ref={dotMat} color="#d7192f" transparent opacity={0} toneMapped={false} />
      </mesh>
      <Line
        ref={lineRef}
        points={points}
        color="#d7192f"
        lineWidth={1}
        transparent
        opacity={0}
        toneMapped={false}
        depthWrite={false}
      />
      <Text
        font={monoFont}
        fontSize={0.085}
        anchorX={item.flip ? 'right' : 'left'}
        anchorY="bottom"
        letterSpacing={0.14}
        position={[textX, points[2].y + 0.03, points[2].z]}
      >
        {item.label}
        <meshBasicMaterial ref={mat} color="#f4f2f0" transparent opacity={0} toneMapped={false} depthWrite={false} />
      </Text>
      <Text
        font={monoFont}
        fontSize={0.055}
        anchorX={item.flip ? 'right' : 'left'}
        anchorY="top"
        letterSpacing={0.18}
        position={[textX, points[2].y - 0.03, points[2].z]}
      >
        {item.spec}
        <meshBasicMaterial ref={specMat} color="#8a8785" transparent opacity={0} toneMapped={false} depthWrite={false} />
      </Text>
    </group>
  )
}

/* ============================================================
   THE TYPE LAYER
   ============================================================ */

export default function SceneType({ tier = 'desktop' }) {
  const billboard = useRef()
  const statementReg = useRef([])
  const disciplineReg = useRef([])
  const calloutReg = useRef([])

  const showCallouts = tier !== 'low'

  useFrame(({ camera }, dt) => {
    const s = stateRef.current
    if (!s || !billboard.current) return
    const d = Math.min(dt, 0.05)

    // Y-only billboard, damped so the type settles behind the camera move.
    const target = Math.atan2(
      camera.position.x - billboard.current.position.x,
      camera.position.z - billboard.current.position.z,
    )
    let cur = billboard.current.rotation.y
    // shortest angular path
    let diff = target - cur
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    billboard.current.rotation.y = damp(cur, cur + diff, 3.2, d)

    const base = s.ui.explodeCopy

    const applyStagger = (entry, amount, spread) => {
      const start = entry.delay * spread
      return smoothstep(clamp((amount - start) / Math.max(0.001, 1 - start)))
    }

    for (const e of statementReg.current) {
      const o = applyStagger(e, base, 0.45)
      if (e.mat.current) e.mat.current.opacity = o
      if (e.grp.current) {
        // a short rise as each line resolves
        e.grp.current.position.y = e.basePos[1] - (1 - o) * 0.14
      }
    }
    for (const e of disciplineReg.current) {
      const o = applyStagger(e, base, 0.7) * 0.9
      if (e.mat.current) e.mat.current.opacity = o
      if (e.grp.current) e.grp.current.position.y = e.basePos[1] - (1 - o) * 0.1
    }

    const co = s.callouts
    for (const e of calloutReg.current) {
      const o = applyStagger(e, co, 0.6)
      if (e.mat.current) e.mat.current.opacity = o
      if (e.specMat.current) e.specMat.current.opacity = o * 0.75
      if (e.dotMat.current) e.dotMat.current.opacity = o
      if (e.lineRef.current?.material) e.lineRef.current.material.opacity = o * 0.6
    }
  })

  return (
    <group ref={billboard} name="scene-type">
      {STATEMENTS.map((s) => (
        <FadeText
          key={s.text + s.pos[1]}
          font={displayFont}
          size={s.size}
          color={s.accent ? '#d7192f' : '#f4f2f0'}
          position={s.pos}
          delay={s.delay}
          letterSpacing={-0.03}
          registry={statementReg}
        >
          {s.text}
        </FadeText>
      ))}

      {DISCIPLINES.map((d) => (
        <FadeText
          key={d.text}
          font={monoFont}
          size={0.088}
          color="#a8a6a4"
          position={d.pos}
          delay={d.delay}
          letterSpacing={0.24}
          registry={disciplineReg}
        >
          {d.text}
        </FadeText>
      ))}

      {showCallouts &&
        CALLOUTS.map((c) => <Callout key={c.label} item={c} registry={calloutReg} />)}
    </group>
  )
}
