import { describe, expect, it } from 'vitest'
import { formatInvite, mintInvite, parseInvite, socketUrl } from './invite'

describe('invites', () => {
  it('round-trips what it mints', () => {
    const invite = mintInvite('https://relay.example')
    expect(parseInvite(formatInvite(invite))).toEqual(invite)
  })

  it('keeps the key in the fragment, where no request carries it', () => {
    const invite = mintInvite('https://relay.example')
    const url = new URL(formatInvite(invite))
    expect(url.hash).toBe(`#${invite.key}`)
    expect(url.pathname).not.toContain(invite.key)
    expect(url.search).toBe('')
  })

  it('takes a relay however it was typed', () => {
    const { room, key } = mintInvite('http://127.0.0.1:3002')
    const expected = `http://127.0.0.1:3002/j/${room}#${key}`
    for (const relay of [
      'http://127.0.0.1:3002',
      'http://127.0.0.1:3002/',
      'http://127.0.0.1:3002/j/somebody-elses-room',
    ])
      expect(formatInvite({ relay, room, key })).toBe(expected)
  })

  it('refuses what is not an invite', () => {
    expect(parseInvite('')).toBeNull()
    expect(parseInvite('hello')).toBeNull()
    expect(parseInvite('https://relay.example')).toBeNull()
    expect(parseInvite('https://relay.example/j/short#key')).toBeNull()
    // A link to the room with the key stripped off is not a way in.
    const invite = mintInvite('https://relay.example')
    expect(parseInvite(`https://relay.example/j/${invite.room}`)).toBeNull()
  })

  it('trims what a paste drags along', () => {
    const invite = mintInvite('https://relay.example')
    expect(parseInvite(`  ${formatInvite(invite)}\n`)).toEqual(invite)
  })

  it('derives the socket from the relay, and names no room in it', () => {
    expect(socketUrl('https://relay.example')).toBe('wss://relay.example/room')
    expect(socketUrl('http://127.0.0.1:3002')).toBe('ws://127.0.0.1:3002/room')
  })
})
