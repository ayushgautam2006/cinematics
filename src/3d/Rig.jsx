/**
 * THE RIG — camera and gimbal as one addressable assembly.
 *
 * Reads the master timeline state and damps toward it every frame. The
 * damping is the point: the object is always chasing its target rather than
 * being snapped to it, which is what gives the motion physical weight. A rig
 * assigned its transform directly tracks the scrollbar perfectly and feels
 * like a slider; a rig that damps feels like mass on a fluid head.
 */

import { useRef, useEffect, useLayoutEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { CameraModel, GimbalModel } from './models'
import { useClonedMaterials } from './materials'
import { damp } from '../animations/easing'
import { stateRef, explodeRef, assembleRef } from './sceneStore'

export default function Rig({ materials, tier = 'desktop' }) {
  /* The gimbal owns its own copies — see cloneMaterials(). */
  const gimbalMaterials = useClonedMaterials(materials)
  const stage = useRef() // screen-space placement
  const pivot = useRef() // rotation about the assembly's own axes
  const cameraGrp = useRef()
  const gimbalGrp = useRef()

  const hi = tier === 'desktop'

  // Current (damped) values. Kept outside React so nothing re-renders.
  const cur = useRef({
    x: 0,
    y: 0,
    rx: 0,
    ry: 0,
    rz: 0,
    scale: 1,
    lift: 0,
    // -1, not 0: the gimbal's hidden state has to be *applied* on the first
    // frame. Seeded at 0 it matches its own target, the update is skipped,
    // and the disassembled arms sit in the hero shot.
    gimbalOpacity: -1,
  })

  /* Shadow flags have to be set on the meshes themselves, and the rig is
     built from ~45 nested groups, so this walks the tree once after mount. */
  useLayoutEffect(() => {
    const apply = (root) => {
      if (!root) return
      root.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = hi
          o.receiveShadow = hi
          o.frustumCulled = true
        }
      })
    }
    apply(cameraGrp.current)
    apply(gimbalGrp.current)
  }, [hi, materials])

  /* The gimbal's materials need per-part opacity during its entrance. Rather
     than cloning 40 materials, the whole assembly fades via a shared set of
     transparent flags toggled only while it is arriving. */
  const gimbalMats = useRef([])
  useEffect(() => {
    const list = []
    gimbalGrp.current?.traverse((o) => {
      if (o.isMesh && o.material && !list.includes(o.material)) list.push(o.material)
    })
    gimbalMats.current = list
  }, [gimbalMaterials])

  useFrame((state, dt) => {
    const s = stateRef.current
    if (!s || !stage.current || !pivot.current) return
    const d = Math.min(dt, 0.05)
    const c = cur.current
    const t = state.clock.elapsedTime

    // --- assembly framing ---
    // With the gimbal mounted, the assembly is ~3× taller than the camera
    // alone, so the rig scales down and lifts to keep the combined silhouette
    // centred. Both unwind as the gimbal clears during the anatomy section.
    const mounted = s.gimbal.assemble * (1 - s.gimbal.explode)
    const targetScale = s.rig.scale * (1 - 0.3 * mounted)
    const targetLift = 0.62 * mounted

    // --- idle float: the hero camera is "slightly floating" ---
    // A slow, small drift, killed off once the sequence takes over so it
    // never fights the scroll-driven motion.
    const idle = (1 - Math.min(1, s.p / 0.2)) * (1 - s.explode)
    const floatY = Math.sin(t * 0.62) * 0.026 * idle
    const floatR = Math.sin(t * 0.44 + 1.1) * 0.018 * idle

    c.x = damp(c.x, s.rig.x, 7, d)
    c.y = damp(c.y, s.rig.y + targetLift, 7, d)
    c.rx = damp(c.rx, s.rig.rotX, 8, d)
    c.ry = damp(c.ry, s.rig.rotY, 8, d)
    c.rz = damp(c.rz, s.rig.rotZ, 8, d)
    c.scale = damp(c.scale, targetScale, 7, d)

    stage.current.position.set(c.x, c.y + floatY, s.rig.z)
    stage.current.scale.setScalar(c.scale)

    pivot.current.rotation.set(c.rx + floatR, c.ry, c.rz)

    // --- gimbal visibility ---
    const go = s.gimbal.opacity * (1 - s.gimbal.explode * 0.9)
    if (Math.abs(go - c.gimbalOpacity) > 0.001) {
      c.gimbalOpacity = go
      const vis = go > 0.004
      if (gimbalGrp.current) gimbalGrp.current.visible = vis
      for (const m of gimbalMats.current) {
        m.transparent = go < 0.995
        m.opacity = go
        m.depthWrite = go > 0.9
      }
    }
  })

  return (
    <group ref={stage} name="stage">
      <group ref={pivot} name="pivot">
        <group ref={cameraGrp}>
          <CameraModel materials={materials} tier={tier} explodeRef={explodeRef} />
        </group>
        <group ref={gimbalGrp}>
          <GimbalModel
            materials={gimbalMaterials}
            tier={tier}
            assembleRef={assembleRef}
            explodeRef={{ get current() { return stateRef.current.gimbal.explode } }}
          />
        </group>
      </group>
    </group>
  )
}
