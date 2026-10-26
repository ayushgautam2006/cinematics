/**
 * ============================================================
 * MODEL REGISTRY — THE ASSET SWAP POINT
 * ============================================================
 *
 * The animation system never imports FX30.jsx or GimbalRS3.jsx directly.
 * It renders <CameraModel /> and <GimbalModel />, which resolve through this
 * registry. That is the whole point: the scroll timeline, the explode
 * staging, the callouts and the orbit are all written against *part ids*,
 * not against geometry.
 *
 * ------------------------------------------------------------
 * SWAPPING IN A REAL SONY FX30 GLB
 * ------------------------------------------------------------
 * 1. Drop the file at  public/models/sony-fx30.glb
 * 2. Change the entry below to:
 *
 *      cameraModel: {
 *        source: 'gltf',
 *        url: '/models/sony-fx30.glb',
 *        parts: FX30_PARTS,
 *        nodeMap: { lens_hood: 'Lens_Hood', sensor: 'Sensor_Plate', ... },
 *      }
 *
 * 3. `nodeMap` maps our stable part ids to the node names inside the GLB.
 *    Any id you do not map is simply skipped — a partial map works, so an
 *    exterior-only model can be swapped in for the hero sections while the
 *    procedural rig continues to supply the interior for the exploded view.
 *
 * Nothing else changes. Explode vectors, stagger, callouts and every scroll
 * beat keep working, because they are declared in FX30_PARTS.
 *
 * NOTE ON SOURCING: no publicly available FX30 model contains interior
 * geometry — sensor, IBIS, board, heatsink. A downloaded GLB can replace the
 * exterior, but the anatomy section needs authored parts either way. That is
 * why the procedural rig is the default rather than a placeholder.
 */

import { Suspense, forwardRef, useRef, useMemo, useEffect } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { easeOutCubic, clamp } from '../../animations/easing'

import FX30, { FX30_PARTS } from './FX30'
import GimbalRS3, { RS3_PARTS } from './GimbalRS3'

export { FX30_PARTS, RS3_PARTS }

/* ============================================================
   REGISTRY
   ============================================================ */

export const MODEL_REGISTRY = {
  cameraModel: {
    source: 'procedural', // 'procedural' | 'gltf'
    url: null, // '/models/sony-fx30.glb'
    component: FX30,
    parts: FX30_PARTS,
    nodeMap: null,
    /** Applied to the loaded GLB so a swapped model matches our unit scale
     *  (1 unit = 100 mm) and axis convention (+Z = lens direction). */
    fit: { scale: 1, rotation: [0, 0, 0], position: [0, 0, 0] },
  },
  gimbalModel: {
    source: 'procedural',
    url: null, // '/models/dji-rs3-mini.glb'
    component: GimbalRS3,
    parts: RS3_PARTS,
    nodeMap: null,
    fit: { scale: 1, rotation: [0, 0, 0], position: [0, 0, 0] },
  },
}

/* ============================================================
   GLTF PARTS RIG
   Applies the same explode contract to nodes inside a loaded GLB.
   ============================================================ */

function GLTFPartsRig({ config, explodeRef, materials }) {
  const { scene } = useGLTF(config.url)
  const cloned = useMemo(() => scene.clone(true), [scene])
  const bound = useRef([])

  useEffect(() => {
    const map = config.nodeMap || {}
    bound.current = config.parts
      .map((part) => {
        const nodeName = map[part.id]
        if (!nodeName) return null
        const node = cloned.getObjectByName(nodeName)
        return node ? { part, node } : null
      })
      .filter(Boolean)

    if (import.meta.env.DEV) {
      const missing = config.parts.filter((p) => map[p.id] && !cloned.getObjectByName(map[p.id]))
      if (missing.length) {
        console.warn(
          '[models] GLB is missing mapped nodes:',
          missing.map((p) => `${p.id} → ${config.nodeMap[p.id]}`),
        )
      }
    }
  }, [cloned, config])

  useFrame(() => {
    const e = explodeRef?.current ?? 0
    for (const { part, node } of bound.current) {
      const span = 0.45
      const start = part.delay * span
      const t = easeOutCubic(clamp((e - start) / (1 - start)))
      const s = part.scatter ?? 1
      node.position.set(part.ex[0] * t * s, part.ex[1] * t * s, part.ex[2] * t * s)
    }
  })

  void materials
  const { scale, rotation, position } = config.fit
  return <primitive object={cloned} scale={scale} rotation={rotation} position={position} />
}

/* ============================================================
   PUBLIC COMPONENTS
   ============================================================ */

export const CameraModel = forwardRef(function CameraModel(props, ref) {
  const config = MODEL_REGISTRY.cameraModel
  if (config.source === 'gltf' && config.url) {
    return (
      <group ref={ref} name="cameraModel">
        <Suspense fallback={null}>
          <GLTFPartsRig config={config} {...props} />
        </Suspense>
      </group>
    )
  }
  const Comp = config.component
  return <Comp ref={ref} {...props} />
})

export const GimbalModel = forwardRef(function GimbalModel(props, ref) {
  const config = MODEL_REGISTRY.gimbalModel
  if (config.source === 'gltf' && config.url) {
    return (
      <group ref={ref} name="gimbalModel">
        <Suspense fallback={null}>
          <GLTFPartsRig config={config} {...props} />
        </Suspense>
      </group>
    )
  }
  const Comp = config.component
  return <Comp ref={ref} {...props} />
})

/** Preload only when a real asset is configured. */
export function preloadModels() {
  Object.values(MODEL_REGISTRY).forEach((c) => {
    if (c.source === 'gltf' && c.url) useGLTF.preload(c.url)
  })
}
