import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: '@broodmother/server',
    environment: 'node',
    passWithNoTests: true,
  },
})
