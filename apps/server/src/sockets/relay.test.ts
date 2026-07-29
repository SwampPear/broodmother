import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import WebSocket from 'ws'
import { afterAll, describe, expect, it } from 'vitest'
import type { ServerMessage } from '@mother/shared'
import { cleanup, tempDir, until } from '../test/fixtures'
import { type ServerHandle, startServer } from '../index'

const running: ServerHandle[] = []
afterAll(async () => {
  await Promise.all(running.map((handle) => handle.close()))
  await cleanup()
})

async function server() {
  const root = await tempDir()
  const handle = await startServer({ root, home: await tempDir(), port: 0 })
  running.push(handle)
  return Object.assign(handle, { root })
}

interface Client {
  socket: WebSocket
  messages: ServerMessage[]
  close: () => void
}

async function connect(handle: ServerHandle): Promise<Client> {
  const socket = new WebSocket(`ws://127.0.0.1:${handle.port}/ws`)
  const messages: ServerMessage[] = []

  socket.on('message', (data) => messages.push(JSON.parse(String(data)) as ServerMessage))
  await new Promise((resolve) => socket.on('open', resolve))

  return { socket, messages, close: () => socket.close() }
}

describe('relay', () => {
  it('pushes vault events and sync status to every client', async () => {
    const handle = await server()
    const a = await connect(handle)
    await fetch(`${handle.url}/api/doc`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: 'watched.md', markdown: '# watched' }),
    })
    await until(() => a.messages.some((m) => m.type === 'vault'))
    expect(a.messages.find((m) => m.type === 'vault')).toEqual({
      type: 'vault',
      event: { type: 'created', path: 'watched.md' },
    })

    await fetch(`${handle.url}/api/sync/now`, { method: 'POST' })
    await until(() => a.messages.some((m) => m.type === 'sync'))
  })

  /* The route above broadcasts its own write. This is the other half: a write mother did not
     make — a shell, another editor, a sync pull — reaching the app through the watcher, which
     is what lets an open document follow the file. */
  it('pushes a write made behind its back, straight to disk', async () => {
    const handle = await server()
    await handle.context.opened!.watcher.ready
    const a = await connect(handle)

    await writeFile(
      path.join(handle.root, 'elsewhere.md'),
      '# written by something else\n',
    )

    await until(() => a.messages.some((m) => m.type === 'vault'))
    expect(a.messages.find((m) => m.type === 'vault')).toEqual({
      type: 'vault',
      event: { type: 'created', path: 'elsewhere.md' },
    })
  })

  it('drops a client that goes away', async () => {
    const handle = await server()
    const a = await connect(handle)
    await until(() => handle.context.relay.connectionCount === 1)

    a.close()
    await until(() => handle.context.relay.connectionCount === 0)
  })
})
