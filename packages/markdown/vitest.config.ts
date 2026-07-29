import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: '@broodmother/markdown',
    environment: 'node',
    passWithNoTests: true,
  },
})
