import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// SINGLE=1 produces one self-contained index.html (used for the hosted preview).
// Normal builds emit a conventional /dist with split assets.
const SINGLE = process.env.SINGLE === '1'

export default defineConfig({
  base: './',
  plugins: [react(), ...(SINGLE ? [viteSingleFile()] : [])],
  build: {
    // Inline fonts so troika (3D text) and CSS never hit the network in the
    // single-file build. 4 MB ceiling comfortably covers the latin subsets.
    assetsInlineLimit: SINGLE ? 4 * 1024 * 1024 : 4096,
    cssCodeSplit: !SINGLE,
    chunkSizeWarningLimit: 2000,
  },
  assetsInclude: ['**/*.woff', '**/*.woff2'],
})
