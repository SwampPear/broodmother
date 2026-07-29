import { writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import {
  AUTHOR,
  bareRemote,
  cleanup,
  cloneOf,
  git,
  initRepo,
  tempDir,
} from '../test/fixtures'
import {
  Git,
  assertNonDestructive,
  classifyRemoteError,
  parseStatus,
  sshCommand,
} from './git'

afterAll(cleanup)

const author = { name: 'Test', email: 'test@localhost' }

async function repoWithRemote() {
  const remote = await bareRemote()
  const dir = await cloneOf(remote)
  await writeFile(path.join(dir, 'index.md'), '# index\n')
  await git(dir, 'add', '-A')
  await git(dir, 'commit', '-m', 'init')
  await git(dir, 'push', 'origin', 'HEAD:main')
  return { remote, dir, repo: new Git(dir) }
}

describe('assertNonDestructive', () => {
  it.each([
    ['reset', '--hard'],
    ['clean', '-fd'],
    ['checkout', '.'],
    ['restore', 'index.md'],
    ['stash'],
    ['push', '--force'],
    ['push', '--force-with-lease'],
    ['rm', 'index.md'],
  ])('refuses git %s', (...args) => {
    expect(() => assertNonDestructive(args)).toThrow(/refusing/)
  })

  it.each([
    ['status', '--porcelain=v2'],
    ['pull', '--rebase'],
    ['add', '-A'],
    ['-c', 'user.name=x', 'commit', '-m', 'msg'],
    ['push', 'origin', 'HEAD:main'],
  ])('allows git %s', (...args) => {
    expect(() => assertNonDestructive(args)).not.toThrow()
  })

  it('is enforced by Git.run', async () => {
    const repo = new Git(await tempDir())
    await expect(repo.run(['reset', '--hard'])).rejects.toThrow(/refusing/)
  })
})

describe('parseStatus', () => {
  it('keeps paths that contain spaces', () => {
    const status = parseStatus(
      [
        '# branch.ab +2 -1',
        '1 .M N... 100644 100644 100644 aaa bbb ECSEQ-1/Peripheral Device.md',
        '? new note.md',
      ].join('\0') + '\0',
    )
    expect(status.changed).toEqual(['ECSEQ-1/Peripheral Device.md', 'new note.md'])
    expect({ ahead: status.ahead, behind: status.behind }).toEqual({
      ahead: 2,
      behind: 1,
    })
  })

  it('reads unmerged paths and skips the original path of a rename', () => {
    const status = parseStatus(
      [
        '1 M. N... 100644 100644 100644 aaa bbb after.md',
        '2 R. N... 100644 100644 100644 aaa bbb R100 to.md',
        'from.md',
        'u UU N... 100644 100644 100644 100644 aaa bbb ccc conflicted note.md',
      ].join('\0') + '\0',
    )
    expect(status.changed).toEqual(['after.md', 'to.md'])
    expect(status.conflicted).toEqual(['conflicted note.md'])
  })
})

describe('classifyRemoteError', () => {
  it.each([
    ['ssh: connect to host x port 22: Connection refused', 'offline'],
    ['fatal: unable to access: Could not resolve host: github.com', 'offline'],
    ['! [rejected] main -> main (non-fast-forward)', 'diverged'],
    [
      'Updates were rejected because the tip of your current branch is behind',
      'diverged',
    ],
    ['fatal: Authentication failed for https://example.test', 'auth'],
    ['fatal: something else entirely', 'other'],
  ])('classifies %s', (message, expected) => {
    expect(classifyRemoteError(message)).toBe(expected)
  })
})

describe('sshCommand', () => {
  it('offers only the profile’s key when it names one', () => {
    expect(sshCommand('~/.ssh/id_ed25519')).toBe(
      `ssh -oBatchMode=yes -oIdentitiesOnly=yes -i "${path.join(os.homedir(), '.ssh/id_ed25519')}"`,
    )
  })

  it('leaves ssh to its own defaults when the profile names none', () => {
    expect(sshCommand(null)).toBe('ssh -oBatchMode=yes')
  })
})

describe('Git against a real repository', () => {
  it('reports changed and ignored files', async () => {
    const dir = await tempDir()
    await initRepo(dir)
    await writeFile(path.join(dir, '.gitignore'), 'secret.md\n')
    await writeFile(path.join(dir, 'a note.md'), 'hello')
    await writeFile(path.join(dir, 'secret.md'), 'hidden')
    const repo = new Git(dir)

    expect(await repo.isRepo()).toBe(true)
    expect((await repo.status()).changed).toContain('a note.md')
    expect((await repo.status()).changed).not.toContain('secret.md')
    expect(await repo.ignored()).toContain('secret.md')
  })

  it('pulls, commits and pushes to a real bare remote', async () => {
    const { remote, dir, repo } = await repoWithRemote()
    await writeFile(path.join(dir, 'note.md'), 'body\n')

    expect(await repo.pull('main')).toEqual({ ok: true })
    await repo.stageAll()
    expect(await repo.commit('docs: update note', author)).toEqual({ ok: true })
    expect(await repo.push('main')).toEqual({ ok: true })

    const log = await git(remote, 'log', '--oneline')
    expect(log.stdout).toContain('docs: update note')
  })

  it('reports a diverged remote rather than an offline one', async () => {
    const { remote, dir, repo } = await repoWithRemote()
    const other = await cloneOf(remote)
    await writeFile(path.join(other, 'theirs.md'), 'theirs\n')
    await git(other, 'add', '-A')
    await git(other, 'commit', '-m', 'theirs')
    await git(other, 'push', 'origin', 'HEAD:main')

    await writeFile(path.join(dir, 'mine.md'), 'mine\n')
    await git(dir, 'add', '-A')
    await git(dir, 'commit', '-m', 'mine')

    const pushed = await repo.push('main')
    expect(pushed.ok).toBe(false)
    expect(pushed.ok === false && pushed.failure).toBe('diverged')
  })

  it('reports offline when the remote cannot be reached', async () => {
    const dir = await tempDir()
    await initRepo(dir)
    await writeFile(path.join(dir, 'a.md'), 'a')
    await git(dir, 'add', '-A')
    await git(dir, 'commit', '-m', 'init')
    await git(dir, 'remote', 'add', 'origin', 'ssh://127.0.0.1:1/repo.git')

    const pulled = await new Git(dir).pull('main')
    expect(pulled.ok).toBe(false)
    expect(pulled.ok === false && pulled.failure).toBe('offline')
  })

  it('detects a rebase conflict without resolving it', async () => {
    const { remote, dir, repo } = await repoWithRemote()
    const other = await cloneOf(remote)
    await writeFile(path.join(other, 'index.md'), '# theirs\n')
    await git(other, 'add', '-A')
    await git(other, 'commit', '-m', 'theirs')
    await git(other, 'push', 'origin', 'HEAD:main')

    await writeFile(path.join(dir, 'index.md'), '# mine\n')
    await git(dir, 'add', '-A')
    await git(dir, 'commit', '-m', 'mine')

    const pulled = await repo.pull('main')
    expect(pulled.ok).toBe(false)
    expect(pulled.ok === false && pulled.failure).toBe('conflict')
    expect((await repo.status()).conflicted).toEqual(['index.md'])
  })

  it('treats an empty remote branch as nothing to pull', async () => {
    const remote = await bareRemote()
    const dir = await cloneOf(remote)
    await writeFile(path.join(dir, 'a.md'), 'a')
    await git(dir, 'add', '-A')
    await git(dir, 'commit', '-m', 'init')
    expect(await new Git(dir).pull('main')).toEqual({ ok: true })
  })

  it('tests a remote without leaving credentials in the message', async () => {
    const remote = await bareRemote()
    const dir = await cloneOf(remote)
    await writeFile(path.join(dir, 'a.md'), 'a')
    await git(dir, 'add', '-A')
    await git(dir, 'commit', '-m', 'init')
    await git(dir, 'push', 'origin', 'HEAD:main')

    const repo = new Git(await tempDir())
    expect(await repo.testRemote(remote, 'main')).toEqual({
      ok: true,
      message: 'main found on remote',
    })
    const missing = await repo.testRemote(path.join(remote, 'nope'), 'main')
    expect(missing.ok).toBe(false)
  })

  it('never writes an author into repository config', async () => {
    const { dir, repo } = await repoWithRemote()
    await writeFile(path.join(dir, 'note.md'), 'body\n')
    await repo.stageAll()
    await repo.commit('docs: update note', { name: 'Ada', email: 'ada@localhost' })

    const configured = await git(dir, 'config', '--local', '--get-regexp', 'user').catch(
      (error: { stdout: string }) => error,
    )
    expect(configured.stdout).toBe('')
    const last = await git(dir, 'log', '-1', '--format=%an <%ae>')
    expect(last.stdout.trim()).toBe('Ada <ada@localhost>')
  })
})

describe('fixtures', () => {
  it('uses a distinct author for setup commits', () => {
    expect(AUTHOR).toContain('user.name=Test')
  })
})
