import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { cleanup, initRepo, tempDir } from './fixtures'
import { PathError } from './paths'
import { Vault } from './vault'

afterAll(cleanup)

async function seed(): Promise<Vault> {
  const root = await tempDir()
  await mkdir(path.join(root, 'ECSEQ-1/Whitepaper'), { recursive: true })
  await mkdir(path.join(root, '.mother'), { recursive: true })
  await writeFile(path.join(root, 'index.md'), '# index')
  await writeFile(path.join(root, 'ECSEQ-1/Whitepaper/Whitepaper.md'), '# wp')
  await writeFile(path.join(root, '.mother/config.json'), '{}')
  return new Vault(root)
}

describe('Vault', () => {
  it('lists a tree with directories first, skipping dotted paths', async () => {
    const vault = await seed()
    const entries = await vault.list()
    expect(entries.map((e) => e.path)).toEqual(['ECSEQ-1', 'index.md'])
    const dir = entries[0]!
    expect(dir.kind === 'dir' && dir.children[0]!.path).toBe('ECSEQ-1/Whitepaper')
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
    expect(await vault.documents()).toEqual([
      'ECSEQ-1/Whitepaper/Whitepaper.md',
      'index.md',
    ])
  })

  it('reads and writes, creating parent directories', async () => {
    const vault = await seed()
    await vault.write('new/deep/note.md', '# new')
    expect(await vault.read('new/deep/note.md')).toBe('# new')
  })

  it('moves a document and refuses to overwrite', async () => {
    const vault = await seed()
    await vault.move('index.md', 'ECSEQ-1/index.md')
    expect(await vault.read('ECSEQ-1/index.md')).toBe('# index')
    await vault.write('index.md', 'again')
    await expect(vault.move('index.md', 'ECSEQ-1/index.md')).rejects.toThrow(
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
