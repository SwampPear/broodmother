import { startServer } from './index'

const { url, context } = await startServer()
const vault = context.config.vaultPath ?? `no vault yet — pick one in ${context.home}`
console.log(`mother server on ${url} — ${vault}`)
