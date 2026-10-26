# Cinematics Production

A scroll-driven 3D website for **Cinematics Production**, the cinematography and film club of NIT Rourkela.

Two pages. The Home page is one continuous cinematic sequence built around a Sony FX30 and a DJI RS 3 Mini; the Live page is a broadcast interface for the club's streams.

---

## Running it

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # → dist/
npm run preview      # serve the production build
```

Node 18+.

### Extra scripts

```bash
npm run build:single   # one self-contained dist/index.html (everything inlined)
npm run artifact       # build:single, then emit dist/artifact.html as a page fragment
npm run shots          # screenshot the scroll sequence at 14 progress points
```

`npm run shots` needs a Chromium binary; point `CHROME_PATH` at one if Playwright's
download is unavailable. It writes to `shots/` and is the fastest way to check that a
timeline change did what you intended.

---

## The idea

Scroll position **is** animation progress. There are no play-once triggers anywhere: a
single scalar 0 → 1 is derived from the scrollbar, and every transform in the scene is a
pure function of it. Scroll back up and the whole sequence runs in reverse; refresh
mid-page and you land on a correct frame rather than at the start of an animation.

### The five beats

| Progress | Beat | What happens |
|---|---|---|
| 0 – 17% | **A · The Instrument** | FX30 horizontal, right of frame, floating. Typography owns the left. |
| 17 – 37% | **B · Reframe** | The body rolls 90° about its own optical axis — horizontal → portrait — and travels to centre. |
| 37 – 54.5% | **C · Stabilise** | Rolls back to horizontal, moves left, and the RS 3 Mini assembles around it in four staged movements. |
| 54.5 – 76% | **D · Orbit** | The viewer travels 0° → 270° around the mounted rig. |
| 76 – 100% | **E · Anatomy** | A hard push almost inside the body, then the camera separates into ~30 components as the frame opens back out. |

Percentages live in `PHASES` in `src/animations/timeline.js` and are approximate — tune freely.

---

## Architecture

```
src/
├── 3d/
│   ├── Scene.jsx          Canvas, the orbiting viewer, fog, grounding shadow
│   ├── Rig.jsx            Camera + gimbal as one assembly; damps toward the timeline
│   ├── Lighting.jsx       Key / red rim / fill / kick + procedural environment
│   ├── SceneType.jsx      SDF typography and technical callouts, inside the 3D scene
│   ├── materials.js       Shared material library
│   ├── sceneStore.js      The one mutable scene state, written once per tick
│   └── models/
│       ├── index.jsx      ► THE ASSET SWAP POINT — read this first
│       ├── FX30.jsx       ~30-part procedural Sony FX30
│       └── GimbalRS3.jsx  5-assembly procedural DJI RS 3 Mini
├── animations/
│   ├── timeline.js        ► getSceneState(p) — the master timeline
│   ├── easing.js          Monotonic, overshoot-free curves
│   └── scroll.jsx         Lenis + ScrollTrigger + device tiering
├── components/            Nav, loading screen, mark, router
├── data/liveEvents.js     ► All Live page content
├── pages/                 Home, Live
└── styles/                tokens.css + per-surface stylesheets
```

Three files carry the weight: **`animations/timeline.js`** (what happens when),
**`3d/models/index.jsx`** (which geometry), **`data/liveEvents.js`** (Live page content).

### Why state lives outside React

At 60 fps the scene state changes every frame. Pushing that through React state would cost
far more than the render it drives, so `sceneStore.js` holds one mutable object, the scroll
ticker writes it, and both the 3D components and the DOM layers read it directly. No
component re-renders while you scroll.

---

## Replacing the 3D models

The animation system never imports `FX30.jsx` or `GimbalRS3.jsx`. It renders `<CameraModel />`
and `<GimbalModel />`, which resolve through `MODEL_REGISTRY` in `src/3d/models/index.jsx`.
Everything — explode staging, callouts, the orbit, every scroll beat — is written against
**part ids**, not geometry.

To drop in a real GLB:

1. Put the file at `public/models/sony-fx30.glb`.
2. In `src/3d/models/index.jsx`, set the `cameraModel` entry to
   `source: 'gltf'`, give it the `url`, and fill in `nodeMap` — a mapping from our part ids
   to the node names inside your GLB.
3. Adjust `fit` (scale / rotation / position) so the model matches our convention:
   **1 unit = 100 mm, +Z is the lens direction, +X is the grip side.**

Any id you leave out of `nodeMap` is skipped, so a partial map works — an exterior-only
model can take over the hero sections while the procedural rig keeps supplying the interior.

**A note on sourcing.** No publicly available FX30 model contains interior geometry — sensor,
IBIS, main board, heatsink. A downloaded GLB can replace the exterior, but the anatomy
section needs authored parts either way; that is why the procedural rig is the default rather
than a placeholder. If you do want a real exterior, search **"Sony FX3"** as well as FX30 —
near-identical body, far more models available (Sketchfab, CGTrader, TurboSquid; GrabCAD has
STEP files that need converting).

---

## Editing the Live page

Everything the Live page renders comes from `src/data/liveEvents.js`. Replace the values —
`FEATURED`, `EVENTS`, `ARCHIVE` — and nothing else needs touching. All copy is currently
neutral placeholder (`EVENT_TITLE_01`, `VENUE_NAME`) so nothing reads as a real event.

Card artwork is procedural: each item picks `poster: 1–8`, which selects a dark treatment
defined in `src/styles/live.css`. When you have real stills, replace the `background` on a
`.poster--n` rule with a `background-image` — the scrim, grain, hover and layout all keep working.

The featured broadcast's start time is anchored to page load so the on-air timecode always
shows a running stream. Swap it for a real ISO timestamp when you have one.

---

## Visual system

Matte black field (`#050505`–`#111111`, never flat), a red gradient
(`#3A0509` → `#680B12` → `#A30F1B` → `#D7192F`) used as **lighting** rather than decoration,
and dark smoked glass for every UI surface. Ratio target: **70% black / 20% glass / 10% red**.

All tokens live in `src/styles/tokens.css`. The red is deliberately restrained — a single
world-fixed rim light behind the subject, one low-intensity red panel in the reflection
environment, and one additive glow pool in 3D space. A second red source from the opposite
side puts a red edge on every silhouette at once, which stops reading as lighting and starts
reading as a neon outline.

Type is Archivo (display + body) and JetBrains Mono (the technical voice of the interface),
both bundled locally via `@fontsource` — no network request at runtime.

---

## Performance

Three device tiers, resolved in `detectTier()` in `src/animations/scroll.jsx`:

| Tier | DPR cap | Shadows | Antialias | Extra parts | Callouts |
|---|---|---|---|---|---|
| `desktop` | 2 | soft | yes | yes | yes |
| `mid` | 1.6 | no | yes | no | yes |
| `low` | 1.35 | no | no | no | no |

Add `?tier=desktop`, `?tier=mid` or `?tier=low` to the URL to force one — useful for checking
the reduced path without a second device.

Mobile keeps the full scroll-driven sequence with the camera always visible; it pulls the
viewer further back, shortens the scroll track to 78%, drops the two extra lens elements and
the screws, and switches the Live page's strip accordion to a swipe rail.

Also: no post-processing pipeline (grain, vignette and bloom are CSS overlays plus an additive
plane in-scene), a procedural reflection environment baked once rather than an HDRI fetch, one
shared material library rather than per-mesh materials, and `prefers-reduced-motion` stops
every ambient animation.

### Debugging the timeline

```js
window.__cinematics.seek(0.62)   // park the rig mid-orbit
window.__cinematics.progress     // current scalar
```

---

## Notes

- Routing is hash-based (`#/`, `#/live`) so the build works from a static host, from
  `file://`, and from inside a single-file bundle.
- `StrictMode` is deliberately off — its double-invoked effects recreate the WebGL context and
  the Lenis instance on every mount, which costs a visible hitch on load.
- The aperture mark in `src/components/Mark.jsx` is drawn, not imported. Swap it for the club's
  own logo: keep the 24×24 viewBox and the `currentColor` fills and every placement keeps working.
