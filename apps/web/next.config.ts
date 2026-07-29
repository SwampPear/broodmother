import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { NextConfig } from 'next'

const config: NextConfig = {
  transpilePackages: ['@mother/shared', '@mother/editor', '@mother/markdown'],
  // The npm package ships this build, so it has to carry its own node_modules; tracing
  // starts at the monorepo root or the workspace packages are left behind.
  output: 'standalone',
  outputFileTracingRoot: resolve(dirname(fileURLToPath(import.meta.url)), '../..'),
}

export default config
