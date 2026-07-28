import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: '@docs/shared',
    environment: 'node',
    passWithNoTests: true,
  },
})
