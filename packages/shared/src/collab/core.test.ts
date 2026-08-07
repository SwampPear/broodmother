import { expect, it } from 'vitest'
import { formatInvite, parseInvite, type Invite } from './core'

const invite: Invite = {
  url: 'https://lair.example',
  room: 'qL3v9tXw2ZfKm8Ah',
  token: 'tok-abc',
  key: 'key-xyz',
}

it('round-trips an invite', () => {
  expect(parseInvite(formatInvite(invite))).toEqual(invite)
})

it('survives the whitespace a paste brings along', () => {
  expect(parseInvite(`  ${formatInvite(invite)}\n`)).toEqual(invite)
})

it('refuses what is not an invite', () => {
  expect(parseInvite('')).toBeNull()
  expect(parseInvite('https://lair.example')).toBeNull()
  expect(parseInvite('https://lair.example#only.two')).toBeNull()
  expect(parseInvite('https://lair.example#a..c')).toBeNull()
  expect(parseInvite('not a url#a.b.c')).toBeNull()
  expect(parseInvite('ftp://lair.example#a.b.c')).toBeNull()
})
