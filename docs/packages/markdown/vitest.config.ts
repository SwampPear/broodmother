import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: '@docs/markdown',
    environment: 'node',
    passWithNoTests: true,
  },
})
