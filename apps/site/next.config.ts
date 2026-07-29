import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { NextConfig } from 'next'

const config: NextConfig = {
  outputFileTracingRoot: resolve(dirname(fileURLToPath(import.meta.url)), '../..'),
  devIndicators: false,
}

export default config
