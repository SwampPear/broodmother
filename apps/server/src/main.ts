import { startServer } from './index'

const { url, context } = await startServer()
const where = context.config.vaultPath ?? `no vault yet — set one up in ${context.home}`
console.log(`broodmother server on ${url} — ${where}`)
