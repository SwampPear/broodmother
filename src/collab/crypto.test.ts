import { describe, expect, it } from 'vitest'
import {
  admissionToken,
  decode,
  encode,
  importKey,
  looksLikeKey,
  looksLikeRoom,
  randomKey,
  randomRoom,
  seal,
  unseal,
} from './crypto'

const text = new TextEncoder()

describe('base64url', () => {
  it('round-trips bytes of every length a pad boundary can fall on', () => {
    for (let length = 0; length < 8; length++) {
      const raw = crypto.getRandomValues(new Uint8Array(length))
      expect([...decode(encode(raw))]).toEqual([...raw])
    }
  })

  it('carries no character that a URL would have to escape', () => {
    for (let attempt = 0; attempt < 32; attempt++)
      expect(encode(crypto.getRandomValues(new Uint8Array(32)))).toMatch(
        /^[A-Za-z0-9_-]*$/,
      )
  })
})

describe('minting', () => {
  it('mints rooms and keys that pass their own shape check', () => {
    expect(looksLikeRoom(randomRoom())).toBe(true)
    expect(looksLikeKey(randomKey())).toBe(true)
  })

  it('does not mint the same room twice', () => {
    const seen = new Set(Array.from({ length: 100 }, randomRoom))
    expect(seen.size).toBe(100)
  })

  it('refuses a room that is the wrong length, or a key in a room-shaped string', () => {
    expect(looksLikeRoom('short')).toBe(false)
    expect(looksLikeRoom(`${randomRoom()}x`)).toBe(false)
    expect(looksLikeKey(randomRoom())).toBe(false)
    expect(looksLikeRoom(randomKey())).toBe(false)
  })
})

describe('sealing', () => {
  it('opens under the key it was sealed with', async () => {
    const key = await importKey(randomKey())
    const opened = await unseal(key, await seal(key, text.encode('hello')))
    expect(new TextDecoder().decode(opened!)).toBe('hello')
  })

  it('does not open under another key, and says so rather than throwing', async () => {
    const mine = await importKey(randomKey())
    const theirs = await importKey(randomKey())
    expect(await unseal(theirs, await seal(mine, text.encode('hello')))).toBeNull()
  })

  it('uses a fresh nonce, so one plaintext twice is two frames', async () => {
    const key = await importKey(randomKey())
    const once = await seal(key, text.encode('hello'))
    expect(await seal(key, text.encode('hello'))).not.toBe(once)
  })

  it('refuses a frame somebody tampered with', async () => {
    const key = await importKey(randomKey())
    const frame = await seal(key, text.encode('hello'))
    const raw = decode(frame)
    raw[raw.length - 1] ^= 1
    expect(await unseal(key, encode(raw))).toBeNull()
  })

  it('refuses a frame too short to hold a nonce, and junk', async () => {
    const key = await importKey(randomKey())
    expect(await unseal(key, encode(new Uint8Array(4)))).toBeNull()
    expect(await unseal(key, 'not base64 at all !!')).toBeNull()
  })
})

describe('the admission token', () => {
  it('is the same every time it is derived from one key', async () => {
    const key = randomKey()
    expect(await admissionToken(key)).toBe(await admissionToken(key))
  })

  it('is different for a different key', async () => {
    expect(await admissionToken(randomKey())).not.toBe(await admissionToken(randomKey()))
  })

  // The whole point of deriving it: the relay collects tokens and is no closer to the text.
  it('is not the key', async () => {
    const key = randomKey()
    expect(await admissionToken(key)).not.toBe(key)
  })
})
