import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { RelayMessage } from '@broodmother/shared'
import type { Transport } from '../transport'
import { createSession, type CollabSession, type SessionIo } from './core'

/** The lair in one object: rooms as socket sets, a joined answer, rebroadcast to the
 *  rest. No network, no document, no disk — exactly what the real one holds. */
class FakeHub {
  private members: FakeTransport[] = []

  join(): FakeTransport {
    const transport = new FakeTransport(this)
    this.members.push(transport)
    queueMicrotask(() =>
      transport.deliver({ kind: 'joined', peers: this.members.length - 1 }),
    )
    return transport
  }

  relay(from: FakeTransport, message: RelayMessage): void {
    for (const member of this.members)
      if (member !== from && member.live) member.deliver(message)
  }

  leave(transport: FakeTransport): void {
    this.members = this.members.filter((member) => member !== transport)
  }

  rejoin(transport: FakeTransport): void {
    if (!this.members.includes(transport)) this.members.push(transport)
    transport.deliver({ kind: 'joined', peers: this.members.length - 1 })
  }
}

class FakeTransport implements Transport {
  live = true
  private handlers = new Set<(message: RelayMessage) => void>()
  private liveHandlers = new Set<(live: boolean) => void>()

  constructor(private hub: FakeHub) {}

  send(message: RelayMessage): void {
    if (this.live) this.hub.relay(this, message)
  }

  onMessage(handler: (message: RelayMessage) => void): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  onLive(handler: (live: boolean) => void): () => void {
    this.liveHandlers.add(handler)
    return () => this.liveHandlers.delete(handler)
  }

  close(): void {
    this.drop()
    this.hub.leave(this)
  }

  deliver(message: RelayMessage): void {
    for (const handler of this.handlers) handler(message)
  }

  /** The wifi going, as distinct from leaving on purpose. */
  drop(): void {
    if (!this.live) return
    this.live = false
    this.hub.leave(this)
    for (const handler of this.liveHandlers) handler(false)
  }

  resume(): void {
    this.live = true
    for (const handler of this.liveHandlers) handler(true)
    this.hub.rejoin(this)
  }
}

class FakeIo implements SessionIo {
  writes: string[] = []
  constructor(public file: string) {}
  async read(): Promise<string> {
    return this.file
  }
  async write(text: string): Promise<void> {
    this.file = text
    this.writes.push(text)
  }
}

const settle = async (rounds = 8) => {
  for (let i = 0; i < rounds; i++) await vi.advanceTimersByTimeAsync(10)
}

function join(hub: FakeHub, file: string, name = 'peer') {
  const io = new FakeIo(file)
  const transport = hub.join()
  const session = createSession({
    transport,
    io,
    identity: { name, color: '#8fb8d8' },
    flushMs: 20,
  })
  return { session, io, transport }
}

let open: CollabSession[]

beforeEach(() => {
  vi.useFakeTimers()
  open = []
})

afterEach(async () => {
  for (const session of open) await session.close()
  vi.useRealTimers()
})

const track = <T extends { session: CollabSession }>(made: T): T => {
  open.push(made.session)
  return made
}

it('first in seeds from its file, second in adopts room state', async () => {
  const hub = new FakeHub()
  const first = track(join(hub, '# Notes\n'))
  await settle()
  expect(first.session.state()).toMatchObject({ mode: 'live', text: '# Notes\n' })

  const second = track(join(hub, ''))
  await settle()
  // Adopted, not re-seeded: the second file was empty and the text is the first's.
  expect(second.session.state()).toMatchObject({ mode: 'live', text: '# Notes\n' })
  expect(second.io.file).toBe('# Notes\n')
})

it('converges two sessions editing at once', async () => {
  const hub = new FakeHub()
  const first = track(join(hub, 'shared\n'))
  await settle()
  const second = track(join(hub, ''))
  await settle()

  first.session.text.insert(0, 'top ')
  second.session.text.insert(second.session.text.length, 'bottom')
  await settle()

  expect(first.session.state().text).toBe(second.session.state().text)
  expect(first.session.state().text).toContain('top ')
  expect(first.session.state().text).toContain('bottom')
  expect(first.io.file).toBe(second.io.file)
})

it('goes divergent on a differing file and never merges', async () => {
  const hub = new FakeHub()
  const first = track(join(hub, 'the room version\n'))
  await settle()
  const second = track(join(hub, 'my own version\n'))
  await settle()

  expect(second.session.state().mode).toBe('divergent')
  expect(second.session.state().text).toBe('the room version\n')
  // Nothing wrote over the file while the question stood.
  expect(second.io.file).toBe('my own version\n')
  expect(second.io.writes).toEqual([])
})

it('resolving for the room writes it; leaving keeps the file', async () => {
  const hub = new FakeHub()
  track(join(hub, 'the room version\n'))
  await settle()
  const taker = track(join(hub, 'mine\n'))
  await settle()
  await taker.session.resolve('room')
  expect(taker.io.file).toBe('the room version\n')
  expect(taker.session.state().mode).toBe('live')

  const leaver = track(join(hub, 'also mine\n'))
  await settle()
  await leaver.session.resolve('leave')
  expect(leaver.io.file).toBe('also mine\n')
  expect(leaver.io.writes).toEqual([])
})

it('drops to solo when the transport dies, and keeps flushing', async () => {
  const hub = new FakeHub()
  const first = track(join(hub, 'alone soon\n'))
  await settle()

  first.transport.drop()
  expect(first.session.state().mode).toBe('solo')

  first.session.text.insert(0, 'offline ')
  await settle()
  expect(first.io.file).toBe('offline alone soon\n')
})

it('resyncs on reconnect with nothing lost on either side', async () => {
  const hub = new FakeHub()
  const first = track(join(hub, 'base\n'))
  await settle()
  const second = track(join(hub, ''))
  await settle()

  second.transport.drop()
  first.session.text.insert(0, 'from-first ')
  second.session.text.insert(second.session.text.length, 'from-second')
  await settle()

  second.transport.resume()
  await settle()

  expect(second.session.state().mode).toBe('live')
  expect(first.session.state().text).toBe(second.session.state().text)
  expect(first.session.state().text).toContain('from-first ')
  expect(first.session.state().text).toContain('from-second')
})

it('carries presence both ways', async () => {
  const hub = new FakeHub()
  const first = track(join(hub, 'hello\n', 'Ada'))
  await settle()
  const second = track(join(hub, '', 'Lin'))
  await settle()

  expect(first.session.state().peers.map((peer) => peer.name)).toEqual(['Lin'])
  expect(second.session.state().peers.map((peer) => peer.name)).toEqual(['Ada'])

  await second.session.close()
  open = open.filter((session) => session !== second.session)
  await settle()
  expect(first.session.state().peers).toEqual([])
})

it('flushes through the debounce, not on every keystroke', async () => {
  const hub = new FakeHub()
  const first = track(join(hub, ''))
  await settle()
  first.io.writes.length = 0

  first.session.text.insert(0, 'a')
  await vi.advanceTimersByTimeAsync(5)
  first.session.text.insert(1, 'b')
  await vi.advanceTimersByTimeAsync(5)
  first.session.text.insert(2, 'c')
  await settle()

  expect(first.io.writes).toEqual(['abc'])
})
