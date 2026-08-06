import { rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { bareRemote, cleanup, git, initRepo, tempDir } from '../test'
import { Git } from '../git'
import { diffFiles, mergeBase, parseNameStatus, readBlob, resolveRef } from './core'

afterAll(cleanup)

/** Long enough that git recognises the same file under another name. */
const BODY = Array.from({ length: 12 }, (_, line) => `line ${line}`).join('\n')

const write = (dir: string, name: string, text: string) =>
  writeFile(path.join(dir, name), text)

/** `main` as it stands, and `feat` with one of every change on it. */
async function repo() {
  const dir = await tempDir()
  await initRepo(dir)
  await write(dir, 'README.md', '# One\n')
  await write(dir, 'gone.md', 'bye\n')
  await write(dir, 'old name.md', BODY)
  await git(dir, 'add', '.')
  await git(dir, 'commit', '-m', 'first')

  await git(dir, 'checkout', '-b', 'feat')
  await write(dir, 'README.md', '# Two\n')
  await write(dir, 'new.md', 'hello\n')
  await rm(path.join(dir, 'gone.md'))
  await write(dir, 'new name.md', BODY)
  await rm(path.join(dir, 'old name.md'))
  await git(dir, 'add', '-A')
  await git(dir, 'commit', '-m', 'second')

  return { dir, git: new Git(dir) }
}

const changed = async (dir: string) => {
  const repository = new Git(dir)
  return diffFiles(repository, 'refs/heads/main', 'refs/heads/feat')
}

describe('parseNameStatus', () => {
  it('reads a rename as three fields and everything else as two', () => {
    const files = parseNameStatus('M\0a.md\0R096\0was.md\0is.md\0A\0b.md\0')
    expect(files).toEqual([
      { path: 'a.md', change: 'modified', from: null },
      { path: 'is.md', change: 'renamed', from: 'was.md' },
      { path: 'b.md', change: 'added', from: null },
    ])
  })

  it('is empty for two branches that agree', () => {
    expect(parseNameStatus('')).toEqual([])
  })
})

describe('diffFiles', () => {
  it('reports what became of every path the two branches disagree about', async () => {
    const { dir } = await repo()
    const files = await changed(dir)
    expect(new Map(files.map((one) => [one.path, one.change]))).toEqual(
      new Map([
        ['README.md', 'modified'],
        ['new.md', 'added'],
        ['gone.md', 'removed'],
        ['new name.md', 'renamed'],
      ]),
    )
  })

  it('remembers what a renamed file was called on the other branch', async () => {
    const { dir } = await repo()
    const renamed = (await changed(dir)).find((one) => one.change === 'renamed')
    expect(renamed?.from).toBe('old name.md')
  })

  /* A branch nobody has checked out here is only on the remote, and picking one off it is
     the ordinary way to meet a branch — so it has to be comparable without a folder. */
  it('compares a branch that is only on the remote', async () => {
    const { dir } = await repo()
    const remote = await bareRemote()
    await git(dir, 'remote', 'add', 'origin', remote)
    await git(dir, 'push', 'origin', 'feat')
    await git(dir, 'checkout', 'main')
    await git(dir, 'branch', '-D', 'feat')

    const repository = new Git(dir)
    const ref = await resolveRef(repository, 'feat')
    expect(ref).toBe('refs/remotes/origin/feat')
    const files = await diffFiles(repository, 'refs/heads/main', ref!)
    expect(files.map((one) => one.path)).toContain('new.md')
  })

  it('has no ref for a branch nothing knows about', async () => {
    const { git: repository } = await repo()
    expect(await resolveRef(repository, 'nowhere')).toBeNull()
  })
})

describe('mergeBase', () => {
  it('is the commit the two branches parted at', async () => {
    const { dir, git: repository } = await repo()
    const base = await mergeBase(repository, 'refs/heads/main', 'refs/heads/feat')
    const first = String(
      (await new Git(dir).run(['rev-parse', 'refs/heads/main'])).stdout,
    ).trim()
    // `feat` was cut from `main` and `main` has not moved, so the split is `main` itself.
    expect(base).toBe(first)
  })

  /* Held against the split rather than against the branch, work that landed on the other
     branch afterwards is not a difference this one made. */
  it('is what the other branch had at the split, not what it has now', async () => {
    const { dir, git: repository } = await repo()
    // On `main`, which is the branch that has to move for the two to differ about this.
    await git(dir, 'checkout', 'main')
    await write(dir, 'later.md', 'after the split\n')
    await git(dir, 'add', '-A')
    await git(dir, 'commit', '-m', 'main moves on')

    const base = await mergeBase(repository, 'refs/heads/main', 'refs/heads/feat')
    const files = await diffFiles(repository, base!, 'refs/heads/feat')
    expect(files.map((one) => one.path)).not.toContain('later.md')
    expect(await readBlob(repository, base!, 'README.md')).toBe('# One\n')
  })

  it('has none for two histories that were never one', async () => {
    const { dir, git: repository } = await repo()
    await git(dir, 'checkout', '--orphan', 'other')
    await git(dir, 'commit', '-m', 'unrelated')
    expect(await mergeBase(repository, 'refs/heads/other', 'refs/heads/feat')).toBeNull()
  })
})

describe('readBlob', () => {
  it('reads a file as each branch has it', async () => {
    const { git: repository } = await repo()
    expect(await readBlob(repository, 'refs/heads/main', 'README.md')).toBe('# One\n')
    expect(await readBlob(repository, 'refs/heads/feat', 'README.md')).toBe('# Two\n')
  })

  /* The final newline is the file's, not a formality: two sides that differ only in one
     differ, and a read that ate it would report them the same. */
  it('keeps the last newline', async () => {
    const { dir, git: repository } = await repo()
    await write(dir, 'README.md', '# Two')
    await git(dir, 'commit', '-am', 'no newline')
    expect(await readBlob(repository, 'refs/heads/feat', 'README.md')).toBe('# Two')
  })

  it('is null on the side a file is not on', async () => {
    const { git: repository } = await repo()
    expect(await readBlob(repository, 'refs/heads/main', 'new.md')).toBeNull()
    expect(await readBlob(repository, 'refs/heads/feat', 'gone.md')).toBeNull()
  })
})
