import { chromium } from 'playwright'
const b = await chromium.launch({
  executablePath: process.env.CHROME_PATH,
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],
})
for (const [label, url] of [['NATIVE','file:///tmp/artitest/index.html'],
                            ['NO-SCROLL HOST','file:///tmp/artitest/noscroll.html']]) {
  const p = await b.newPage({ viewport: { width: 1440, height: 860 } })
  const errs = []
  p.on('pageerror', e => errs.push(e.message.slice(0,200)))
  await p.goto(url, { waitUntil: 'load' })
  await p.waitForTimeout(4500)
  const mode = await p.evaluate(() => window.__cinematics?.mode?.current ?? window.__cinematics?.mode)
  const p0 = await p.evaluate(() => window.__cinematics?.progress?.current)
  await p.mouse.move(720, 430)
  for (let i = 0; i < 30; i++) { await p.mouse.wheel(0, 500); await p.waitForTimeout(50) }
  await p.waitForTimeout(1800)
  const p1 = await p.evaluate(() => window.__cinematics?.progress?.current)
  const hud = await p.evaluate(() => document.querySelector('.hud__pct')?.textContent)
  console.log(`${label}: mode=${mode} progress ${p0?.toFixed(3)} → ${p1?.toFixed(3)} hud=${hud} errs=${errs.length?errs[0]:'none'}`)
  await p.screenshot({ path: `/home/claude/fb-${label.split(' ')[0].toLowerCase()}.png` })
  await p.close()
}
await b.close()
