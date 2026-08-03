import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: '@broodmother/notebook',
    environment: 'node',
    passWithNoTests: true,
  },
})
