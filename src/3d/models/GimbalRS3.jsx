/**
 * ============================================================
 * DJI RS 3 MINI — PROCEDURAL GIMBAL RIG
 * ============================================================
 *
 * Three-axis stabiliser, authored as separable assemblies so the mount can be
 * staged rather than cross-faded. The brief is explicit that the camera must
 * not simply dissolve into the gimbal — so each assembly travels in along the
 * axis it would actually be fitted from:
 *
 *   1. handle + pan motor rise from below
 *   2. the roll arm swings in from outboard
 *   3. the tilt arm extends toward the camera's left flank
 *   4. the quick-release plate rises last and locks onto the base plate
 *
 * `assemble` (0 → 1) drives that sequence. `explode` pushes the whole rig
 * back out of frame during the anatomy section so the camera's interior is
 * the only subject left on screen.
 *
 * Axis convention matches the FX30: +Z is the lens direction, +X is the grip
 * side, so the gimbal hangs off the camera's left flank as it does in life.
 */

import { forwardRef, useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { easeMech, easeInCubic, clamp } from '../../animations/easing'

/** Underside of the FX30 base plate — where the quick-release meets it. */
const BASE_Y = -0.39

/* ============================================================
   ASSEMBLY REGISTRY
   ============================================================
     id       stable identifier for the swap contract
     label    shown on technical callouts
     entry    offset the assembly travels in from (rest + entry at assemble 0)
     delay    0..1 stagger within the mount sequence
     ex       explode vector for the anatomy section
   ============================================================ */

export const RS3_PARTS = [
  {
    id: 'handle',
    label: 'Grip / Battery',
    spec: 'Built-in cell · 10 h',
    entry: [0, -1.5, 0],
    delay: 0.0,
    ex: [-0.5, -2.4, 0],
    node: (M) => (
      <group position={[-0.34, -2.02, 0.02]}>
        <RoundedBox args={[0.3, 0.72, 0.28]} radius={0.06} smoothness={4} material={M.shell} />
        {/* textured flank */}
        <RoundedBox
          args={[0.315, 0.5, 0.2]}
          radius={0.05}
          smoothness={3}
          position={[0, -0.06, 0]}
          material={M.rubber}
        />
        {/* status screen */}
        <mesh position={[0, 0.16, 0.142]} material={M.screen}>
          <planeGeometry args={[0.19, 0.15]} />
        </mesh>
        {/* record trigger */}
        <mesh position={[0, 0.02, 0.148]} material={M.tally}>
          <circleGeometry args={[0.026, 16]} />
        </mesh>
        {/* base cap */}
        <mesh position={[0, -0.38, 0]} material={M.metalDark}>
          <cylinderGeometry args={[0.1, 0.11, 0.05, 20]} />
        </mesh>
      </group>
    ),
  },
  {
    id: 'pan_motor',
    label: 'Pan Motor',
    spec: 'Axis 1 · 360° continuous',
    entry: [0, -1.15, 0],
    delay: 0.08,
    ex: [-0.7, -1.7, -0.2],
    node: (M) => (
      <group position={[-0.34, -1.55, 0.02]}>
        <mesh material={M.shell}>
          <cylinderGeometry args={[0.17, 0.17, 0.24, 28]} />
        </mesh>
        <mesh position={[0, 0.125, 0]} material={M.metalDark}>
          <cylinderGeometry args={[0.13, 0.13, 0.03, 24]} />
        </mesh>
        {/* axis indicator */}
        <mesh position={[0, 0.02, 0.171]} material={M.tally}>
          <circleGeometry args={[0.012, 12]} />
        </mesh>
      </group>
    ),
  },
  {
    id: 'roll_arm',
    label: 'Roll Arm',
    spec: 'Axis 2 · locking hinge',
    entry: [-1.3, -0.4, 0],
    delay: 0.2,
    ex: [-1.6, -0.9, 0.1],
    node: (M) => (
      <group>
        {/* Angled arm running from the pan motor at (-0.34, -1.55) up to the
            roll motor at (-0.95, -0.92). Position is the midpoint of that
            span and the rotation is its bearing, so both ends actually meet
            their motors instead of floating near them. */}
        <mesh position={[-0.645, -1.235, 0.02]} rotation={[0, 0, 0.77]} material={M.shell}>
          <boxGeometry args={[0.16, 0.95, 0.18]} />
        </mesh>
        <mesh position={[-0.95, -0.92, 0.02]} rotation={[0, 0, 0]} material={M.shell}>
          <cylinderGeometry args={[0.15, 0.15, 0.22, 26]} />
        </mesh>
        <mesh
          position={[-0.95, -0.92, 0.14]}
          rotation={[Math.PI / 2, 0, 0]}
          material={M.metalDark}
        >
          <cylinderGeometry args={[0.115, 0.115, 0.03, 22]} />
        </mesh>
      </group>
    ),
  },
  {
    id: 'tilt_arm',
    label: 'Tilt Arm',
    spec: 'Axis 3 · counterweighted',
    entry: [-1.0, 0.2, 0],
    delay: 0.34,
    ex: [-1.5, 0.3, -0.3],
    node: (M) => (
      <group>
        {/* vertical riser */}
        <mesh position={[-0.95, -0.6, 0.02]} material={M.shell}>
          <boxGeometry args={[0.15, 0.5, 0.17]} />
        </mesh>
        {/* tilt motor at the camera's left flank */}
        <mesh
          position={[-0.92, -0.34, 0.02]}
          rotation={[0, 0, Math.PI / 2]}
          material={M.shell}
        >
          <cylinderGeometry args={[0.155, 0.155, 0.22, 26]} />
        </mesh>
        <mesh
          position={[-0.8, -0.34, 0.02]}
          rotation={[0, 0, Math.PI / 2]}
          material={M.metalDark}
        >
          <cylinderGeometry args={[0.12, 0.12, 0.035, 22]} />
        </mesh>
        {/* arm running under the camera toward the plate */}
        <mesh position={[-0.47, -0.46, 0.02]} material={M.shell}>
          <boxGeometry args={[0.7, 0.1, 0.16]} />
        </mesh>
      </group>
    ),
  },
  {
    id: 'qr_plate',
    label: 'Quick-Release Plate',
    spec: 'Arca-Swiss · anti-twist',
    // Rises last and closes onto the camera base — the moment the two
    // objects become one.
    entry: [0, -0.42, -0.12],
    delay: 0.58,
    ex: [0, -1.3, 0.2],
    node: (M) => (
      <group position={[0, BASE_Y - 0.055, 0.01]}>
        <RoundedBox args={[0.46, 0.05, 0.82]} radius={0.012} smoothness={3} material={M.metalDark} />
        {/* dovetail rails */}
        <mesh position={[-0.23, -0.04, 0]} material={M.metal}>
          <boxGeometry args={[0.04, 0.045, 0.8]} />
        </mesh>
        <mesh position={[0.23, -0.04, 0]} material={M.metal}>
          <boxGeometry args={[0.04, 0.045, 0.8]} />
        </mesh>
        {/* locking knob */}
        <mesh
          position={[0.24, -0.03, 0.34]}
          rotation={[0, 0, Math.PI / 2]}
          material={M.metal}
        >
          <cylinderGeometry args={[0.05, 0.05, 0.06, 18]} />
        </mesh>
        {/* mounting screw into the camera's 1/4-20 */}
        <mesh position={[-0.12, 0.03, 0]} material={M.metal}>
          <cylinderGeometry args={[0.032, 0.032, 0.05, 16]} />
        </mesh>
      </group>
    ),
  },
]

/* ============================================================
   THE COMPONENT
   ============================================================ */

function entryProgress(assemble, delay) {
  const span = 0.55
  const start = delay * span
  return easeMech(clamp((assemble - start) / (1 - start)))
}

const GimbalRS3 = forwardRef(function GimbalRS3(
  { materials: M, assembleRef, explodeRef, tier = 'desktop' },
  ref,
) {
  const groupRefs = useRef([])
  const parts = useMemo(() => RS3_PARTS, [])
  void tier

  useFrame(() => {
    const a = assembleRef?.current ?? 0
    const e = explodeRef?.current ?? 0
    for (let i = 0; i < parts.length; i++) {
      const g = groupRefs.current[i]
      if (!g) continue
      const part = parts[i]
      const t = entryProgress(a, part.delay)
      const ee = easeInCubic(e)

      // Travel in along the entry vector, then travel out along the explode
      // vector once the anatomy section takes over.
      g.position.set(
        part.entry[0] * (1 - t) + part.ex[0] * ee,
        part.entry[1] * (1 - t) + part.ex[1] * ee,
        part.entry[2] * (1 - t) + part.ex[2] * ee,
      )
      // Arms swing into alignment rather than sliding in flat.
      const swing = (1 - t) * 0.5
      g.rotation.set(0, 0, part.id === 'roll_arm' || part.id === 'tilt_arm' ? -swing : 0)
    }
  })

  return (
    <group ref={ref} name="rs3mini">
      {parts.map((part, i) => (
        <group key={part.id} name={part.id} ref={(el) => (groupRefs.current[i] = el)}>
          {part.node(M)}
        </group>
      ))}
    </group>
  )
})

export default GimbalRS3
