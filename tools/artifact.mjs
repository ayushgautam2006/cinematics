/**
 * Turns the single-file production build into a page fragment.
 *
 * The hosting layer supplies its own <!doctype>, <html>, <head> and <body>,
 * so this strips those and emits only what belongs inside them: the <title>,
 * the inlined <style> blocks, and the body content including the bundle.
 *
 *   SINGLE=1 npm run build && node tools/artifact.mjs
 */

import { readFileSync, writeFileSync, statSync } from 'node:fs'

const src = readFileSync('dist/index.html', 'utf8')

const head = src.match(/<head>([\s\S]*?)<\/head>/i)?.[1] ?? ''
const body = src.match(/<body>([\s\S]*?)<\/body>/i)?.[1] ?? ''

const title = head.match(/<title>[\s\S]*?<\/title>/i)?.[0] ?? ''
const styles = head.match(/<style[\s\S]*?<\/style>/gi)?.join('\n') ?? ''
const icon = head.match(/<link[^>]*rel="icon"[\s\S]*?>/i)?.[0] ?? ''

/* vite-plugin-singlefile inlines the module bundle into <head>, not <body>,
   so scripts are collected from both and re-emitted after the markup. */
const scripts = [
  ...(head.match(/<script[\s\S]*?<\/script>/gi) ?? []),
  ...(body.match(/<script[\s\S]*?<\/script>/gi) ?? []),
]
const markup = body.replace(/<script[\s\S]*?<\/script>/gi, '').trim()

const out = `${title}\n${icon}\n${styles}\n${markup}\n${scripts.join('\n')}\n`

writeFileSync('dist/artifact.html', out)

const kb = (n) => `${(n / 1024).toFixed(0)} KB`
console.log('dist/artifact.html', kb(statSync('dist/artifact.html').size))
console.log('styles:', styles.length ? 'inlined' : 'MISSING')
console.log('scripts:', scripts.length ? `${scripts.length} inlined` : 'MISSING')
console.log('external refs:', (out.match(/https?:\/\/(?!www\.w3\.org)/g) || []).length)
