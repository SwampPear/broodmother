import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

export default defineConfig({
  resolve: { alias: { '@': resolve(root, 'src') } },
  test: {
    name: '@broodmother/relay',
    environment: 'node',
    passWithNoTests: true,
  },
})
