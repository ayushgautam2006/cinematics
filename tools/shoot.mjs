/**
 * Visual verification harness.
 *
 * Drives the built site in headless Chromium and captures the scroll
 * sequence at fixed progress points, so the motion can be checked frame by
 * frame instead of by hoping the timeline numbers were right.
 *
 *   node tools/shoot.mjs [outDir] [--viewport=1600x900] [--route=live]
 */

import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const outDir = args.find((a) => !a.startsWith('--')) || 'shots'
const vpArg = (args.find((a) => a.startsWith('--viewport=')) || '').split('=')[1] || '1600x900'
const route = (args.find((a) => a.startsWith('--route=')) || '').split('=')[1] || 'home'
const [w, h] = vpArg.split('x').map(Number)
const base = process.env.BASE_URL || 'http://localhost:4173'

mkdirSync(outDir, { recursive: true })

const STOPS =
  route === 'home'
    ? [0, 0.09, 0.2, 0.28, 0.36, 0.45, 0.52, 0.6, 0.68, 0.75, 0.82, 0.88, 0.94, 1]
    : [0, 0.35, 0.7, 1]

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--enable-webgl',
  ],
})

const page = await browser.newPage({
  viewport: { width: w, height: h },
  deviceScaleFactor: 1,
})

const errors = []
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`))

const tier = (args.find((a) => a.startsWith('--tier=')) || '--tier=desktop').split('=')[1]
const url =
  route === 'live' ? `${base}/?tier=${tier}#/live` : `${base}/?tier=${tier}#/`
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(2600) // loader + first WebGL frames

for (const t of STOPS) {
  if (route === 'home') {
    await page.evaluate((v) => window.__cinematics?.seek(v), t)
    // let the damped transforms settle at the new target
    await page.waitForTimeout(1400)
  } else {
    await page.evaluate((v) => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      window.__cinematics?.lenis?.scrollTo(max * v, { immediate: true, force: true })
    }, t)
    await page.waitForTimeout(700)
  }
  const name = `${route}-${String(Math.round(t * 100)).padStart(3, '0')}.png`
  await page.screenshot({ path: path.join(outDir, name) })
  process.stdout.write(`· ${name}\n`)
}

/* WebGL sanity: report whether we got a real context or fell back. */
const gl = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  if (!c) return 'NO CANVAS'
  const ctx = c.getContext('webgl2') || c.getContext('webgl')
  if (!ctx) return 'NO CONTEXT'
  const d = ctx.getExtension('WEBGL_debug_renderer_info')
  return d ? ctx.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'context ok'
})

console.log('\nrenderer:', gl)
if (errors.length) {
  console.log('\nconsole errors:')
  errors.slice(0, 20).forEach((e) => console.log(' !', e))
} else {
  console.log('no console errors')
}

await browser.close()
