import { expect, it } from 'vitest'
import { toBase64 } from 'lib0/buffer'
import type { RelayMessage } from '@broodmother/shared'
import { encipheredTransport, mintKey } from './cipher'
import type { Transport } from './core'

/** Two ends of one wire, with the wire's own view kept for inspection. */
function pair(): { a: Transport; b: Transport; wire: RelayMessage[] } {
  const wire: RelayMessage[] = []
  const handlers = {
    a: new Set<(m: RelayMessage) => void>(),
    b: new Set<(m: RelayMessage) => void>(),
  }
  const end = (mine: 'a' | 'b', theirs: 'a' | 'b'): Transport => ({
    send(message) {
      wire.push(message)
      for (const handler of handlers[theirs]) handler(message)
    },
    onMessage(handler) {
      handlers[mine].add(handler)
      return () => handlers[mine].delete(handler)
    },
    onLive: () => () => {},
    close() {},
  })
  return { a: end('a', 'b'), b: end('b', 'a'), wire }
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

it('delivers what was sent while the wire sees only ciphertext', async () => {
  const { a, b, wire } = pair()
  const key = mintKey()
  const sealedA = await encipheredTransport(a, key)
  const sealedB = await encipheredTransport(b, key)

  const heard: RelayMessage[] = []
  sealedB.onMessage((message) => heard.push(message))

  const payload = toBase64(new TextEncoder().encode('the document'))
  sealedA.send({ kind: 'doc', payload })
  await settle()
  await settle()

  expect(heard).toEqual([{ kind: 'doc', payload }])
  expect(wire).toHaveLength(1)
  expect(wire[0]).toMatchObject({ kind: 'doc' })
  expect((wire[0] as { payload: string }).payload).not.toBe(payload)
})

it('drops a frame sealed under a different key', async () => {
  const { a, b } = pair()
  const sealedA = await encipheredTransport(a, mintKey())
  const sealedB = await encipheredTransport(b, mintKey())

  const heard: RelayMessage[] = []
  sealedB.onMessage((message) => heard.push(message))
  sealedA.send({ kind: 'doc', payload: toBase64(new TextEncoder().encode('secret')) })
  await settle()
  await settle()

  expect(heard).toEqual([])
})

it('passes the join fact through untouched', async () => {
  const { a, b } = pair()
  const key = mintKey()
  await encipheredTransport(a, key)
  const sealedB = await encipheredTransport(b, key)

  const heard: RelayMessage[] = []
  sealedB.onMessage((message) => heard.push(message))
  a.send({ kind: 'joined', peers: 2 })
  await settle()

  expect(heard).toEqual([{ kind: 'joined', peers: 2 }])
})
