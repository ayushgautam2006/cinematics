import { chromium } from 'playwright'
const b = await chromium.launch({
  executablePath: process.env.CHROME_PATH,
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],
})
const p = await b.newPage({ viewport: { width: 1440, height: 860 } })
const logs = []
p.on('pageerror', e => logs.push('PAGEERROR: ' + e.message.slice(0,300)))
p.on('console', m => { if (m.type()==='error') logs.push('[err] ' + m.text().slice(0,200)) })

await p.goto('file:///tmp/artitest/frame.html', { waitUntil: 'load' })
await p.waitForTimeout(7000)

const f = p.frames().find(fr => fr.url().endsWith('/index.html'))
console.log('frame found:', !!f)

const before = await f.evaluate(() => ({
  scrollH: document.documentElement.scrollHeight,
  innerH: window.innerHeight,
  canScroll: document.documentElement.scrollHeight - window.innerHeight,
  progress: window.__cinematics?.progress?.current,
  loader: !!document.querySelector('.loader'),
}))
console.log('before scroll:', JSON.stringify(before))

// simulate a real wheel gesture over the iframe
for (let i = 0; i < 25; i++) {
  await p.mouse.wheel(0, 400)
  await p.waitForTimeout(60)
}
await p.waitForTimeout(1500)

const after = await f.evaluate(() => ({
  scrollY: window.scrollY,
  progress: window.__cinematics?.progress?.current,
  hud: document.querySelector('.hud__pct')?.textContent,
}))
console.log('after wheel:', JSON.stringify(after))
console.log('logs:', logs.slice(0,10).join('\n') || '(none)')
await p.screenshot({ path: '/home/claude/iframe-after.png' })
await b.close()
