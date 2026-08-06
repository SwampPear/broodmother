import type { RoomId } from '@/types'

const ROOM_BYTES = 16
const KEY_BYTES = 32
/** AES-GCM's nonce. Fresh per frame, and prepended to the ciphertext rather than counted —
 *  a counter shared by two peers that both started at zero is a reused nonce. */
const IV_BYTES = 12

/** Separates the admission token from the key it comes from, so that holding the token
 *  proves you were told the room and says nothing about the text. */
const ADMISSION = 'broodmother/relay/admission'

function bytes(length: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(length))
}

/** WebCrypto's types insist on a buffer that is not shared, and everything upstream of here
 *  — a Yjs update, a lib0 encoder — is typed as though its own might be. */
function owned(data: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(data.length)
  copy.set(data)
  return copy
}

export function encode(raw: Uint8Array): string {
  let binary = ''
  for (const byte of raw) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decode(text: string): Uint8Array<ArrayBuffer> {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='))
  const raw = new Uint8Array(binary.length)
  for (let at = 0; at < binary.length; at++) raw[at] = binary.charCodeAt(at)
  return raw
}

export function randomRoom(): RoomId {
  return encode(bytes(ROOM_BYTES))
}

export function randomKey(): string {
  return encode(bytes(KEY_BYTES))
}

/** Whether a string could be the thing it claims to be, checked before it is used as one:
 *  base64url of the right length, and nothing else. */
export function looksLikeRoom(room: string): boolean {
  return /^[A-Za-z0-9_-]{22}$/.test(room)
}

export function looksLikeKey(key: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(key)
}

export async function importKey(key: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', decode(key), 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ])
}

/**
 * What the client shows the relay to get into a room. Derived rather than carried, so the
 * invite holds one secret: HKDF only goes one way, and a relay that has collected every
 * token it was ever shown has collected nothing that opens a frame.
 */
export async function admissionToken(key: string): Promise<string> {
  const material = await crypto.subtle.importKey('raw', decode(key), 'HKDF', false, [
    'deriveBits',
  ])
  const derived = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(0),
      info: new TextEncoder().encode(ADMISSION),
    },
    material,
    256,
  )
  return encode(new Uint8Array(derived))
}

export async function seal(key: CryptoKey, data: Uint8Array): Promise<string> {
  const iv = bytes(IV_BYTES)
  const sealed = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, owned(data))
  const frame = new Uint8Array(iv.length + sealed.byteLength)
  frame.set(iv)
  frame.set(new Uint8Array(sealed), iv.length)
  return encode(frame)
}

/** Null rather than a throw: a frame that does not open is one this peer was not meant to
 *  read, and a session goes on rather than ending over it. */
export async function unseal(
  key: CryptoKey,
  frame: string,
): Promise<Uint8Array<ArrayBuffer> | null> {
  try {
    const raw = decode(frame)
    if (raw.length <= IV_BYTES) return null
    const opened = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: raw.subarray(0, IV_BYTES) },
      key,
      raw.subarray(IV_BYTES),
    )
    return new Uint8Array(opened)
  } catch {
    return null
  }
}
