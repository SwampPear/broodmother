import { describe, expect, it } from 'vitest'
import { formatInvite, mintInvite } from '@/collab'
import { describeHealth, describeUptime, isHealth, parse } from './core'

describe('what the arguments meant', () => {
  it('starts the app with nothing said', () => {
    expect(parse([])).toEqual({ kind: 'start', vault: null })
  })

  // A verb in front of a path would be one more thing to remember for the command this is
  // mostly used for.
  it('reads a bare word as the vault to start in', () => {
    expect(parse(['~/notes'])).toEqual({ kind: 'start', vault: '~/notes' })
    expect(parse(['relay-notes'])).toEqual({ kind: 'start', vault: 'relay-notes' })
  })

  it('knows the relay commands', () => {
    expect(parse(['relay'])).toEqual({ kind: 'relay' })
    expect(parse(['relay', 'status'])).toEqual({ kind: 'status', relay: null })
    expect(parse(['relay', 'status', 'https://r.example'])).toEqual({
      kind: 'status',
      relay: 'https://r.example',
    })
  })

  it('parses the invite a peers command is about, rather than passing the text on', () => {
    const invite = mintInvite('https://r.example')
    const parsed = parse(['relay', 'peers', formatInvite(invite)])
    expect(parsed).toEqual({ kind: 'peers', text: formatInvite(invite), invite })
  })

  it('holds on to what was typed when it was not an invite', () => {
    expect(parse(['relay', 'peers', 'nonsense'])).toEqual({
      kind: 'peers',
      text: 'nonsense',
      invite: null,
    })
    expect(parse(['relay', 'peers'])).toEqual({ kind: 'peers', text: '', invite: null })
  })

  it('mints against the relay it was given, or the default', () => {
    expect(parse(['invite'])).toEqual({ kind: 'invite', relay: null })
    expect(parse(['invite', 'https://r.example'])).toEqual({
      kind: 'invite',
      relay: 'https://r.example',
    })
  })

  it('answers help to every way of asking for it', () => {
    for (const word of ['help', '-h', '--help'])
      expect(parse([word])).toEqual({ kind: 'help' })
  })

  it('refuses what it does not know rather than starting the app in it', () => {
    expect(parse(['--wat'])).toEqual({ kind: 'unknown', word: '--wat' })
    expect(parse(['relay', 'demolish'])).toEqual({
      kind: 'unknown',
      word: 'relay demolish',
    })
  })
})

describe('what it prints', () => {
  it('says a duration rather than a number of seconds', () => {
    expect(describeUptime(3)).toBe('3s')
    expect(describeUptime(90)).toBe('2m')
    expect(describeUptime(7200)).toBe('2h')
    expect(describeUptime(172800)).toBe('2d')
  })

  it('reads a health payload back as two lines', () => {
    const said = describeHealth('https://r.example', {
      ok: true,
      rooms: 2,
      sockets: 3,
      uptime: 120,
    })
    expect(said).toContain('up 2m')
    expect(said).toContain('2 rooms, 3 peers')
  })

  it('counts one of a thing as one', () => {
    expect(describeHealth('r', { ok: true, rooms: 1, sockets: 1, uptime: 1 })).toContain(
      '1 room, 1 peer',
    )
  })

  it('says an idle relay is idle rather than saying zero', () => {
    expect(describeHealth('r', { ok: true, rooms: 0, sockets: 0, uptime: 1 })).toContain(
      'no rooms open',
    )
  })

  it('does not take just any JSON for a relay', () => {
    expect(isHealth({ ok: true, rooms: 0, sockets: 0, uptime: 0 })).toBe(true)
    expect(isHealth({ hello: 'from something else' })).toBe(false)
    expect(isHealth(null)).toBe(false)
    expect(isHealth('ok')).toBe(false)
  })
})
