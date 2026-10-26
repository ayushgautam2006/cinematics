import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
const out = '/home/claude/mobile'
mkdirSync(out, { recursive: true })
const b = await chromium.launch({
  executablePath: process.env.CHROME_PATH,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const ctx = await b.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
})
const p = await ctx.newPage()
const errs = []
p.on('pageerror', (e) => errs.push(e.message))
await p.goto('http://localhost:4173/#/', { waitUntil: 'networkidle' })
await p.waitForTimeout(3000)
for (const t of [0, 0.28, 0.5, 0.68, 1]) {
  await p.evaluate((v) => window.__cinematics?.seek(v), t)
  await p.waitForTimeout(1300)
  await p.screenshot({ path: `${out}/m-home-${Math.round(t * 100)}.png` })
}
// nav open state
await p.evaluate(() => window.__cinematics?.seek(0))
await p.waitForTimeout(600)
await p.click('.nav__trigger')
await p.waitForTimeout(700)
await p.screenshot({ path: `${out}/m-nav-open.png` })
await p.click('.nav__item:nth-of-type(2)')
await p.waitForTimeout(1800)
await p.screenshot({ path: `${out}/m-live.png`, fullPage: true })
console.log('route now:', await p.evaluate(() => location.hash))
console.log(errs.length ? 'ERRORS: ' + errs.join(' | ') : 'no page errors')
await b.close()
