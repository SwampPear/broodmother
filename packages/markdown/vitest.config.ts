import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: '@mother/markdown',
    environment: 'node',
    passWithNoTests: true,
  },
})
