import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { cleanup, initRepo, tempDir } from '../test'
import { PathError } from '../fs'
import { Vault } from './core'

afterAll(cleanup)

async function seed(): Promise<Vault> {
  const root = await tempDir()
  await mkdir(path.join(root, 'Handbook/Overview'), { recursive: true })
  await mkdir(path.join(root, '.broodmother'), { recursive: true })
  await writeFile(path.join(root, 'index.md'), '# index')
  await writeFile(path.join(root, 'Handbook/Overview/Overview.md'), '# wp')
  await writeFile(path.join(root, '.broodmother/config.json'), '{}')
  return new Vault(root)
}

describe('Vault', () => {
  it('lists a tree with directories first, skipping the app’s own folder', async () => {
    const vault = await seed()
    const entries = await vault.list()
    expect(entries.map((e) => e.path)).toEqual(['Handbook', 'index.md'])
    const dir = entries[0]!
    expect(dir.kind === 'dir' && dir.children[0]!.path).toBe('Handbook/Overview')
  })

  it('lists dotted files and folders, and reads what is in them', async () => {
    const vault = await seed()
    await mkdir(path.join(vault.root, '.github/workflows'), { recursive: true })
    await writeFile(path.join(vault.root, '.github/workflows/ci.yml'), 'on: push')
    await writeFile(path.join(vault.root, '.gitignore'), 'build/\n')
    await writeFile(path.join(vault.root, '.hidden.md'), '# hidden')

    const entries = await vault.list()
    expect(entries.map((e) => e.path)).toEqual([
      '.github',
      'Handbook',
      '.gitignore',
      '.hidden.md',
      'index.md',
    ])
    const dotDir = entries[0]!
    expect(dotDir.kind === 'dir' && dotDir.children[0]!.path).toBe('.github/workflows')
    expect(await vault.read('.gitignore')).toBe('build/\n')
    expect(await vault.documents()).toContain('.hidden.md')
  })

  it('skips .git and gitignored files', async () => {
    const vault = await seed()
    await initRepo(vault.root)
    await writeFile(path.join(vault.root, '.gitignore'), 'ignored.md\nbuild/\n')
    await writeFile(path.join(vault.root, 'ignored.md'), 'no')
    await mkdir(path.join(vault.root, 'build'))
    await writeFile(path.join(vault.root, 'build/out.md'), 'no')

    const paths = (await vault.list()).map((e) => e.path)
    expect(paths).not.toContain('ignored.md')
    expect(paths).not.toContain('build')
    expect(paths).not.toContain('.git')
    expect(paths).toContain('index.md')
  })

  it('lists only markdown documents for the link index', async () => {
    const vault = await seed()
    await mkdir(path.join(vault.root, 'attachments'))
    await writeFile(path.join(vault.root, 'attachments/chip.png'), 'binary')
    expect(await vault.documents()).toEqual(['Handbook/Overview/Overview.md', 'index.md'])
  })

  it('reads and writes, creating parent directories', async () => {
    const vault = await seed()
    await vault.write('new/deep/note.md', '# new')
    expect(await vault.read('new/deep/note.md')).toBe('# new')
  })

  it('moves a document and refuses to overwrite', async () => {
    const vault = await seed()
    await vault.move('index.md', 'Handbook/index.md')
    expect(await vault.read('Handbook/index.md')).toBe('# index')
    await vault.write('index.md', 'again')
    await expect(vault.move('index.md', 'Handbook/index.md')).rejects.toThrow(
      /already exists/,
    )
  })

  it('deletes a document', async () => {
    const vault = await seed()
    await vault.remove('index.md')
    expect(await vault.exists('index.md')).toBe(false)
  })

  it('refuses to read, write or delete outside the vault', async () => {
    const vault = await seed()
    const outside = await tempDir()
    await writeFile(path.join(outside, 'secret.md'), 'secret')

    await expect(vault.read('../secret.md')).rejects.toThrow(PathError)
    await expect(vault.write('../escaped.md', 'x')).rejects.toThrow(PathError)
    await expect(vault.remove(path.join(outside, 'secret.md'))).rejects.toThrow(PathError)
    await expect(vault.write('.git/config', 'x')).rejects.toThrow(PathError)
    expect(await readFile(path.join(outside, 'secret.md'), 'utf8')).toBe('secret')
  })
})
