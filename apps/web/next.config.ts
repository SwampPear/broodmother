import type { NextConfig } from 'next'

const config: NextConfig = {
  transpilePackages: ['@mother/shared', '@mother/editor', '@mother/markdown'],
  devIndicators: false,
}

export default config
