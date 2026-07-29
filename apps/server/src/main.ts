import { startServer } from './index'

const { url, context } = await startServer()
const where = !context.project
  ? `no project yet — set one up in ${context.home}`
  : (context.config.vaultPath ?? `no vault yet — pick one in ${context.project.path}`)
console.log(`mother server on ${url} — ${where}`)
