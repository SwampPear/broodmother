import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import type { MotherConfig, SyncStatus } from '@mother/shared'
import { defaultConfig } from '../config'
import { bareRemote, cleanup, cloneOf, git, tempDir } from '../test/fixtures'
import { Git } from './git'
import { SyncLoop, commitMessage } from './sync'

afterAll(cleanup)

async function harness(overrides: Partial<MotherConfig> = {}) {
  const remote = await bareRemote()
  const dir = await cloneOf(remote)
  await writeFile(path.join(dir, 'index.md'), '# index\n')
  await git(dir, 'add', '-A')
  await git(dir, 'commit', '-m', 'init')
  await git(dir, 'push', 'origin', 'HEAD:main')

  let clock = 1_000_000
  const statuses: SyncStatus[] = []
  const config: MotherConfig = {
    ...defaultConfig(dir),
    remoteUrl: remote,
    branch: 'main',
    syncEnabled: true,
    ...overrides,
  }
  const loop = new SyncLoop({
    git: () => new Git(dir),
    config: () => config,
    author: () => ({ name: 'Test', email: 'test@localhost' }),
    onStatus: (status) => statuses.push(status),
    now: () => clock,
  })

  return {
    remote,
    dir,
    loop,
    statuses,
    config,
    advance: (ms: number) => (clock += ms),
    remoteLog: async () => (await git(remote, 'log', '--oneline')).stdout,
  }
}

async function divergentRemoteCommit(remote: string, file: string, contents: string) {
  const other = await cloneOf(remote)
  await writeFile(path.join(other, file), contents)
  await git(other, 'add', '-A')
  await git(other, 'commit', '-m', 'theirs')
  await git(other, 'push', 'origin', 'HEAD:main')
  return other
}

describe('commitMessage', () => {
  it.each([
    [['Handbook/Overview/Overview.md'], 'docs: update Handbook/Overview/Overview'],
    [
      ['Handbook/Overview/Overview.md', 'Handbook/Overview/Appendix.md'],
      'docs: update Handbook/Overview',
    ],
    [['Handbook/Risks.md', 'Business/Roadmap.md'], 'docs: update 2 files'],
    [['a.md', 'b.md'], 'docs: update 2 files'],
  ])('%j -> %s', (paths, expected) => {
    expect(commitMessage(paths)).toBe(expected)
  })
})

describe('SyncLoop', () => {
  it('waits for the idle period, then pulls, commits and pushes', async () => {
    const h = await harness()
    await writeFile(path.join(h.dir, 'note.md'), 'body\n')
    h.loop.noteEdit()

    h.advance(5_000)
    expect((await h.loop.tick()).state).toBe('idle')
    expect(await h.remoteLog()).not.toContain('docs: update note')

    h.advance(6_000)
    const status = await h.loop.tick()
    expect(status.state).toBe('idle')
    expect(status.lastSyncedAt).not.toBeNull()
    expect(await h.remoteLog()).toContain('docs: update note')
  })

  it('does nothing when sync is disabled or no remote is configured', async () => {
    const disabled = await harness({ syncEnabled: false })
    await writeFile(path.join(disabled.dir, 'note.md'), 'body\n')
    disabled.loop.noteEdit()
    disabled.advance(60_000)
    expect((await disabled.loop.tick()).state).toBe('idle')
    expect(await disabled.remoteLog()).not.toContain('docs: update note')

    const remoteless = await harness({ remoteUrl: null })
    remoteless.loop.noteEdit()
    remoteless.advance(60_000)
    expect((await remoteless.loop.tick()).state).toBe('idle')
    expect((await remoteless.loop.syncNow()).message).toBe('no remote configured')
  })

  it('latches a conflict and stays latched until it is explicitly cleared', async () => {
    const h = await harness()
    await divergentRemoteCommit(h.remote, 'index.md', '# theirs\n')
    await writeFile(path.join(h.dir, 'index.md'), '# mine\n')
    h.loop.noteEdit()
    h.advance(60_000)

    const conflicted = await h.loop.tick()
    expect(conflicted.state).toBe('conflict')
    expect(conflicted.conflicted).toEqual(['index.md'])

    h.loop.noteEdit()
    h.advance(60_000)
    expect((await h.loop.tick()).state).toBe('conflict')
    expect((await h.loop.syncNow()).state).toBe('conflict')
    expect((await h.loop.tick()).conflicted).toEqual(['index.md'])

    const cleared = h.loop.clearConflict()
    expect(cleared.state).toBe('idle')
    expect(cleared.conflicted).toEqual([])

    // Clearing is not resolving: the unmerged file latches again on the next attempt.
    expect((await h.loop.syncNow()).state).toBe('conflict')

    // Settled by hand, the way the banner tells you to, and syncing resumes.
    await writeFile(path.join(h.dir, 'index.md'), '# settled\n')
    await git(h.dir, 'add', 'index.md')
    await git(h.dir, '-c', 'core.editor=true', 'rebase', '--continue')
    h.loop.clearConflict()

    expect((await h.loop.syncNow()).state).toBe('idle')
    expect(await h.remoteLog()).toContain('theirs')
  })

  it('reports offline rather than error when the remote is unreachable', async () => {
    const h = await harness({ remoteUrl: 'ssh://127.0.0.1:1/repo.git' })
    await git(h.dir, 'remote', 'set-url', 'origin', 'ssh://127.0.0.1:1/repo.git')
    await writeFile(path.join(h.dir, 'note.md'), 'body\n')
    h.loop.noteEdit()
    h.advance(60_000)

    const status = await h.loop.tick()
    expect(status.state).toBe('offline')
    expect(status.message).toMatch(/^offline:/)
  })

  it('reports a diverged remote as an error, distinct from offline', async () => {
    const h = await harness()
    const pushTarget = await bareRemote()
    await git(pushTarget, 'fetch', h.remote, 'main:main')
    await divergentRemoteCommit(pushTarget, 'theirs.md', 'theirs\n')
    await git(h.dir, 'remote', 'set-url', '--push', 'origin', pushTarget)

    await writeFile(path.join(h.dir, 'note.md'), 'body\n')
    h.loop.noteEdit()
    h.advance(60_000)

    const status = await h.loop.tick()
    expect(status.state).toBe('error')
    expect(status.message).toMatch(/^diverged:/)
  })

  it('reports every status change to its listener', async () => {
    const h = await harness()
    await writeFile(path.join(h.dir, 'note.md'), 'body\n')
    h.loop.noteEdit()
    h.advance(60_000)
    await h.loop.tick()
    expect(h.statuses.map((s) => s.state)).toEqual(['syncing', 'idle'])
  })
})
