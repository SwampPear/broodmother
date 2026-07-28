import { startServer } from './index'

const { url, context } = await startServer()
console.log(`docs server on ${url} — vault ${context.config.vaultPath}`)
