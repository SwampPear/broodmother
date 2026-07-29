import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: '@mother/server',
    environment: 'node',
    passWithNoTests: true,
  },
})
