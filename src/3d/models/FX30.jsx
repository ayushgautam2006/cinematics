/**
 * ============================================================
 * SONY FX30 — PROCEDURAL PARTS RIG
 * ============================================================
 *
 * A mirrorless Super-35 cinema body, authored as ~30 discrete parts rather
 * than one mesh, because the brief's centrepiece is an exploded view and a
 * single fused mesh cannot come apart.
 *
 * Dimensions follow the real body: 129.7 × 77.8 × 84.5 mm, at 1 unit = 100 mm.
 *
 * ANATOMY NOTE — the FX30 is mirrorless. There is no reflex mirror, no
 * pentaprism and no optical finder in this model. What is here is what is
 * actually in the camera: an E-mount, an IBIS-suspended Super-35 sensor, a
 * main board with the BIONZ processor, and — unusually for this body class —
 * an active cooling stack with a fan, which is why the FX30 can roll 4K 120p
 * without a thermal cutoff.
 *
 * REPLACING THIS WITH A REAL GLB
 * ------------------------------
 * The animation system never imports this file directly. It resolves the
 * model through `src/3d/models/index.js`, which exposes `cameraModel`.
 * Swap the registry entry, keep the part ids in `FX30_PARTS`, and every
 * scroll beat continues to work untouched. See that file for the contract.
 */

import { forwardRef, useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { easeOutCubic, clamp } from '../../animations/easing'

/* ---------- body envelope ---------- */
const BW = 1.3 // width  — 129.7 mm
const BH = 0.78 // height —  77.8 mm
const BD = 0.85 // depth  —  84.5 mm
const HX = BW / 2
const HY = BH / 2
const HZ = BD / 2
const T = 0.045 // shell panel thickness

/** Optical axis, offset left of body centre to clear the grip. */
const OX = -0.12
const MOUNT_R = 0.315 // E-mount flange outer radius

/* ============================================================
   SMALL SHARED PIECES
   ============================================================ */

function Screw({ position, r = 0.022, M }) {
  return (
    <mesh position={position} rotation={[Math.PI / 2, 0, 0]} material={M.metalDark}>
      <cylinderGeometry args={[r, r, 0.03, 8]} />
    </mesh>
  )
}

function Slat({ y, M }) {
  return (
    <mesh position={[0, y, 0]} material={M.shellDeep}>
      <boxGeometry args={[0.012, 0.018, 0.42]} />
    </mesh>
  )
}

function Dial({ position, r, h, M }) {
  return (
    <group position={position}>
      <mesh material={M.metalDark}>
        <cylinderGeometry args={[r, r * 0.94, h, 20]} />
      </mesh>
      {/* knurling */}
      {Array.from({ length: 14 }).map((_, i) => {
        const a = (i / 14) * Math.PI * 2
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * r, 0, Math.sin(a) * r]}
            rotation={[0, -a, 0]}
            material={M.shellDeep}
          >
            <boxGeometry args={[0.008, h * 0.85, 0.014]} />
          </mesh>
        )
      })}
    </group>
  )
}

/* ============================================================
   PART REGISTRY
   ============================================================
   Each entry declares:
     id       stable identifier — the swap contract depends on these
     label    technical name, shown on the exploded-view callouts
     spec     one-line annotation
     ex       explode vector (the direction this part disassembles in)
     delay    0..1 stagger — outer parts leave first, the core last
     spin     small rotational drift while separating, for organic weight
     node     the geometry, positioned in assembled (rest) space
     tip      callout anchor, in exploded space
     hi       desktop-only detail
   ============================================================ */

export const FX30_PARTS = [
  /* ---------------- OPTICS ---------------- */
  {
    id: 'lens_hood',
    label: 'Lens Hood',
    spec: 'Bayonet · flare shield',
    ex: [0, 0.06, 2.05],
    delay: 0.0,
    spin: [0, 0.3, 0],
    node: (M) => (
      <group position={[OX, 0, 1.2]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh material={M.shellOpen}>
          <cylinderGeometry args={[0.335, 0.3, 0.26, 32, 1, true]} />
        </mesh>
        {/* lip, so the hood reads as a machined edge rather than a paper tube */}
        <mesh position={[0, 0.13, 0]} rotation={[Math.PI / 2, 0, 0]} material={M.shellDeep}>
          <torusGeometry args={[0.331, 0.011, 8, 36]} />
        </mesh>
      </group>
    ),
  },
  {
    id: 'lens_element_front',
    label: 'Front Element',
    spec: 'Multi-coated · ⌀62',
    ex: [0, 0.04, 1.62],
    delay: 0.05,
    node: (M) => (
      <group position={[OX, 0, 1.13]}>
        {/* A real front element is close to flat — a shallow cap, not a dome.
            A deep dome reads as a fisheye and swallows the body. */}
        <mesh rotation={[Math.PI / 2, 0, 0]} material={M.coating}>
          <sphereGeometry args={[0.42, 36, 12, 0, Math.PI * 2, 0, Math.PI * 0.13]} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={M.metalDark}>
          <torusGeometry args={[0.248, 0.016, 8, 40]} />
        </mesh>
      </group>
    ),
  },
  {
    id: 'lens_barrel',
    label: 'Lens Barrel',
    spec: 'E-mount zoom · 18–105',
    ex: [0, 0, 1.15],
    delay: 0.12,
    node: (M) => (
      <group position={[OX, 0, 0]}>
        <mesh position={[0, 0, 0.76]} rotation={[Math.PI / 2, 0, 0]} material={M.shell}>
          <cylinderGeometry args={[0.268, 0.272, 0.64, 32]} />
        </mesh>
        {/* index line */}
        <mesh position={[0, 0.27, 0.95]} material={M.marking}>
          <boxGeometry args={[0.016, 0.008, 0.05]} />
        </mesh>
      </group>
    ),
  },
  {
    id: 'focus_ring',
    label: 'Focus Ring',
    spec: 'Linear response',
    ex: [0.1, 0.34, 1.42],
    delay: 0.16,
    spin: [0, 0, 0.5],
    node: (M) => (
      <group position={[OX, 0, 0.98]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh material={M.rubber}>
          <cylinderGeometry args={[0.288, 0.288, 0.17, 32]} />
        </mesh>
        {Array.from({ length: 40 }).map((_, i) => {
          const a = (i / 40) * Math.PI * 2
          return (
            <mesh
              key={i}
              position={[Math.cos(a) * 0.289, 0, Math.sin(a) * 0.289]}
              rotation={[0, -a, 0]}
              material={M.shellDeep}
            >
              <boxGeometry args={[0.006, 0.15, 0.016]} />
            </mesh>
          )
        })}
      </group>
    ),
  },
  {
    id: 'zoom_ring',
    label: 'Zoom Ring',
    spec: 'Internal · parfocal',
    ex: [-0.12, 0.2, 1.02],
    delay: 0.2,
    spin: [0, 0, -0.4],
    node: (M) => (
      <mesh
        position={[OX, 0, 0.62]}
        rotation={[Math.PI / 2, 0, 0]}
        material={M.rubber}
      >
        <cylinderGeometry args={[0.286, 0.286, 0.15, 32]} />
      </mesh>
    ),
  },
  {
    id: 'lens_element_mid',
    label: 'Mid Group',
    spec: 'ED glass · floating',
    ex: [0, -0.28, 0.86],
    delay: 0.24,
    hi: true,
    node: (M) => (
      <mesh position={[OX, 0, 0.82]} rotation={[Math.PI / 2, 0, 0]} material={M.glass}>
        <sphereGeometry args={[0.2, 26, 16, 0, Math.PI * 2, 0, Math.PI * 0.36]} />
      </mesh>
    ),
  },
  {
    id: 'lens_element_rear',
    label: 'Rear Group',
    spec: 'Aspherical',
    ex: [0.05, -0.42, 0.6],
    delay: 0.28,
    hi: true,
    node: (M) => (
      <mesh
        position={[OX, 0, 0.55]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={M.glass}
      >
        <sphereGeometry args={[0.18, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.4]} />
      </mesh>
    ),
  },
  {
    id: 'lens_mount',
    label: 'E-Mount',
    spec: '18 mm flange · 46.1 mm ⌀',
    ex: [0, -0.1, 0.36],
    delay: 0.32,
    node: (M) => (
      <group position={[OX, 0, HZ + 0.02]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={M.metal}>
          <cylinderGeometry args={[MOUNT_R, MOUNT_R, 0.05, 40]} />
        </mesh>
        <mesh position={[0, 0, 0.005]} rotation={[Math.PI / 2, 0, 0]} material={M.shellDeep}>
          <cylinderGeometry args={[0.235, 0.235, 0.07, 36]} />
        </mesh>
        {/* contact block */}
        <mesh position={[0, -0.19, 0.01]} material={M.copper}>
          <boxGeometry args={[0.2, 0.03, 0.05]} />
        </mesh>
        {/* release button */}
        <mesh position={[0.36, 0, -0.02]} material={M.shellDeep}>
          <boxGeometry args={[0.07, 0.11, 0.05]} />
        </mesh>
      </group>
    ),
  },

  /* ---------------- SHELL PANELS ---------------- */
  {
    id: 'panel_front',
    label: 'Front Panel',
    spec: 'Magnesium alloy',
    ex: [0, 0, 0.62],
    delay: 0.34,
    node: (M) => (
      <group position={[0, 0, HZ - T / 2]}>
        <RoundedBox args={[BW, 0.075, T]} radius={0.008} smoothness={2} position={[0, 0.3525, 0]} material={M.shell} />
        <RoundedBox args={[BW, 0.075, T]} radius={0.008} smoothness={2} position={[0, -0.3525, 0]} material={M.shell} />
        <RoundedBox args={[0.215, 0.63, T]} radius={0.008} smoothness={2} position={[-0.5425, 0, 0]} material={M.shell} />
        <RoundedBox args={[0.455, 0.63, T]} radius={0.008} smoothness={2} position={[0.4225, 0, 0]} material={M.shell} />
        {/* front tally lamp — the only red the body emits */}
        <mesh position={[0.26, 0.24, 0.026]} material={M.tally}>
          <circleGeometry args={[0.022, 16]} />
        </mesh>
      </group>
    ),
  },
  {
    id: 'panel_top',
    label: 'Top Plate',
    spec: 'Control deck',
    ex: [0, 1.18, 0.1],
    delay: 0.2,
    node: (M) => (
      <RoundedBox
        args={[BW, T, BD]}
        radius={0.014}
        smoothness={3}
        position={[0, HY - T / 2, 0]}
        material={M.shell}
      />
    ),
  },
  {
    id: 'panel_bottom',
    label: 'Base Plate',
    spec: '1/4-20 · locating pins',
    ex: [0, -1.22, 0],
    delay: 0.26,
    node: (M) => (
      <group position={[0, -HY + T / 2, 0]}>
        <RoundedBox args={[BW, T, BD]} radius={0.014} smoothness={3} material={M.shell} />
        <mesh position={[OX, -0.028, 0]} rotation={[Math.PI / 2, 0, 0]} material={M.metal}>
          <cylinderGeometry args={[0.05, 0.05, 0.02, 20]} />
        </mesh>
        <mesh position={[OX, -0.034, 0]} rotation={[Math.PI / 2, 0, 0]} material={M.shellDeep}>
          <cylinderGeometry args={[0.028, 0.028, 0.03, 16]} />
        </mesh>
      </group>
    ),
  },
  {
    id: 'panel_vent',
    label: 'Intake Vent',
    spec: 'Active cooling inlet',
    ex: [-1.42, 0.1, 0],
    delay: 0.14,
    node: (M) => (
      <group position={[-HX + T / 2, 0, 0]}>
        <RoundedBox args={[T, BH - T * 2, BD]} radius={0.012} smoothness={3} material={M.shell} />
        <group position={[-0.03, 0, 0]}>
          {[-0.18, -0.09, 0, 0.09, 0.18].map((y) => (
            <Slat key={y} y={y} M={M} />
          ))}
        </group>
      </group>
    ),
  },
  {
    id: 'panel_side',
    label: 'Side Panel',
    spec: 'Exhaust side',
    ex: [1.36, 0.06, -0.1],
    delay: 0.18,
    node: (M) => (
      <RoundedBox
        args={[T, BH - T * 2, BD]}
        radius={0.012}
        smoothness={3}
        position={[HX - T / 2, 0, 0]}
        material={M.shell}
      />
    ),
  },
  {
    id: 'panel_rear',
    label: 'Rear Panel',
    spec: 'I/O · tally · controls',
    ex: [0, 0.05, -1.2],
    delay: 0.22,
    node: (M) => (
      <group position={[0, 0, -HZ + T / 2]}>
        <RoundedBox args={[BW - T * 2, BH - T * 2, T]} radius={0.01} smoothness={3} material={M.shell} />
        <mesh position={[0.5, 0.26, -0.028]} material={M.tally}>
          <circleGeometry args={[0.018, 16]} />
        </mesh>
        {/* thumb rest */}
        <RoundedBox args={[0.16, 0.2, 0.02]} radius={0.006} smoothness={2} position={[0.46, -0.02, -0.03]} material={M.rubber} />
      </group>
    ),
  },

  /* ---------------- EXTERNAL FURNITURE ---------------- */
  {
    id: 'grip',
    label: 'Hand Grip',
    spec: 'Deep-profile · NP-FZ100 bay',
    ex: [1.62, -0.18, 0.14],
    delay: 0.1,
    spin: [0, -0.25, 0],
    node: (M) => (
      <group position={[HX - 0.02, -0.02, 0.06]}>
        <RoundedBox args={[0.28, BH - 0.02, 0.6]} radius={0.06} smoothness={4} material={M.shell} />
        <RoundedBox args={[0.06, BH - 0.12, 0.46]} radius={0.026} smoothness={3} position={[0.14, -0.02, 0.02]} material={M.rubber} />
        {/* shutter / record trigger */}
        <mesh position={[0.02, 0.4, 0.24]} rotation={[0.2, 0, 0]} material={M.tally}>
          <cylinderGeometry args={[0.045, 0.045, 0.03, 20]} />
        </mesh>
      </group>
    ),
  },
  {
    id: 'controls',
    label: 'Control Cluster',
    spec: 'Dials · mode wheel',
    ex: [0.16, 1.56, -0.32],
    delay: 0.24,
    spin: [0.3, 0.2, 0],
    node: (M) => (
      <group position={[0, HY + 0.005, 0]}>
        <Dial position={[0.34, 0.03, -0.22]} r={0.085} h={0.06} M={M} />
        <Dial position={[0.1, 0.02, -0.3]} r={0.06} h={0.045} M={M} />
        <RoundedBox args={[0.12, 0.03, 0.06]} radius={0.008} smoothness={2} position={[-0.3, 0.02, -0.24]} material={M.shellDeep} />
        <RoundedBox args={[0.12, 0.03, 0.06]} radius={0.008} smoothness={2} position={[-0.3, 0.02, -0.12]} material={M.shellDeep} />
        {/* multi-interface shoe */}
        <group position={[OX, 0.03, -0.06]}>
          <mesh material={M.metal}>
            <boxGeometry args={[0.2, 0.02, 0.16]} />
          </mesh>
          <mesh position={[0, 0.02, 0]} material={M.shellDeep}>
            <boxGeometry args={[0.14, 0.03, 0.12]} />
          </mesh>
        </group>
      </group>
    ),
  },
  {
    id: 'handle',
    label: 'XLR Handle Unit',
    spec: 'Dual XLR · detachable',
    ex: [0, 1.95, -0.15],
    delay: 0.02,
    spin: [0.18, 0, 0],
    node: (M) => (
      <group position={[0, HY + 0.06, -0.02]}>
        {/* posts */}
        <mesh position={[-0.34, 0.05, 0.12]} material={M.metalDark}>
          <boxGeometry args={[0.07, 0.14, 0.08]} />
        </mesh>
        <mesh position={[-0.34, 0.05, -0.3]} material={M.metalDark}>
          <boxGeometry args={[0.07, 0.14, 0.08]} />
        </mesh>
        {/* handle bar */}
        <RoundedBox args={[0.32, 0.11, 0.88]} radius={0.03} smoothness={3} position={[-0.34, 0.17, -0.06]} material={M.shell} />
        {/* XLR block */}
        <RoundedBox args={[0.28, 0.17, 0.2]} radius={0.02} smoothness={3} position={[-0.34, 0.16, 0.36]} material={M.shell} />
        <mesh position={[-0.27, 0.16, 0.46]} rotation={[Math.PI / 2, 0, 0]} material={M.metalDark}>
          <cylinderGeometry args={[0.04, 0.04, 0.04, 16]} />
        </mesh>
        <mesh position={[-0.41, 0.16, 0.46]} rotation={[Math.PI / 2, 0, 0]} material={M.metalDark}>
          <cylinderGeometry args={[0.04, 0.04, 0.04, 16]} />
        </mesh>
        {/* cold shoe on top */}
        <mesh position={[-0.34, 0.24, -0.26]} material={M.metal}>
          <boxGeometry args={[0.14, 0.02, 0.12]} />
        </mesh>
      </group>
    ),
  },
  {
    id: 'lcd',
    label: 'LCD Monitor',
    spec: '3.0" side-articulating touch',
    ex: [-0.66, -0.12, -1.5],
    delay: 0.06,
    spin: [0, 0.4, 0],
    node: (M) => (
      <group position={[-0.34, 0.0, -HZ - 0.04]}>
        <RoundedBox args={[0.68, 0.5, 0.035]} radius={0.012} smoothness={3} material={M.shell} />
        <mesh position={[0, 0, -0.023]} material={M.screen}>
          <planeGeometry args={[0.6, 0.42]} />
        </mesh>
        {/* hinge */}
        <mesh position={[0.36, 0, 0.005]} rotation={[0, 0, 0]} material={M.metalDark}>
          <cylinderGeometry args={[0.022, 0.022, 0.48, 12]} />
        </mesh>
      </group>
    ),
  },

  /* ---------------- STRUCTURE ---------------- */
  {
    id: 'chassis',
    label: 'Internal Frame',
    spec: 'Magnesium skeleton',
    ex: [0, 0, 0],
    delay: 0.9,
    node: (M) => {
      const posts = [
        [-HX + 0.09, 0, -HZ + 0.09],
        [-HX + 0.09, 0, HZ - 0.09],
        [HX - 0.09, 0, -HZ + 0.09],
        [HX - 0.09, 0, HZ - 0.09],
      ]
      return (
        <group>
          {posts.map((p, i) => (
            <mesh key={i} position={p} material={M.metalDark}>
              <boxGeometry args={[0.05, BH - 0.12, 0.05]} />
            </mesh>
          ))}
          <mesh position={[0, HY - 0.1, 0]} material={M.metalDark}>
            <boxGeometry args={[BW - 0.16, 0.035, 0.05]} />
          </mesh>
          <mesh position={[0, -HY + 0.1, 0]} material={M.metalDark}>
            <boxGeometry args={[BW - 0.16, 0.035, 0.05]} />
          </mesh>
          {/* mount bulkhead */}
          <mesh position={[OX, 0, HZ - 0.12]} material={M.metalDark}>
            <torusGeometry args={[0.29, 0.022, 8, 28]} />
          </mesh>
        </group>
      )
    },
  },
  {
    id: 'screws',
    label: 'Fasteners',
    spec: 'M2 · 14 off',
    ex: [0, 0.3, 0.2],
    delay: 0.4,
    hi: true,
    scatter: 1.9,
    node: (M) => (
      <group>
        {[
          [-0.58, 0.32, HZ - 0.02],
          [0.58, 0.32, HZ - 0.02],
          [-0.58, -0.32, HZ - 0.02],
          [0.58, -0.32, HZ - 0.02],
          [-0.52, 0.3, -HZ + 0.02],
          [0.52, 0.3, -HZ + 0.02],
          [-0.52, -0.3, -HZ + 0.02],
          [0.52, -0.3, -HZ + 0.02],
        ].map((p, i) => (
          <Screw key={i} position={p} M={M} />
        ))}
      </group>
    ),
  },

  /* ---------------- IMAGING CORE ---------------- */
  {
    id: 'filter',
    label: 'Optical Filter Stack',
    spec: 'IR cut · AA-less',
    ex: [0.02, 0.62, 0.28],
    delay: 0.44,
    node: (M) => (
      <group position={[OX, 0, 0.3]}>
        <mesh material={M.glass}>
          <boxGeometry args={[0.3, 0.21, 0.008]} />
        </mesh>
        <mesh material={M.metalDark}>
          <boxGeometry args={[0.32, 0.23, 0.004]} />
        </mesh>
      </group>
    ),
  },
  {
    id: 'sensor',
    label: 'Image Sensor',
    spec: '26.1 MP Super-35 Exmor R · BSI CMOS',
    hero: true,
    ex: [0, 0.16, 0.04],
    delay: 0.62,
    node: (M) => (
      <group position={[OX, 0, 0.2]}>
        <mesh material={M.sensorFrame}>
          <boxGeometry args={[0.34, 0.25, 0.022]} />
        </mesh>
        <mesh position={[0, 0, 0.014]} material={M.sensor}>
          <boxGeometry args={[0.278, 0.185, 0.006]} />
        </mesh>
        {/* flex ribbon */}
        <mesh position={[0, -0.16, -0.01]} rotation={[0.4, 0, 0]} material={M.copper}>
          <boxGeometry args={[0.2, 0.09, 0.004]} />
        </mesh>
      </group>
    ),
  },
  {
    id: 'ibis',
    label: 'IBIS Assembly',
    spec: '5-axis · voice-coil suspension',
    ex: [-0.1, -0.56, -0.34],
    delay: 0.52,
    spin: [0.2, 0, 0.15],
    node: (M) => (
      <group position={[OX, 0, 0.13]}>
        <mesh material={M.metalDark}>
          <boxGeometry args={[0.48, 0.4, 0.03] } />
        </mesh>
        <mesh position={[0, 0, 0.001]} material={M.shellDeep}>
          <boxGeometry args={[0.3, 0.22, 0.05]} />
        </mesh>
        {/* voice coil magnets at each axis */}
        {[
          [-0.19, 0, 0],
          [0.19, 0, 0],
          [0, 0.16, 0],
          [0, -0.16, 0],
        ].map((p, i) => (
          <mesh key={i} position={p} material={M.copper}>
            <boxGeometry args={[0.06, 0.06, 0.04]} />
          </mesh>
        ))}
      </group>
    ),
  },
  {
    id: 'heatsink',
    label: 'Heat Sink',
    spec: 'Finned · sensor-coupled',
    ex: [0.34, 1.0, -0.42],
    delay: 0.46,
    node: (M) => (
      <group position={[0.06, 0.13, -0.06]}>
        <mesh material={M.copper}>
          <boxGeometry args={[0.46, 0.03, 0.3]} />
        </mesh>
        {Array.from({ length: 9 }).map((_, i) => (
          <mesh key={i} position={[-0.2 + i * 0.05, 0.06, 0]} material={M.metal}>
            <boxGeometry args={[0.012, 0.09, 0.28]} />
          </mesh>
        ))}
      </group>
    ),
  },
  {
    id: 'fan',
    label: 'Cooling Fan',
    spec: 'Active thermal · unlimited 4K 120p',
    ex: [0.92, 0.72, -0.2],
    delay: 0.42,
    spin: [0, 0, 2.2],
    node: (M) => (
      <group position={[0.3, -0.04, -0.18]} rotation={[0, Math.PI / 2, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={M.shellDeep}>
          <cylinderGeometry args={[0.15, 0.15, 0.045, 24, 1, true]} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={M.metalDark}>
          <cylinderGeometry args={[0.045, 0.045, 0.05, 14]} />
        </mesh>
        {Array.from({ length: 7 }).map((_, i) => {
          const a = (i / 7) * Math.PI * 2
          return (
            <mesh
              key={i}
              position={[Math.cos(a) * 0.09, Math.sin(a) * 0.09, 0]}
              rotation={[0, 0, -a + 0.6]}
              material={M.shellDeep}
            >
              <boxGeometry args={[0.11, 0.035, 0.02]} />
            </mesh>
          )
        })}
      </group>
    ),
  },

  /* ---------------- ELECTRONICS ---------------- */
  {
    id: 'mainboard',
    label: 'Main Board',
    spec: 'Power · I/O · signal path',
    ex: [-0.16, -0.1, -1.0],
    delay: 0.5,
    node: (M) => (
      <group position={[0, -0.02, -0.06]}>
        <mesh material={M.pcb}>
          <boxGeometry args={[0.94, 0.56, 0.018]} />
        </mesh>
        {[
          [-0.3, 0.16, 0.02, 0.1, 0.07],
          [0.24, 0.18, 0.02, 0.14, 0.06],
          [0.3, -0.15, 0.02, 0.1, 0.1],
          [-0.34, -0.16, 0.02, 0.12, 0.05],
        ].map((c, i) => (
          <mesh key={i} position={[c[0], c[1], c[2]]} material={M.chip}>
            <boxGeometry args={[c[3], c[4], 0.022]} />
          </mesh>
        ))}
        {/* edge connectors */}
        <mesh position={[0, -0.3, 0.01]} material={M.copper}>
          <boxGeometry args={[0.3, 0.02, 0.02]} />
        </mesh>
      </group>
    ),
  },
  {
    id: 'processor',
    label: 'BIONZ XR Processor',
    spec: 'Image pipeline · S-Cinetone',
    hero: true,
    ex: [-0.5, 0.42, -1.36],
    delay: 0.56,
    spin: [0, 0.5, 0],
    node: (M) => (
      <group position={[-0.06, 0.06, -0.03]}>
        <mesh material={M.chip}>
          <boxGeometry args={[0.19, 0.19, 0.028]} />
        </mesh>
        <mesh position={[0, 0, 0.016]} material={M.metal}>
          <boxGeometry args={[0.13, 0.13, 0.006]} />
        </mesh>
        {/* BGA pads */}
        {Array.from({ length: 4 }).map((_, i) => (
          <mesh key={i} position={[-0.075 + i * 0.05, -0.104, 0]} material={M.copper}>
            <boxGeometry args={[0.03, 0.012, 0.02]} />
          </mesh>
        ))}
      </group>
    ),
  },
  {
    id: 'battery',
    label: 'NP-FZ100 Battery',
    spec: '16.4 Wh · 7.2 V',
    ex: [-0.62, -1.05, -0.28],
    delay: 0.36,
    spin: [0.2, 0.2, 0],
    node: (M) => (
      <group position={[-0.3, -0.2, -0.12]}>
        <RoundedBox args={[0.4, 0.28, 0.19]} radius={0.014} smoothness={3} material={M.shellDeep} />
        <mesh position={[0, 0.146, 0.03]} material={M.copper}>
          <boxGeometry args={[0.16, 0.012, 0.05]} />
        </mesh>
        <mesh position={[0, 0, 0.098]} material={M.marking}>
          <planeGeometry args={[0.2, 0.05]} />
        </mesh>
      </group>
    ),
  },
  {
    id: 'battery_door',
    label: 'Battery Door',
    spec: 'Sprung latch',
    ex: [-0.86, -1.42, 0.1],
    delay: 0.3,
    spin: [0.5, 0, 0],
    node: (M) => (
      <group position={[-0.3, -HY + 0.01, -0.1]}>
        <RoundedBox args={[0.44, 0.03, 0.34]} radius={0.008} smoothness={2} material={M.shell} />
        <mesh position={[0.19, -0.02, 0]} material={M.metalDark}>
          <boxGeometry args={[0.05, 0.02, 0.09]} />
        </mesh>
      </group>
    ),
  },
]

/* ============================================================
   THE COMPONENT
   ============================================================ */

/**
 * Per-part stagger. Parts with a low `delay` begin separating immediately;
 * the sensor and the frame hold position until the shell has cleared, so the
 * disassembly reads in the order a technician would actually work.
 */
function partProgress(explode, delay) {
  const span = 0.45
  const start = delay * span
  return easeOutCubic(clamp((explode - start) / (1 - start)))
}

const FX30 = forwardRef(function FX30(
  { materials: M, tier = 'desktop', explodeRef },
  ref,
) {
  const groupRefs = useRef([])

  const parts = useMemo(
    () => FX30_PARTS.filter((p) => !p.hi || tier === 'desktop'),
    [tier],
  )

  useFrame(() => {
    const e = explodeRef?.current ?? 0
    for (let i = 0; i < parts.length; i++) {
      const g = groupRefs.current[i]
      if (!g) continue
      const part = parts[i]
      const t = partProgress(e, part.delay)
      const s = part.scatter ?? 1
      g.position.set(part.ex[0] * t * s, part.ex[1] * t * s, part.ex[2] * t * s)
      if (part.spin) {
        g.rotation.set(part.spin[0] * t, part.spin[1] * t, part.spin[2] * t)
      }
    }
  })

  return (
    <group ref={ref} name="fx30">
      {parts.map((part, i) => (
        <group
          key={part.id}
          name={part.id}
          ref={(el) => (groupRefs.current[i] = el)}
        >
          {part.node(M)}
        </group>
      ))}
    </group>
  )
})

export default FX30
