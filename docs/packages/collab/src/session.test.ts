import { afterEach, describe, expect, it, vi } from 'vitest'
import * as Y from 'yjs'
import type { VaultPath } from '@docs/shared'
import { createSession } from './session'
import { FakeRelay, codec, memoryIo } from './fixtures'
import type { FakeTransport } from './fixtures'
import type { Session } from './types'

const PATH: VaultPath = 'ECSEQ-1/Whitepaper.md'
const ROOM = `vault/${PATH}`

const opened: Session[] = []

const open = async (relay: FakeRelay, id: string, markdown: string) => {
  const identity = { id, displayName: id.toUpperCase(), color: '#8ec' }
  const io = memoryIo({ [PATH]: markdown })
  const transport = relay.transport(identity)
  const session = await createSession({
    roomId: ROOM,
    path: PATH,
    identity,
    transport,
    codec,
    io,
    flushDelay: 500,
  })
  opened.push(session)
  return { session, io, transport: transport as FakeTransport }
}

const append = (session: Session, text: string) => {
  const paragraph = new Y.XmlElement('paragraph')
  const content = new Y.XmlText()
  content.insert(0, text)
  paragraph.insert(0, [content])
  session.fragment.insert(session.fragment.length, [paragraph])
}

afterEach(async () => {
  vi.useRealTimers()
  await Promise.all(opened.splice(0).map((session) => session.destroy()))
})

describe('seed vs adopt', () => {
  it('seeds the room from its file when it is first in', async () => {
    const relay = new FakeRelay()
    const a = await open(relay, 'a', 'one')

    a.session.connect()

    expect(a.session.role).toBe('seed')
    expect(a.session.state).toBe('live')
    expect(a.session.markdown()).toBe('one')
  })

  it('adopts room state when it is not first in', async () => {
    const relay = new FakeRelay()
    const a = await open(relay, 'a', 'one')
    a.session.connect()
    const b = await open(relay, 'b', 'one')

    b.session.connect()

    expect(b.session.role).toBe('adopt')
    expect(b.session.state).toBe('live')
    expect(b.session.markdown()).toBe('one')
  })

  it('does not duplicate the document when both sides hold the same file', async () => {
    const relay = new FakeRelay()
    const a = await open(relay, 'a', 'one')
    a.session.connect()
    const b = await open(relay, 'b', 'one')

    b.session.connect()

    expect(a.session.markdown()).toBe('one')
    expect(a.session.fragment.length).toBe(1)
    expect(b.session.fragment.length).toBe(1)
  })

  it('gives a third client the room, not the second client’s file', async () => {
    const relay = new FakeRelay()
    const a = await open(relay, 'a', 'one')
    a.session.connect()
    const b = await open(relay, 'b', 'one')
    b.session.connect()
    append(a.session, 'two')
    const c = await open(relay, 'c', 'one\ntwo')

    c.session.connect()

    expect(c.session.role).toBe('adopt')
    expect(c.session.state).toBe('live')
    expect(c.session.markdown()).toBe('one\ntwo')
    expect(b.session.markdown()).toBe('one\ntwo')
  })
})

describe('convergence', () => {
  it('converges after concurrent edits', async () => {
    const relay = new FakeRelay()
    const a = await open(relay, 'a', 'one')
    a.session.connect()
    const b = await open(relay, 'b', 'one')
    b.session.connect()

    relay.hold()
    append(a.session, 'from-a')
    append(b.session, 'from-b')
    relay.release()

    expect(a.session.markdown()).toBe(b.session.markdown())
    expect(a.session.markdown().split('\n').sort()).toEqual(['from-a', 'from-b', 'one'])
  })

  it('writes the merged document to every participant’s own disk', async () => {
    const relay = new FakeRelay()
    const a = await open(relay, 'a', 'one')
    a.session.connect()
    const b = await open(relay, 'b', 'one')
    b.session.connect()

    append(a.session, 'from-a')
    await a.session.flush()
    await b.session.flush()

    expect(a.io.files[PATH]).toBe('one\nfrom-a')
    expect(b.io.files[PATH]).toBe('one\nfrom-a')
  })
})

describe('divergence', () => {
  const diverge = async () => {
    const relay = new FakeRelay()
    const a = await open(relay, 'a', 'one')
    a.session.connect()
    const b = await open(relay, 'b', 'two')
    b.session.connect()
    return { relay, a, b }
  }

  it('never merges a differing file into the room', async () => {
    const { a, b } = await diverge()

    expect(b.session.state).toBe('divergent')
    expect(b.session.divergence).toEqual({
      room: ROOM,
      path: PATH,
      local: 'two',
      remote: 'one',
    })
    expect(b.session.markdown()).toBe('one')
    expect(a.session.markdown()).toBe('one')
  })

  it('leaves both files on disk untouched while divergent', async () => {
    const { a, b } = await diverge()

    await b.session.flush()

    expect(b.io.files[PATH]).toBe('two')
    expect(a.io.files[PATH]).toBe('one')
  })

  it('adopts the room on adoptRoom and writes it to disk', async () => {
    const { relay, b } = await diverge()

    b.session.resolveDivergence('adoptRoom')
    await b.session.flush()

    expect(b.session.state).toBe('live')
    expect(b.session.divergence).toBeNull()
    expect(b.io.files[PATH]).toBe('one')
    expect(relay.resolutions).toEqual([
      { type: 'resolveDivergence', room: ROOM, choice: 'adoptRoom' },
    ])
  })

  it('leaves the room on keepLocal and keeps the local file', async () => {
    const { relay, a, b } = await diverge()

    b.session.resolveDivergence('keepLocal')
    await b.session.flush()

    expect(b.session.state).toBe('solo')
    expect(b.session.markdown()).toBe('two')
    expect(b.io.files[PATH]).toBe('two')
    expect(relay.peers(ROOM).map((peer) => peer.id)).toEqual(['a'])
    expect(a.session.markdown()).toBe('one')
  })
})

describe('degradation', () => {
  it('drops to solo when the transport dies, and keeps editing', async () => {
    const relay = new FakeRelay()
    const a = await open(relay, 'a', 'one')
    a.session.connect()
    const b = await open(relay, 'b', 'one')
    b.session.connect()
    append(a.session, 'shared')

    b.transport.kill()
    append(b.session, 'offline')
    await b.session.flush()

    expect(b.session.state).toBe('solo')
    expect(b.session.peers).toEqual([])
    expect(b.io.files[PATH]).toBe('one\nshared\noffline')
    expect(a.session.markdown()).toBe('one\nshared')
    expect(a.session.peers).toEqual([])
  })

  it('rejoins and merges the solo edits back on reconnect', async () => {
    const relay = new FakeRelay()
    const a = await open(relay, 'a', 'one')
    a.session.connect()
    const b = await open(relay, 'b', 'one')
    b.session.connect()

    b.transport.kill()
    append(b.session, 'offline')
    append(a.session, 'meanwhile')
    b.transport.revive()

    expect(b.session.state).toBe('live')
    expect(b.session.divergence).toBeNull()
    expect(a.session.markdown()).toBe(b.session.markdown())
    expect(a.session.markdown().split('\n').sort()).toEqual([
      'meanwhile',
      'offline',
      'one',
    ])
  })
})

describe('presence', () => {
  it('exposes peers with identity and selection', async () => {
    const relay = new FakeRelay()
    const a = await open(relay, 'a', 'one')
    a.session.connect()
    const b = await open(relay, 'b', 'one')
    b.session.connect()

    a.session.setSelection({ anchor: 1, head: 4 })

    expect(b.session.peers).toEqual([
      { id: 'a', displayName: 'A', color: '#8ec', selection: { anchor: 1, head: 4 } },
    ])
    expect(a.session.peers.map((peer) => peer.id)).toEqual(['b'])
  })
})

describe('flush', () => {
  it('debounces writes to disk', async () => {
    vi.useFakeTimers()
    const relay = new FakeRelay()
    const a = await open(relay, 'a', 'one')
    a.session.connect()

    append(a.session, 'later')
    await vi.advanceTimersByTimeAsync(499)
    expect(a.io.files[PATH]).toBe('one')

    await vi.advanceTimersByTimeAsync(1)
    expect(a.io.files[PATH]).toBe('one\nlater')
  })

  it('flushes once more on destroy', async () => {
    const relay = new FakeRelay()
    const a = await open(relay, 'a', 'one')
    a.session.connect()
    append(a.session, 'unsaved')

    await opened.splice(opened.indexOf(a.session), 1)[0].destroy()

    expect(a.io.files[PATH]).toBe('one\nunsaved')
  })
})
