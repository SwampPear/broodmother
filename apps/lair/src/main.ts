import { startLair } from './index'

const { context, url } = await startLair()
console.log(`lair listening at ${url}, home ${context.home.root}`)
if (context.home.minted)
  console.log(`admin token (shown this once): ${context.home.adminToken}`)
if (context.home.publicKey) console.log(`deploy key: ${context.home.publicKey}`)
