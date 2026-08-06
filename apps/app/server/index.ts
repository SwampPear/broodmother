import { serve, type ServerType } from '@hono/node-server'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { WebSocketServer, type WebSocket } from 'ws'
import type { DocRoot, WsRoute } from '@/types'
import { createApp } from './app'
import { VaultManager, type ManagerOptions } from './manager'

/** Loopback only: there is no auth and full read/write access to the project. */
export const HOST = '127.0.0.1'
export const PORT = 3001
/** How often a socket is asked whether anything is still on the other end of it. */
const HEARTBEAT_MS = 30 * 1000

export interface ServerHandle {
  manager: VaultManager
  port: number
  url: string
  close: () => Promise<void>
}

export async function startServer(
  options: ManagerOptions & { port?: number } = {},
): Promise<ServerHandle> {
  const manager = await VaultManager.create(options)
  const app = createApp(manager)

  const server = (await new Promise<ServerType>((resolve) => {
    const created = serve(
      { fetch: app.fetch, hostname: HOST, port: options.port ?? PORT },
      () => resolve(created),
    )
  })) as Server

  // One socket server, dispatched by path: `path` on two of them 400s the other's route.
  const sockets = new WebSocketServer({ noServer: true })
  const routes: Record<WsRoute, (socket: WebSocket, url: URL) => void> = {
    '/ws': (socket, url) => manager.relay.accept(socket, url.searchParams.get('vault')),
    // A shell opens in the root it was asked for, so a terminal started in one project does
    // not follow the scope somewhere else between the click and the spawn. A socket that
    // names a session is one coming back to a shell it left running. The window's vault is
    // opened first — a window can outlive a server restart — and a vault that is gone
    // answers by hanging up, which sends the client to the picker.
    '/terminal': (socket, url) => {
      const vault = url.searchParams.get('vault')
      void manager
        .context(vault)
        .then(() =>
          manager.terminals.accept(socket, {
            vault,
            root: url.searchParams.get('root') as DocRoot | null,
            session: url.searchParams.get('session'),
          }),
        )
        .catch(() => socket.close())
    },
    // The kernel proxy is the notebook plan's phase 2; until it lands, the route answers
    // by hanging up, and no client dials it.
    '/kernel': (socket) => socket.close(),
  }
  /**
   * The sockets that have answered since they were last asked. Sleep and a frozen tab both
   * leave a socket open at this end and gone at the other, with nothing arriving to say so —
   * the shell behind one would go on believing it is being watched, and would not be there
   * to be reattached to. Two rounds of silence and the socket is closed, which is what tells
   * the terminal to let go of it.
   */
  const alive = new Set<WebSocket>()
  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url ?? '/', 'http://localhost')
    const route = routes[url.pathname as WsRoute] as
      ((socket: WebSocket, url: URL) => void) | undefined
    if (!route) return socket.destroy()
    sockets.handleUpgrade(request, socket, head, (ws) => {
      alive.add(ws)
      ws.on('pong', () => alive.add(ws))
      route(ws, url)
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
  const { port } = server.address() as AddressInfo
  const url = `http://${HOST}:${port}`
  manager.start(url)

  return {
    manager,
    port,
    url,
    close: async () => {
      clearInterval(heartbeat)
      await manager.closeAll()
      sockets.close()
      await new Promise<void>((resolve) => server.close(() => resolve()))
    },
  }
}

export { createApp } from './app'
export { VaultManager } from './manager'
export { VaultContext } from './context'
