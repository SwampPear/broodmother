import { beforeEach, describe, expect, it } from 'vitest'
import { createSession, type CollabSession } from './core'
import type { Connect, TransportEvents } from './transport'

const FLUSH_MS = 1

const settle = () => new Promise((done) => setTimeout(done, 8))

interface Member {
  events: TransportEvents
  open: boolean
}

/**
 * A room with no relay in it. The one thing it models faithfully is the count a joiner is
 * told: the relay accepts sockets one at a time, so the first in hears one however close
 * together two arrivals were. A fake that counted at delivery time would let two peers both
 * believe they had joined an occupied room, and nobody would seed.
 */
function fakeRoom() {
  const members: Member[] = []

  function announce(me: Member, count: number): void {
    queueMicrotask(() => me.open && me.events.live(true))
    for (const one of members)
      if (one.open) queueMicrotask(() => one.open && one.events.peers(count))
  }

  return {
    /** A place at the table, and the two things a test does to a connection: take it away,
     *  and give it back. */
    seat() {
      const me: Member = { events: {} as TransportEvents, open: false }
      const connect: Connect = (events) => {
        me.events = events
        me.open = true
        members.push(me)
        announce(me, members.filter((one) => one.open).length)
        return {
          send(data) {
            for (const one of members)
              if (one !== me && one.open) queueMicrotask(() => one.events.frame(data))
          },
          close() {
            me.open = false
          },
        }
      }
      return {
        connect,
        cut() {
          me.open = false
          me.events.live(false)
        },
        revive() {
          me.open = true
          announce(me, members.filter((one) => one.open).length)
        },
      }
    },
  }
}

function fakeIo() {
  const written: string[] = []
  return {
    written,
    write: async (text: string) => void written.push(text),
  }
}

describe('a session', () => {
  let room: ReturnType<typeof fakeRoom>

  beforeEach(() => {
    room = fakeRoom()
  })

  function open(connect: Connect, initial: string, name = 'someone') {
    const io = fakeIo()
    const session = createSession({
      connect,
      io,
      identity: { name, color: '#abcdef' },
      initial,
      flushMs: FLUSH_MS,
    })
    return { session, io }
  }

  describe('seed versus adopt', () => {
    it('lets the first peer in seed the room from its own file', async () => {
      const first = open(room.seat().connect, '# mine')
      await settle()
      expect(first.session.state().mode).toBe('live')
      expect(first.session.text.toString()).toBe('# mine')
    })

    // Asserted directly rather than inferred from convergence: two peers agreeing on
    // "# mine\n# mine" would converge too.
    it('makes a later peer adopt the room rather than add to it', async () => {
      const first = open(room.seat().connect, '# mine')
      await settle()
      const second = open(room.seat().connect, '# mine')
      await settle()

      expect(second.session.state().mode).toBe('live')
      expect(second.session.text.toString()).toBe('# mine')
      expect(first.session.text.toString()).toBe('# mine')
    })

    it('does not seed twice when a peer comes back', async () => {
      const seat = room.seat()
      const first = open(seat.connect, '# mine')
      await settle()
      seat.cut()
      await settle()
      seat.revive()
      await settle()

      expect(first.session.text.toString()).toBe('# mine')
      expect(first.session.state().mode).toBe('live')
    })
  })

  describe('convergence', () => {
    it('brings two peers to the same text after concurrent edits', async () => {
      const first = open(room.seat().connect, 'start')
      await settle()
      const second = open(room.seat().connect, 'start')
      await settle()

      first.session.text.insert(0, 'A')
      second.session.text.insert(5, 'B')
      await settle()

      expect(first.session.text.toString()).toBe(second.session.text.toString())
      expect(first.session.text.toString()).toContain('A')
      expect(first.session.text.toString()).toContain('B')
    })
  })

  describe('divergence', () => {
    it('refuses to merge a joiner whose file disagrees, and writes nothing', async () => {
      open(room.seat().connect, 'the room')
      await settle()
      const second = open(room.seat().connect, 'something else')
      await settle()

      const state = second.session.state()
      expect(state.mode).toBe('divergent')
      expect(state.mine).toBe('something else')
      expect(state.text).toBe('the room')
      // The whole point: neither version has been put on top of the other, and neither has
      // reached this peer's disk.
      expect(second.io.written).toEqual([])
    })

    it('adopts silently when the joiner brought an empty file', async () => {
      open(room.seat().connect, 'the room')
      await settle()
      const second = open(room.seat().connect, '')
      await settle()

      expect(second.session.state().mode).toBe('live')
      expect(second.io.written).toEqual(['the room'])
    })

    it('takes the room when told to, and only then writes it down', async () => {
      open(room.seat().connect, 'the room')
      await settle()
      const second = open(room.seat().connect, 'something else')
      await settle()
      expect(second.io.written).toEqual([])

      second.session.takeRoom()
      await settle()
      expect(second.session.state().mode).toBe('live')
      expect(second.io.written).toEqual(['the room'])
    })

    it('keeps its own and leaves, without writing the room over it', async () => {
      const first = open(room.seat().connect, 'the room')
      await settle()
      const second = open(room.seat().connect, 'something else')
      await settle()

      second.session.keepMine()
      await settle()
      expect(second.session.state().mode).toBe('solo')
      expect(second.session.state().text).toBe('something else')
      expect(second.io.written).toEqual([])

      // And the room is left as it was, not carrying anything from the peer that left.
      first.session.text.insert(0, '!')
      await settle()
      expect(first.session.text.toString()).toBe('!the room')
    })
  })

  describe('losing the relay', () => {
    it('drops to solo and goes on editing and writing', async () => {
      const seat = room.seat()
      const first = open(seat.connect, 'start')
      await settle()

      seat.cut()
      await settle()
      expect(first.session.state().mode).toBe('solo')

      first.session.text.insert(0, 'still typing ')
      await settle()
      expect(first.io.written.at(-1)).toBe('still typing start')
    })

    it('resyncs what it missed when it comes back', async () => {
      const seatA = room.seat()
      const first = open(seatA.connect, 'start')
      await settle()
      const second = open(room.seat().connect, 'start')
      await settle()

      seatA.cut()
      await settle()

      // Both sides move while they cannot hear each other.
      first.session.text.insert(0, 'A')
      second.session.text.insert(5, 'B')
      await settle()
      expect(first.session.text.toString()).not.toBe(second.session.text.toString())

      seatA.revive()
      await settle()
      expect(first.session.state().mode).toBe('live')
      expect(first.session.text.toString()).toBe(second.session.text.toString())
      expect(first.session.text.toString()).toContain('A')
      expect(first.session.text.toString()).toContain('B')
    })
  })

  describe('presence', () => {
    it('shows everyone but you', async () => {
      const first = open(room.seat().connect, 'start', 'ada')
      await settle()
      expect(first.session.state().peers).toEqual([])

      const second = open(room.seat().connect, 'start', 'grace')
      await settle()

      expect(first.session.state().peers.map((peer) => peer.name)).toEqual(['grace'])
      expect(second.session.state().peers.map((peer) => peer.name)).toEqual(['ada'])
    })

    it('carries a cursor without waking a listener for it', async () => {
      const first = open(room.seat().connect, 'start', 'ada')
      await settle()
      const second = open(room.seat().connect, 'start', 'grace')
      await settle()

      let woken = 0
      first.session.subscribe(() => woken++)
      second.session.setCursor({ anchor: 1, head: 3 })
      await settle()

      expect(first.session.state().peers[0]?.cursor).toEqual({ anchor: 1, head: 3 })
      expect(woken).toBe(0)
    })

    it('takes a peer away when its session closes', async () => {
      const first = open(room.seat().connect, 'start', 'ada')
      await settle()
      const second = open(room.seat().connect, 'start', 'grace')
      await settle()
      expect(first.session.state().peers).toHaveLength(1)

      await second.session.close()
      await settle()
      expect(first.session.state().peers).toEqual([])
    })
  })

  describe('closing', () => {
    it('writes what it was holding, once', async () => {
      const first = open(room.seat().connect, 'start')
      await settle()
      first.session.text.insert(0, 'more ')
      await first.session.close()
      expect(first.io.written.at(-1)).toBe('more start')
    })

    it('writes nothing when it never settled on a document', async () => {
      open(room.seat().connect, 'the room')
      await settle()
      const second = open(room.seat().connect, 'something else')
      await settle()

      await second.session.close()
      expect(second.io.written).toEqual([])
    })
  })
})

describe('a session with no relay at all', () => {
  it('waits rather than claiming to be live', async () => {
    const session: CollabSession = createSession({
      connect: () => ({ send: () => {}, close: () => {} }),
      io: fakeIo(),
      identity: { name: 'ada', color: '#abcdef' },
      initial: 'start',
      flushMs: FLUSH_MS,
    })
    await settle()
    expect(session.state().mode).toBe('joining')
  })
})
