import WebSocket from 'ws'
import * as Y from 'yjs'
import { afterAll, describe, expect, it } from 'vitest'
import type { ClientMessage, Peer, ServerMessage } from '@mother/shared'
import { cleanup, delay, tempDir, until } from './fixtures'
import { type ServerHandle, startServer } from './index'

const running: ServerHandle[] = []
afterAll(async () => {
  await Promise.all(running.map((handle) => handle.close()))
  await cleanup()
})

async function server() {
  const handle = await startServer({
    root: await tempDir(),
    home: await tempDir(),
    port: 0,
  })
  running.push(handle)
  return handle
}

interface Client {
  socket: WebSocket
  doc: Y.Doc
  messages: ServerMessage[]
  send: (message: ClientMessage) => void
  sessions: () => Extract<ServerMessage, { type: 'session' }>[]
  close: () => void
}

async function connect(handle: ServerHandle): Promise<Client> {
  const socket = new WebSocket(`ws://127.0.0.1:${handle.port}/ws`)
  const messages: ServerMessage[] = []
  const doc = new Y.Doc()

  socket.on('message', (data) => {
    const message = JSON.parse(String(data)) as ServerMessage
    messages.push(message)
    if (message.type === 'update')
      Y.applyUpdate(doc, new Uint8Array(Buffer.from(message.update, 'base64')))
  })
  await new Promise((resolve) => socket.on('open', resolve))

  return {
    socket,
    doc,
    messages,
    send: (message) => socket.send(JSON.stringify(message)),
    sessions: () => messages.filter((m) => m.type === 'session'),
    close: () => socket.close(),
  }
}

const push = (client: Client, room: string) =>
  client.send({
    type: 'update',
    room,
    update: Buffer.from(Y.encodeStateAsUpdate(client.doc)).toString('base64'),
  })

describe('relay', () => {
  it('qualifies the room id and includes the joiner in its own peer list', async () => {
    const handle = await server()
    const a = await connect(handle)
    a.send({ type: 'join', room: 'notes/a.md', path: 'notes/a.md' })
    await until(() => a.sessions().length > 0)

    const first = a.sessions()[0]!
    expect(first.room).toMatch(/^[0-9a-f]{12}\/notes\/a\.md$/)
    expect(first.peers).toHaveLength(1)
    expect(first.state).toBe('live')

    const b = await connect(handle)
    b.send({ type: 'join', room: 'notes/a.md', path: 'notes/a.md' })
    await until(() => b.sessions().length > 0)

    expect(b.sessions()[0]!.room).toBe(first.room)
    expect(b.sessions()[0]!.peers).toHaveLength(2)
    expect(new Set(b.sessions()[0]!.peers.map((p: Peer) => p.id)).size).toBe(2)
  })

  it('tells the existing members about a join and a leave', async () => {
    const handle = await server()
    const a = await connect(handle)
    a.send({ type: 'join', room: 'a.md', path: 'a.md' })
    await until(() => a.sessions().length === 1)

    const b = await connect(handle)
    b.send({ type: 'join', room: 'a.md', path: 'a.md' })
    await until(() => a.sessions().length === 2)
    expect(a.sessions()[1]!.peers).toHaveLength(2)

    b.send({ type: 'leave', room: a.sessions()[0]!.room })
    await until(() => a.sessions().length === 3)
    expect(a.sessions()[2]!.peers).toHaveLength(1)
  })

  it('converges two clients in a room', async () => {
    const handle = await server()
    const a = await connect(handle)
    const b = await connect(handle)
    a.send({ type: 'join', room: 'a.md', path: 'a.md' })
    b.send({ type: 'join', room: 'a.md', path: 'a.md' })
    await until(() => a.sessions().length > 0 && b.sessions().length > 0)
    const room = a.sessions()[0]!.room

    a.doc.getText('body').insert(0, 'polymerase kinetics')
    push(a, room)
    await until(() => b.doc.getText('body').toString() === 'polymerase kinetics')

    b.doc.getText('body').insert(0, 'EIS: ')
    push(b, room)
    await until(() => a.doc.getText('body').toString() === 'EIS: polymerase kinetics')
  })

  it('gives a late joiner the room state it missed', async () => {
    const handle = await server()
    const a = await connect(handle)
    a.send({ type: 'join', room: 'a.md', path: 'a.md' })
    await until(() => a.sessions().length > 0)
    const room = a.sessions()[0]!.room
    a.doc.getText('body').insert(0, 'seeded')
    push(a, room)
    await delay(50)

    const late = await connect(handle)
    late.send({ type: 'join', room: 'a.md', path: 'a.md' })
    await until(() => late.doc.getText('body').toString() === 'seeded')
  })

  it('forwards awareness to the other clients only', async () => {
    const handle = await server()
    const a = await connect(handle)
    const b = await connect(handle)
    a.send({ type: 'join', room: 'a.md', path: 'a.md' })
    b.send({ type: 'join', room: 'a.md', path: 'a.md' })
    await until(() => a.sessions().length > 0 && b.sessions().length > 0)

    a.send({ type: 'awareness', room: a.sessions()[0]!.room, awareness: 'YWJj' })
    await until(() => b.messages.some((m) => m.type === 'awareness'))
    expect(a.messages.some((m) => m.type === 'awareness')).toBe(false)
  })

  it('destroys the room when the last client leaves', async () => {
    const handle = await server()
    const a = await connect(handle)
    const b = await connect(handle)
    a.send({ type: 'join', room: 'a.md', path: 'a.md' })
    b.send({ type: 'join', room: 'a.md', path: 'a.md' })
    await until(() => handle.context.relay.roomCount === 1)
    expect(handle.context.relay.hasLiveSession()).toBe(true)

    b.send({ type: 'leave', room: a.sessions()[0]!.room })
    await delay(50)
    expect(handle.context.relay.roomCount).toBe(1)

    a.close()
    await until(() => handle.context.relay.roomCount === 0)
    expect(handle.context.relay.hasLiveSession()).toBe(false)
  })

  it('leaves the room when a client keeps its local file', async () => {
    const handle = await server()
    const a = await connect(handle)
    a.send({ type: 'join', room: 'a.md', path: 'a.md' })
    await until(() => handle.context.relay.roomCount === 1)

    a.send({
      type: 'resolveDivergence',
      room: a.sessions()[0]!.room,
      choice: 'keepLocal',
    })
    await until(() => handle.context.relay.roomCount === 0)
  })

  it('ignores updates for a room the client never joined', async () => {
    const handle = await server()
    const a = await connect(handle)
    a.send({ type: 'update', room: 'ghost.md', update: 'AAA=' })
    await delay(50)
    expect(handle.context.relay.roomCount).toBe(0)
    expect(a.messages).toEqual([])
  })

  it('answers a malformed message with an error', async () => {
    const handle = await server()
    const a = await connect(handle)
    a.socket.send('not json')
    await until(() => a.messages.some((m) => m.type === 'error'))
  })

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
})
