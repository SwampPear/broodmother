import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: '@broodmother/shared',
    environment: 'node',
    passWithNoTests: true,
  },
})
