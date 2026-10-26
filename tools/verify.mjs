import { chromium } from 'playwright'
const b = await chromium.launch({
  executablePath: process.env.CHROME_PATH,
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],
})
const p = await b.newPage({ viewport: { width: 1440, height: 860 } })
const logs = []
p.on('console', m => logs.push(`[${m.type()}] ${m.text().slice(0,200)}`))
p.on('pageerror', e => logs.push(`PAGEERROR: ${e.message.slice(0,300)}`))
p.on('requestfailed', r => logs.push(`REQFAIL: ${r.url().slice(0,120)} ${r.failure()?.errorText}`))

await p.goto(process.argv[2], { waitUntil: 'load' })
await p.waitForTimeout(4000)

const diag = await p.evaluate(() => ({
  canvas: !!document.querySelector('canvas'),
  canvasSize: (() => { const c=document.querySelector('canvas'); return c? `${c.width}x${c.height}`:'-' })(),
  root: document.getElementById('root')?.children.length,
  track: document.querySelector('.home__track')?.getBoundingClientRect().height,
  scrollH: document.documentElement.scrollHeight,
  innerH: window.innerHeight,
  bodyOverflow: getComputedStyle(document.body).overflow,
  htmlOverflow: getComputedStyle(document.documentElement).overflow,
  cinematics: !!window.__cinematics,
  loaderGone: !document.querySelector('.loader'),
}))
console.log(JSON.stringify(diag, null, 1))
console.log('--- logs ---')
console.log(logs.slice(0, 25).join('\n') || '(none)')
await p.screenshot({ path: '/home/claude/verify-0.png' })
if (diag.cinematics) {
  await p.evaluate(() => window.__cinematics.seek(0.85))
  await p.waitForTimeout(1500)
  await p.screenshot({ path: '/home/claude/verify-85.png' })
}
await b.close()
