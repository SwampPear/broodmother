import { fromBase64, toBase64 } from 'lib0/buffer'
import type { RelayMessage } from '@broodmother/shared'
import type { Transport } from './core'

/**
 * The blinding: `doc` and `awareness` payloads are AES-GCM under the invite's key, which
 * rides the fragment and never reaches the lair. The lair then moves bytes it cannot
 * read between rooms it knows only by id — whoever runs it learns nothing but traffic.
 *
 * WebCrypto is async and sockets are not, so frames are re-queued through a chain that
 * keeps their order; a frame that fails to decrypt is dropped, because the only sender
 * of an unreadable frame is someone without the invite.
 */
export async function encipheredTransport(
  transport: Transport,
  key: string,
): Promise<Transport> {
  const secret = await crypto.subtle.importKey('raw', fromBase64(key), 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ])

  async function seal(payload: string): Promise<string> {
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const sealed = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      secret,
      fromBase64(payload),
    )
    const framed = new Uint8Array(iv.length + sealed.byteLength)
    framed.set(iv)
    framed.set(new Uint8Array(sealed), iv.length)
    return toBase64(framed)
  }

  async function unseal(payload: string): Promise<string | null> {
    try {
      const framed = fromBase64(payload)
      const opened = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: framed.slice(0, 12) },
        secret,
        framed.slice(12),
      )
      return toBase64(new Uint8Array(opened))
    } catch {
      return null
    }
  }

  const handlers = new Set<(message: RelayMessage) => void>()
  let inbound = Promise.resolve()
  let outbound = Promise.resolve()

  transport.onMessage((message) => {
    inbound = inbound.then(async () => {
      if (message.kind === 'joined') {
        for (const handler of handlers) handler(message)
        return
      }
      const payload = await unseal(message.payload)
      if (payload === null) return
      for (const handler of handlers) handler({ kind: message.kind, payload })
    })
  })

  return {
    send(message) {
      if (message.kind === 'joined') return transport.send(message)
      outbound = outbound.then(async () =>
        transport.send({ kind: message.kind, payload: await seal(message.payload) }),
      )
    },
    onMessage(handler) {
      handlers.add(handler)
      return () => handlers.delete(handler)
    },
    onLive: (handler) => transport.onLive(handler),
    close: () => transport.close(),
  }
}

/** A fresh room key: 128 bits, base64 — the fragment's worth of an invite. */
export function mintKey(): string {
  return toBase64(crypto.getRandomValues(new Uint8Array(16)))
}
