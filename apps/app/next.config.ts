import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { NextConfig } from 'next'

const config: NextConfig = {
  devIndicators: false,
  // The desktop app ships this site as a server it starts itself, so the build has to
  // carry its own node_modules — traced from the repo root, or `@/` and the hoisted
  // dependencies resolve to nothing.
  output: 'standalone',
  outputFileTracingRoot: resolve(dirname(fileURLToPath(import.meta.url)), '../..'),
}

export default config
