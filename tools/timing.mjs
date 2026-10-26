import { chromium } from 'playwright'
const b = await chromium.launch({
  executablePath: process.env.CHROME_PATH,
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],
})
const p = await b.newPage({ viewport: { width: 1440, height: 860 } })
await p.goto('file:///tmp/artitest/index.html', { waitUntil: 'commit' })
for (const t of [50, 100, 150, 250, 500, 1000, 2000, 4000]) {
  await p.waitForTimeout(t === 50 ? 50 : t - (arguments?.prev ?? 0))
  const d = await p.evaluate(() => ({
    de: document.documentElement.scrollHeight,
    body: document.body.scrollHeight,
    inner: window.innerHeight,
    track: document.querySelector('.home__track')?.getBoundingClientRect().height ?? null,
    trackStyle: document.querySelector('.home__track')?.style.height ?? null,
  }))
  console.log(t + 'ms', JSON.stringify(d))
}
await b.close()
