import { chromium } from 'playwright'
const b = await chromium.launch({
  executablePath: process.env.CHROME_PATH,
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],
})
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
const errs = []
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message.slice(0,200)))
p.on('console', m => { if (m.type()==='error') errs.push('[err] ' + m.text().slice(0,200)) })

const state = async (tag) => {
  const d = await p.evaluate(() => ({
    hash: location.hash,
    kids: [...(document.getElementById('root')?.children ?? [])].map(n => n.className.split(' ')[0] || n.tagName),
    canvas: !!document.querySelector('canvas'),
    noWebgl: !!document.querySelector('.no-webgl'),
    hero: document.querySelector('.layer--hero')?.style.opacity,
    mode: window.__cinematics?.mode?.current,
  }))
  console.log(tag, JSON.stringify(d))
}

await p.goto('file:///tmp/artitest/index.html', { waitUntil: 'load' })
await p.waitForTimeout(3500); await state('1 home     ')
await p.screenshot({ path: '/home/claude/rt-1-home.png' })

await p.click('.nav__trigger'); await p.waitForTimeout(500)
await p.click('.nav__item:nth-of-type(2)'); await p.waitForTimeout(2500); await state('2 → live   ')
await p.screenshot({ path: '/home/claude/rt-2-live.png' })

await p.click('.nav__trigger'); await p.waitForTimeout(500)
await p.click('.nav__item:nth-of-type(1)'); await p.waitForTimeout(3500); await state('3 → home   ')
await p.screenshot({ path: '/home/claude/rt-3-home.png' })

// scroll works after the round trip?
await p.mouse.move(720, 450)
for (let i=0;i<20;i++){ await p.mouse.wheel(0,500); await p.waitForTimeout(50) }
await p.waitForTimeout(1500)
console.log('4 progress after round-trip scroll:', await p.evaluate(() => window.__cinematics?.progress?.current?.toFixed(3)))
await p.screenshot({ path: '/home/claude/rt-4-scrolled.png' })

console.log('errors:', errs.length ? errs.join('\n') : 'none')
await b.close()
