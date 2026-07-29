import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import type { VaultEvent } from '@broodmother/shared'
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

/* These wait on the operating system to deliver a filesystem event, which it does on
   its own schedule — late, when the machine is running the whole suite at once. Retried
   because the jitter is the kernel's, not the code's. */
describe('VaultWatcher', { retry: 2 }, () => {
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
      await mkdir(path.join(w.root, '.broodmother'), { recursive: true })
      await writeFile(path.join(w.root, '.broodmother/config.json'), '{}')
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

/* A coding agent writing into the vault is the case this has to get right: what it does
   shows up without anyone asking, and the app's own writes are the only thing swallowed. */
describe('changes made by something else', { retry: 2 }, () => {
  it('reports a folder appearing and going away', async () => {
    const root = await tempDir()
    const seen: VaultEvent[] = []
    const watcher = new VaultWatcher(root, (event) => seen.push(event), 10)
    await watcher.ready

    // Generous: chokidar's directory events go through the OS, and a machine running the
    // whole suite at once is a machine that delivers them late.
    await mkdir(path.join(root, 'Section'))
    await until(
      () => seen.some((e) => e.type === 'created' && e.path === 'Section'),
      20_000,
    )

    await rm(path.join(root, 'Section'), { recursive: true })
    await until(
      () => seen.some((e) => e.type === 'removed' && e.path === 'Section'),
      20_000,
    )

    await watcher.close()
    // The OS delivers directory events on its own schedule, and a machine running the whole
    // suite at once delivers them late. This is waiting on the kernel, not on the code.
  }, 25_000)

  /* An agent laying down a folder and a file in it in one go is a race with the watcher:
     the file can land before chokidar has begun watching the folder, and that `add` is
     lost. Reporting the folder is what saves it — the tree reloads either way, which is
     the thing that has to be true. */
  it('reports something when a folder and a file arrive together', async () => {
    const root = await tempDir()
    const seen: VaultEvent[] = []
    const watcher = new VaultWatcher(root, (event) => seen.push(event), 10)
    await watcher.ready

    await mkdir(path.join(root, 'Deep', 'Nested'), { recursive: true })
    await writeFile(path.join(root, 'Deep', 'Nested', 'note.md'), '# note\n')

    await until(
      () => seen.some((e) => e.type !== 'moved' && e.path.startsWith('Deep')),
      20_000,
    )
    await watcher.close()
  }, 25_000)

  /* The app suppresses the echo of its own save, and only for as long as an echo takes.
     An agent editing the same file a moment later is not the app, and used to be swallowed
     by a window that stayed open for two seconds. */
  it('swallows its own echo, then reports the next write to the same file', async () => {
    const root = await tempDir()
    const file = path.join(root, 'shared.md')
    await writeFile(file, 'first\n')
    const seen: VaultEvent[] = []
    const watcher = new VaultWatcher(root, (event) => seen.push(event), 10)
    await watcher.ready

    // The app writes, and says so.
    watcher.suppress('shared.md')
    await writeFile(file, 'from the app\n')
    await delay(120)
    expect(seen).toEqual([])

    // An agent writes the same file once the echo has had its moment. That one is not the
    // app's, and the old two-second window would have eaten it.
    await delay(300)
    await writeFile(file, 'from an agent\n')
    await until(
      () => seen.some((e) => e.type !== 'moved' && e.path === 'shared.md'),
      20_000,
    )

    await watcher.close()
  }, 25_000)
})
