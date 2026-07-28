import type { NextConfig } from 'next'

const config: NextConfig = {
  transpilePackages: ['@docs/shared', '@docs/editor', '@docs/markdown'],
}

export default config
