import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http'
import type { AddressInfo } from 'node:net'
import { WebSocketServer, type WebSocket } from 'ws'
import { Rooms } from './rooms'

/**
 * Unlike the app's own server, this one is meant to be reachable — it is the only thing in
 * this repo that is. It still defaults to loopback, so that running it while you work does
 * not put it on the coffee shop's wifi; a deployment sets `RELAY_HOST=0.0.0.0` and means it.
 */
export const HOST = process.env.RELAY_HOST ?? '127.0.0.1'
export const PORT = Number(process.env.RELAY_PORT ?? 3002)

/** The socket route. The room is named in the hello rather than here, so nothing upstream
 *  of this process — a proxy, an access log — collects room ids. Matched in
 *  `src/collab/invite.ts`, which is what dials it. */
const SOCKET = '/room'

/** How often a socket is asked whether anything is still on the other end. A laptop that
 *  slept leaves a socket open here and gone there, and a room full of those is a room whose
 *  peer count lies to the next person who joins it. */
const HEARTBEAT_MS = 30 * 1000

export interface RelayHandle {
  rooms: Rooms
  port: number
  url: string
  close: () => Promise<void>
}

export async function startRelay(port = PORT, host = HOST): Promise<RelayHandle> {
  const rooms = new Rooms()
  const started = Date.now()
  const server: Server = createServer((request, response) =>
    route(request, response, rooms, started),
  )

  // A port already in use is the ordinary way for this to fail to start, and it deserves a
  // sentence rather than the stack of an unhandled error event.
  await new Promise<void>((resolve, reject) => {
    const failed = (error: NodeJS.ErrnoException) =>
      reject(
        error.code === 'EADDRINUSE'
          ? new Error(`something is already listening on ${host}:${port}`)
          : error,
      )
    server.once('error', failed)
    server.listen(port, host, () => {
      server.off('error', failed)
      resolve()
    })
  })

  const sockets = new WebSocketServer({ noServer: true })
  const alive = new Set<WebSocket>()

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url ?? '/', 'http://localhost')
    if (url.pathname !== SOCKET) return socket.destroy()
    sockets.handleUpgrade(request, socket, head, (ws) => {
      alive.add(ws)
      ws.on('pong', () => alive.add(ws))
      rooms.accept(ws)
    })
  })

  const heartbeat = setInterval(() => {
    for (const ws of sockets.clients) {
      if (!alive.has(ws)) {
        ws.terminate()
        continue
      }
      alive.delete(ws)
      ws.ping()
    }
  }, HEARTBEAT_MS)
  heartbeat.unref?.()

  const actual = (server.address() as AddressInfo).port
  return {
    rooms,
    port: actual,
    url: `http://${host}:${actual}`,
    close: async () => {
      clearInterval(heartbeat)
      rooms.close()
      sockets.close()
      await new Promise<void>((resolve) => server.close(() => resolve()))
    },
  }
}

/**
 * Two routes and a 404. `/health` is for whatever is running this; `/j/…` is where an invite
 * points, and it exists so that a link somebody clicks says what it is rather than failing.
 * The key is in the fragment, which a browser keeps to itself — this page never sees it.
 */
function route(
  request: IncomingMessage,
  response: ServerResponse,
  rooms: Rooms,
  started: number,
): void {
  const url = new URL(request.url ?? '/', 'http://localhost')

  if (url.pathname === '/health') {
    response.writeHead(200, { 'content-type': 'application/json' })
    return void response.end(
      JSON.stringify({
        ok: true,
        rooms: rooms.count,
        sockets: rooms.sockets,
        uptime: Math.round((Date.now() - started) / 1000),
      }),
    )
  }

  /**
   * How many are in a room, for whoever can show the room's own token. Missing and wrong get
   * the same 404 as a room that is not here: an answer that told them apart would turn this
   * into a way to find out which rooms exist.
   */
  if (url.pathname.startsWith('/rooms/')) {
    const bearer = /^Bearer (.+)$/.exec(request.headers.authorization ?? '')
    const peers = bearer
      ? rooms.peers(url.pathname.slice('/rooms/'.length), bearer[1]!)
      : null
    if (peers === null) {
      response.writeHead(404, { 'content-type': 'application/json' })
      return void response.end('{"error":"no such room"}')
    }
    response.writeHead(200, { 'content-type': 'application/json' })
    return void response.end(JSON.stringify({ peers }))
  }

  if (url.pathname.startsWith('/j/')) {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    return void response.end(PAGE)
  }

  response.writeHead(404, { 'content-type': 'text/plain' })
  response.end('not here\n')
}

const PAGE = `<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>a broodmother document</title>
<style>
  body { font: 16px/1.6 system-ui, sans-serif; margin: 12vh auto; max-width: 32rem; padding: 0 1.5rem }
  p { color: #444 } code { background: #f2f2f2; padding: .1rem .3rem; border-radius: .2rem }
  @media (prefers-color-scheme: dark) {
    body { background: #111; color: #eee } p { color: #aaa } code { background: #222 }
  }
</style>
<h1>Somebody shared a document with you.</h1>
<p>Copy this page's address and paste it into broodmother — <code>⌘K</code>, then
<b>Join a shared document</b>. The part after the <code>#</code> is the key that opens it,
and your browser has never sent it here.</p>
`

export { Rooms } from './rooms'
