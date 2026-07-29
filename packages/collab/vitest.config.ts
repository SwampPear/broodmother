import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: '@mother/collab',
    environment: 'node',
    passWithNoTests: true,
  },
})
