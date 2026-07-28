import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: '@docs/server',
    environment: 'node',
    passWithNoTests: true,
  },
})
