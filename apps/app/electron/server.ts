import { startServer } from '@broodmother/server'

startServer().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
