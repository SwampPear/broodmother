import { startServer } from './index'

const { url, context } = await startServer()
console.log(`mother server on ${url} — vault ${context.config.vaultPath}`)
