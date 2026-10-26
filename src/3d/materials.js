/**
 * Shared material library.
 *
 * Materials are instantiated once and reused across every mesh in the rig.
 * With ~45 parts on screen that keeps GPU state changes down and, more
 * importantly, keeps the surfaces consistent — one "matte body black" that
 * behaves identically wherever it appears, rather than forty near-misses.
 *
 * The camera keeps realistic black/grey material properties throughout.
 * The red in the scene comes from lighting, never from tinting the body.
 */

import * as THREE from 'three'
import { useMemo, useEffect } from 'react'

export function createMaterials(tier = 'desktop') {
  const hi = tier === 'desktop'

  const M = {
    /* --- body shell: matte magnesium-alloy black, the dominant surface --- */
    shell: new THREE.MeshStandardMaterial({
      color: '#1f2225',
      roughness: 0.55,
      metalness: 0.38,
      // Kept low on purpose: the environment carries red, and metal picks it
      // up fast. The body has to stay graphite with a red *edge*.
      envMapIntensity: 0.6,
    }),
    /* open-ended forms (lens hood) need both faces or they vanish */
    shellOpen: new THREE.MeshStandardMaterial({
      color: '#131517',
      roughness: 0.66,
      metalness: 0.3,
      envMapIntensity: 0.5,
      side: THREE.DoubleSide,
    }),
    shellDeep: new THREE.MeshStandardMaterial({
      color: '#0f1012',
      roughness: 0.7,
      metalness: 0.35,
      envMapIntensity: 0.7,
    }),
    /* textured grip panel — rougher, no sheen */
    rubber: new THREE.MeshStandardMaterial({
      color: '#0b0c0d',
      roughness: 0.95,
      metalness: 0.05,
      envMapIntensity: 0.35,
    }),
    /* --- machined metal: mount flange, screws, structural frame --- */
    metal: new THREE.MeshStandardMaterial({
      color: '#9ba1a7',
      roughness: 0.26,
      metalness: 1,
      envMapIntensity: 1.5,
    }),
    metalDark: new THREE.MeshStandardMaterial({
      color: '#54585c',
      roughness: 0.4,
      metalness: 1,
      envMapIntensity: 1.15,
    }),
    /* heatsink / contacts */
    copper: new THREE.MeshStandardMaterial({
      color: '#a8804f',
      roughness: 0.34,
      metalness: 1,
      envMapIntensity: 1.4,
    }),
    /* --- optics ---
       Not true transmission: a thin, high-clearcoat shell reads as coated
       glass at a fraction of the cost, and stays legible against black. */
    glass: new THREE.MeshPhysicalMaterial({
      color: '#1b3948',
      transparent: true,
      opacity: 0.34,
      roughness: 0.04,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      ior: 1.62,
      envMapIntensity: hi ? 2.6 : 1.6,
      side: THREE.DoubleSide,
    }),
    /* front element carries the violet/amber bloom of a real lens coating */
    coating: new THREE.MeshPhysicalMaterial({
      color: '#1b2540',
      transparent: true,
      opacity: 0.42,
      roughness: 0.02,
      metalness: 0.1,
      clearcoat: 1,
      clearcoatRoughness: 0.01,
      emissive: '#241d40',
      emissiveIntensity: 0.28,
      envMapIntensity: hi ? 3.2 : 1.8,
      side: THREE.DoubleSide,
    }),
    /* --- the sensor: the heart of the exploded view --- */
    sensor: new THREE.MeshStandardMaterial({
      color: '#16323c',
      roughness: 0.12,
      metalness: 0.85,
      emissive: '#0a2c38',
      emissiveIntensity: 0.55,
      envMapIntensity: 2,
    }),
    sensorFrame: new THREE.MeshStandardMaterial({
      color: '#2b2f33',
      roughness: 0.35,
      metalness: 0.9,
    }),
    /* --- electronics --- */
    pcb: new THREE.MeshStandardMaterial({
      color: '#121a1c',
      roughness: 0.72,
      metalness: 0.18,
    }),
    chip: new THREE.MeshStandardMaterial({
      color: '#0a0b0c',
      roughness: 0.42,
      metalness: 0.5,
    }),
    /* --- display --- */
    screen: new THREE.MeshStandardMaterial({
      color: '#04060a',
      roughness: 0.08,
      metalness: 0.2,
      emissive: '#06111c',
      emissiveIntensity: 0.7,
    }),
    /* --- the only self-lit red on the model: record button + tally lamps.
           Physically justified, so it never reads as decoration. --- */
    tally: new THREE.MeshStandardMaterial({
      color: '#3a0509',
      emissive: '#d7192f',
      emissiveIntensity: 2.4,
      roughness: 0.3,
      metalness: 0,
    }),
    /* --- typography plates / markings --- */
    marking: new THREE.MeshStandardMaterial({
      color: '#c9c7c4',
      roughness: 0.5,
      metalness: 0.3,
    }),
  }

  return M
}

export function useMaterials(tier) {
  const materials = useMemo(() => createMaterials(tier), [tier])
  useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials])
  return materials
}

/**
 * An independent copy of the library.
 *
 * The gimbal fades in and out by writing `opacity` and `transparent` on its
 * materials. Sharing instances with the camera means that write reaches the
 * camera too — and a body shell at opacity 0 during the hero shot is a very
 * confusing bug to look at. The two rigs get separate copies.
 */
export function cloneMaterials(source) {
  const out = {}
  for (const [k, v] of Object.entries(source)) out[k] = v.clone()
  return out
}

export function useClonedMaterials(source) {
  const materials = useMemo(() => cloneMaterials(source), [source])
  useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials])
  return materials
}
