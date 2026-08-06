import { HOST, startRelay } from './index'

// A port already taken is the ordinary way for this to fail, and what it deserves is a line
// rather than the stack of a rejected top-level await.
const relay = await startRelay().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})

console.log(
  `broodmother relay on ${relay.url} — holding ${relay.rooms.count} rooms and no documents`,
)
if (HOST === '127.0.0.1')
  console.log('loopback only. set RELAY_HOST=0.0.0.0 to let other machines reach it.')
