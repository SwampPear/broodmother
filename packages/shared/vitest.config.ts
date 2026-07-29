import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: '@mother/shared',
    environment: 'node',
    passWithNoTests: true,
  },
})
