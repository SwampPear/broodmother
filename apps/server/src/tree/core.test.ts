import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { cleanup, initRepo, tempDir } from '../test'
import { PathError } from '../fs'
import { Tree } from './core'

afterAll(cleanup)

async function seed(): Promise<Tree> {
  const root = await tempDir()
  await mkdir(path.join(root, 'Handbook/Overview'), { recursive: true })
  await mkdir(path.join(root, '.broodmother'), { recursive: true })
  await writeFile(path.join(root, 'index.md'), '# index')
  await writeFile(path.join(root, 'Handbook/Overview/Overview.md'), '# wp')
  await writeFile(path.join(root, '.broodmother/config.json'), '{}')
  return new Tree(root)
}

describe('Tree', () => {
  it('lists a tree with directories first, skipping the reserved names', async () => {
    const project = await seed()
    const entries = await project.list()
    expect(entries.map((e) => e.path)).toEqual(['Handbook', 'index.md'])
    const dir = entries[0]!
    expect(dir.kind === 'dir' && dir.children[0]!.path).toBe('Handbook/Overview')
  })

  /* A dot folder is hidden from Finder, not from the app that edits it — an agent's notes
     under `.claude` are notes, and a project that will not show them is hiding your own work. */
  it('lists dotted entries, and walks into a dotted folder', async () => {
    const project = await seed()
    await mkdir(path.join(project.root, '.claude'), { recursive: true })
    await writeFile(path.join(project.root, '.claude/Notes.md'), '# notes')
    await writeFile(path.join(project.root, '.env'), 'SECRET=1')

    const entries = await project.list()
    expect(entries.map((e) => e.path)).toContain('.env')
    expect(entries.map((e) => e.path)).not.toContain('.broodmother')

    const dotted = entries.find((e) => e.path === '.claude')
    expect(dotted?.kind === 'dir' && dotted.children.map((c) => c.path)).toEqual([
      '.claude/Notes.md',
    ])

    // Listed is not enough: a dotted file has to read and count as a document too.
    expect(await project.read('.env')).toBe('SECRET=1')
    expect(await project.documents()).toContain('.claude/Notes.md')
  })

  it('skips .git and gitignored files', async () => {
    const project = await seed()
    await initRepo(project.root)
    await writeFile(path.join(project.root, '.gitignore'), 'ignored.md\nbuild/\n')
    await writeFile(path.join(project.root, 'ignored.md'), 'no')
    await mkdir(path.join(project.root, 'build'))
    await writeFile(path.join(project.root, 'build/out.md'), 'no')

    const paths = (await project.list()).map((e) => e.path)
    expect(paths).not.toContain('ignored.md')
    expect(paths).not.toContain('build')
    expect(paths).not.toContain('.git')
    // The file saying what git ignores is a file you may want to edit.
    expect(paths).toContain('.gitignore')
    expect(paths).toContain('index.md')
  })

  it('lists only markdown documents for the link index', async () => {
    const project = await seed()
    await mkdir(path.join(project.root, 'attachments'))
    await writeFile(path.join(project.root, 'attachments/chip.png'), 'binary')
    expect(await project.documents()).toEqual([
      'Handbook/Overview/Overview.md',
      'index.md',
    ])
  })

  it('reads and writes, creating parent directories', async () => {
    const project = await seed()
    await project.write('new/deep/note.md', '# new')
    expect(await project.read('new/deep/note.md')).toBe('# new')
  })

  it('moves a document and refuses to overwrite', async () => {
    const project = await seed()
    await project.move('index.md', 'Handbook/index.md')
    expect(await project.read('Handbook/index.md')).toBe('# index')
    await project.write('index.md', 'again')
    await expect(project.move('index.md', 'Handbook/index.md')).rejects.toThrow(
      /already exists/,
    )
  })

  it('deletes a document', async () => {
    const project = await seed()
    await project.remove('index.md')
    expect(await project.exists('index.md')).toBe(false)
  })

  it('refuses to read, write or delete outside the project', async () => {
    const project = await seed()
    const outside = await tempDir()
    await writeFile(path.join(outside, 'secret.md'), 'secret')

    await expect(project.read('../secret.md')).rejects.toThrow(PathError)
    await expect(project.write('../escaped.md', 'x')).rejects.toThrow(PathError)
    await expect(project.remove(path.join(outside, 'secret.md'))).rejects.toThrow(
      PathError,
    )
    await expect(project.write('.git/config', 'x')).rejects.toThrow(PathError)
    expect(await readFile(path.join(outside, 'secret.md'), 'utf8')).toBe('secret')
  })
})
