import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: '@broodmother/collab',
    environment: 'node',
    passWithNoTests: true,
  },
})
