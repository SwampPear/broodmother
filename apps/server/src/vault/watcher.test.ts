import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import type { VaultEvent } from '@mother/shared'
import { cleanup, delay, tempDir, until } from '../test/fixtures'
import { Vault } from './vault'
import { VaultWatcher } from './watcher'

afterAll(cleanup)

async function watching() {
  const root = await tempDir()
  const events: VaultEvent[] = []
  const watcher = new VaultWatcher(root, (event) => events.push(event))
  await watcher.ready
  return { root, events, watcher, vault: new Vault(root) }
}

describe('VaultWatcher', () => {
  it('reports external creates, changes and removals', async () => {
    const w = await watching()
    try {
      await writeFile(path.join(w.root, 'note.md'), 'one')
      await until(() => w.events.some((e) => e.type === 'created'))
      await writeFile(path.join(w.root, 'note.md'), 'two')
      await until(() => w.events.some((e) => e.type === 'changed'))
      await rm(path.join(w.root, 'note.md'))
      await until(() => w.events.some((e) => e.type === 'removed'))
      expect(w.events.every((e) => e.type !== 'moved' && e.path === 'note.md')).toBe(true)
    } finally {
      await w.watcher.close()
    }
  })

  it('does not echo the app’s own writes back as external changes', async () => {
    const w = await watching()
    try {
      w.watcher.suppress('own.md')
      await w.vault.write('own.md', 'written by the app')
      await writeFile(path.join(w.root, 'other.md'), 'written by hand')
      await until(() => w.events.length > 0)
      await delay(200)
      expect(w.events.map((e) => (e.type === 'moved' ? e.to : e.path))).toEqual([
        'other.md',
      ])
    } finally {
      await w.watcher.close()
    }
  })

  it('ignores dotted paths and coalesces a burst into one event', async () => {
    const w = await watching()
    try {
      await mkdir(path.join(w.root, '.mother'), { recursive: true })
      await writeFile(path.join(w.root, '.mother/config.json'), '{}')
      for (const contents of ['a', 'b', 'c'])
        await writeFile(path.join(w.root, 'burst.md'), contents)
      await until(() => w.events.length > 0)
      await delay(300)
      expect(w.events).toHaveLength(1)
    } finally {
      await w.watcher.close()
    }
  })
})
