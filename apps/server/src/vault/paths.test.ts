import { mkdir, symlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { cleanup, tempDir } from '../test/fixtures'
import { PathError, normalize, resolveInVault } from './paths'

afterAll(cleanup)

describe('normalize', () => {
  it('accepts a relative posix path', () => {
    expect(normalize('Handbook/Overview/Overview.md')).toBe(
      'Handbook/Overview/Overview.md',
    )
  })

  it.each([
    '',
    '..',
    '../secrets',
    'a/../../b',
    'a/./b',
    '/etc/passwd',
    'C:/Windows',
    'a//b',
    'a/b/',
    'notes\\..\\..\\x',
    'a\0b',
    '.git/config',
    '.broodmother/config.json',
    'nested/.git/hooks/pre-commit',
  ])('rejects %j', (input) => {
    expect(() => normalize(input)).toThrow(PathError)
  })
})

describe('resolveInVault', () => {
  it('resolves inside the vault', async () => {
    const root = await tempDir()
    await mkdir(path.join(root, 'notes'))
    await writeFile(path.join(root, 'notes/a.md'), 'a')
    expect(await resolveInVault(root, 'notes/a.md')).toBe(path.join(root, 'notes/a.md'))
  })

  it('rejects traversal and absolute paths', async () => {
    const root = await tempDir()
    await expect(resolveInVault(root, '../outside.md')).rejects.toThrow(PathError)
    await expect(resolveInVault(root, '/etc/passwd')).rejects.toThrow(PathError)
  })

  it('rejects a symlinked file that points outside the vault', async () => {
    const root = await tempDir()
    const outside = await tempDir()
    await writeFile(path.join(outside, 'secret.md'), 'secret')
    await symlink(path.join(outside, 'secret.md'), path.join(root, 'escape.md'))
    await expect(resolveInVault(root, 'escape.md')).rejects.toThrow(/escapes the vault/)
  })

  it('rejects a path that traverses a symlinked directory out of the vault', async () => {
    const root = await tempDir()
    const outside = await tempDir()
    await writeFile(path.join(outside, 'secret.md'), 'secret')
    await symlink(outside, path.join(root, 'link'))
    await expect(resolveInVault(root, 'link/secret.md')).rejects.toThrow(
      /escapes the vault/,
    )
  })

  it('rejects a not-yet-created file under a symlink that escapes', async () => {
    const root = await tempDir()
    const outside = await tempDir()
    await symlink(outside, path.join(root, 'link'))
    await expect(resolveInVault(root, 'link/new.md')).rejects.toThrow(/escapes the vault/)
  })

  it('allows a symlink that stays inside the vault', async () => {
    const root = await tempDir()
    await mkdir(path.join(root, 'real'))
    await writeFile(path.join(root, 'real/a.md'), 'a')
    await symlink(path.join(root, 'real'), path.join(root, 'alias'))
    await expect(resolveInVault(root, 'alias/a.md')).resolves.toContain('alias')
  })
})
