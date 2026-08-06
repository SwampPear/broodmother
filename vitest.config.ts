import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    passWithNoTests: true,
    projects: ['apps/*', 'apps/app/server', 'src'],
  },
})
