import { startServer } from './index'

const { url, manager } = await startServer()
const where = manager.config.vaultPath ?? `no vault yet — set one up in ${manager.home}`
console.log(`broodmother server on ${url} — ${where}`)
