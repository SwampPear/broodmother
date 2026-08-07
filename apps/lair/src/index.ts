import { serve, type ServerType } from '@hono/node-server'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { WebSocketServer } from 'ws'
import { LAIR_ROOM_ROUTE } from '@broodmother/shared'
import { createLairApp } from './app'
import { LairContext } from './context'
import { lairHome } from './home'

/** Every interface: the lair is the deployed one, and loopback would be a lair nobody
 *  can reach. What guards it is the key on every route, not the address. */
export const LAIR_BIND = '0.0.0.0'
export const LAIR_PORT = 3131
const HEARTBEAT_MS = 30 * 1000
/** A whole document rides one frame on a first sync, so the ceiling is a document's,
 *  not a chat message's. Above it, ws hangs up for us. */
const MAX_FRAME = 16 * 1024 * 1024

export interface LairHandle {
  context: LairContext
  port: number
  url: string
  close: () => Promise<void>
}

export interface LairOptions {
  home?: string
  port?: number
  bind?: string
}

export async function startLair(options: LairOptions = {}): Promise<LairHandle> {
  const context = await LairContext.create(options.home ?? lairHome())
  const app = createLairApp(context)
  const bind = options.bind ?? process.env.LAIR_BIND ?? LAIR_BIND
  const port = options.port ?? Number(process.env.LAIR_PORT ?? LAIR_PORT)

  const server = (await new Promise<ServerType>((resolve) => {
    const created = serve({ fetch: app.fetch, hostname: bind, port }, () =>
      resolve(created),
    )
  })) as Server

  const sockets = new WebSocketServer({ noServer: true, maxPayload: MAX_FRAME })
  const alive = new Set<import('ws').WebSocket>()
  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url ?? '/', 'http://localhost')
    if (url.pathname !== LAIR_ROOM_ROUTE) return socket.destroy()
    sockets.handleUpgrade(request, socket, head, (ws) => {
      alive.add(ws)
      ws.on('pong', () => alive.add(ws))
      context.rooms.accept(ws, url)
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

  context.dreams.start()
  const opened = server.address() as AddressInfo

  return {
    context,
    port: opened.port,
    url: `http://${bind === '0.0.0.0' ? '127.0.0.1' : bind}:${opened.port}`,
    close: async () => {
      clearInterval(heartbeat)
      context.close()
      sockets.close()
      await new Promise<void>((resolve) => server.close(() => resolve()))
    },
  }
}

export { createLairApp } from './app'
export { LairContext } from './context'
export { lairHome } from './home'
