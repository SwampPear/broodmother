import { expect, it } from 'vitest'
import { siteNameOk } from './lair'

it('accepts the names a site can have', () => {
  for (const name of ['handbook', 'a', 'notes-2', 'my.notes', 'team_docs', '0day'])
    expect(siteNameOk(name)).toBe(true)
})

it('rejects what a folder name cannot carry everywhere', () => {
  for (const name of ['', '.hidden', '-flag', 'has space', '../up', 'naïve', 'a/b'])
    expect(siteNameOk(name)).toBe(false)
})
