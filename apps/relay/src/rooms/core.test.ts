import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import WebSocket from 'ws'
import type { RelayClientMessage, RelayServerMessage } from '@/types'
import { startRelay, type RelayHandle } from '../index'

const ROOM = 'AAAAAAAAAAAAAAAAAAAAAA'
const OTHER = 'BBBBBBBBBBBBBBBBBBBBBB'
const TOKEN = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
const WRONG = 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'

/** A peer with no session behind it: a socket, and whatever it has been told. */
interface Client {
  socket: WebSocket
  seen: RelayServerMessage[]
  send(message: RelayClientMessage): void
  gone(): Promise<number>
}

describe('the relay', () => {
  let relay: RelayHandle
  const open: WebSocket[] = []

  beforeEach(async () => {
    relay = await startRelay(0, '127.0.0.1')
  })

  afterEach(async () => {
    for (const socket of open.splice(0)) socket.close()
    await relay.close()
  })

  async function dial(): Promise<Client> {
    const socket = new WebSocket(`${relay.url.replace(/^http/, 'ws')}/room`)
    open.push(socket)
    const seen: RelayServerMessage[] = []
    socket.on('message', (data) =>
      seen.push(JSON.parse(String(data)) as RelayServerMessage),
    )
    await new Promise((done, fail) => {
      socket.once('open', done)
      socket.once('error', fail)
    })
    return {
      socket,
      seen,
      send: (message) => socket.send(JSON.stringify(message)),
      gone: () =>
        new Promise((done) => {
          if (socket.readyState === WebSocket.CLOSED) return done(0)
          socket.once('close', (code) => done(code))
        }),
    }
  }

  const settle = () => new Promise((done) => setTimeout(done, 30))

  async function join(room = ROOM, token = TOKEN): Promise<Client> {
    const client = await dial()
    client.send({ type: 'hello', room, token })
    await settle()
    return client
  }

  it('tells the first peer in that it is alone, and the second that it is not', async () => {
    const first = await join()
    expect(first.seen).toEqual([{ type: 'joined', peers: 1 }])

    const second = await join()
    expect(second.seen).toEqual([{ type: 'joined', peers: 2 }])
    expect(first.seen.at(-1)).toEqual({ type: 'peers', peers: 2 })
  })

  it('moves a frame to the rest of the room and not back to its sender', async () => {
    const first = await join()
    const second = await join()
    first.seen.length = 0
    second.seen.length = 0

    first.send({ type: 'frame', data: 'sealed-bytes' })
    await settle()

    expect(second.seen).toEqual([{ type: 'frame', data: 'sealed-bytes' }])
    expect(first.seen).toEqual([])
  })

  it('keeps two rooms apart', async () => {
    const here = await join(ROOM)
    const elsewhere = await join(OTHER)
    elsewhere.seen.length = 0

    here.send({ type: 'frame', data: 'not for you' })
    await settle()
    expect(elsewhere.seen).toEqual([])
  })

  it('hangs up on the wrong token', async () => {
    await join(ROOM, TOKEN)
    const intruder = await dial()
    intruder.send({ type: 'hello', room: ROOM, token: WRONG })
    await expect(intruder.gone()).resolves.toBeDefined()
  })

  it('hangs up on a room id that is not one', async () => {
    const client = await dial()
    client.send({ type: 'hello', room: 'nope', token: TOKEN })
    await expect(client.gone()).resolves.toBeDefined()
  })

  it('hangs up on a frame from a socket that never said hello', async () => {
    const client = await dial()
    client.send({ type: 'frame', data: 'sealed-bytes' })
    await expect(client.gone()).resolves.toBeDefined()
  })

  it('hangs up on junk', async () => {
    const client = await dial()
    client.socket.send('{ not json')
    await expect(client.gone()).resolves.toBeDefined()
  })

  it('forgets a room once the last peer leaves', async () => {
    const first = await join()
    const second = await join()
    expect(relay.rooms.count).toBe(1)

    first.socket.close()
    await settle()
    expect(relay.rooms.count).toBe(1)
    expect(second.seen.at(-1)).toEqual({ type: 'peers', peers: 1 })

    second.socket.close()
    await settle()
    expect(relay.rooms.count).toBe(0)
    expect(relay.rooms.sockets).toBe(0)
  })

  describe('what it will tell you about a room', () => {
    it('answers a count to whoever can show the room its own token', async () => {
      await join()
      expect(relay.rooms.peers(ROOM, TOKEN)).toBe(1)
    })

    // The same answer to both, so that asking is not a way to find out which rooms exist.
    it('answers nothing for a wrong token and for a room that is not here', async () => {
      await join()
      expect(relay.rooms.peers(ROOM, WRONG)).toBeNull()
      expect(relay.rooms.peers(OTHER, TOKEN)).toBeNull()
    })
  })

  describe('the http side', () => {
    it('answers /health with what it is holding', async () => {
      await join()
      const health = await fetch(`${relay.url}/health`).then((response) =>
        response.json(),
      )
      expect(health).toMatchObject({ ok: true, rooms: 1, sockets: 1 })
    })

    it('gives an invite link something to land on, and never sees the key', async () => {
      const response = await fetch(`${relay.url}/j/${ROOM}`)
      expect(response.status).toBe(200)
      expect(await response.text()).toContain('broodmother')
    })

    it('has nothing else', async () => {
      expect((await fetch(`${relay.url}/`)).status).toBe(404)
    })
  })
})
