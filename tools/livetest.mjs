import { chromium } from 'playwright'
const b = await chromium.launch({
  executablePath: process.env.CHROME_PATH,
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],
})

async function probe(label, go) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  const errs = []
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message.slice(0, 400)))
  p.on('console', m => { if (m.type() === 'error') errs.push('[err] ' + m.text().slice(0, 300)) })
  p.on('requestfailed', r => errs.push('REQFAIL ' + r.url().slice(0,100) + ' ' + r.failure()?.errorText))
  await go(p)
  await p.waitForTimeout(3500)
  const d = await p.evaluate(() => ({
    hash: location.hash,
    liveEl: !!document.querySelector('.live'),
    liveChildren: document.querySelector('.live')?.children.length ?? -1,
    liveRect: (() => { const e=document.querySelector('.live'); if(!e) return null
      const r=e.getBoundingClientRect(); return `${Math.round(r.width)}x${Math.round(r.height)} @${Math.round(r.y)}` })(),
    fallback: !!document.querySelector('.route-fallback'),
    rootKids: [...(document.getElementById('root')?.children ?? [])].map(n => n.className || n.tagName),
    docH: document.documentElement.scrollHeight,
    wordmark: document.querySelector('.live__wordmark')?.textContent?.trim(),
  }))
  console.log(`\n=== ${label} ===`)
  console.log(JSON.stringify(d, null, 1))
  console.log('errors:', errs.length ? errs.slice(0,5).join('\n') : 'none')
  await p.screenshot({ path: `/home/claude/live-${label}.png` })
  await p.close()
}

await probe('direct', async (p) => {
  await p.goto('file:///tmp/artitest/index.html#/live', { waitUntil: 'load' })
})

await probe('via-nav', async (p) => {
  await p.goto('file:///tmp/artitest/index.html', { waitUntil: 'load' })
  await p.waitForTimeout(3000)
  await p.click('.nav__trigger')
  await p.waitForTimeout(600)
  await p.click('.nav__item:nth-of-type(2)')
})

await b.close()
