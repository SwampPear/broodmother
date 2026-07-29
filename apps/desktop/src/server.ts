// The backend, entered without the top-level await `apps/server/src/main.ts` uses: this one
// is bundled to CommonJS so the native pty stays a plain `require` the bundler leaves alone.
import { startServer } from '@broodmother/server'

startServer().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
