import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { defaultConfig } from './config'
import { migrateProjects } from './migrate'
import { cleanup, tempDir } from './test/fixtures'

afterAll(cleanup)

/** An old-layout project: a folder holding `project.json` and a vault folder per name. */
async function project(home: string, name: string, profile: string, vaults: string[]) {
  const dir = path.join(home, name)
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, 'project.json'), JSON.stringify({ profile }))
  for (const vault of vaults) {
    await mkdir(path.join(dir, vault), { recursive: true })
    await writeFile(path.join(dir, vault, 'README.md'), `# ${vault}\n`)
  }
  return dir
}

const names = async (dir: string) =>
  (await readdir(dir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()

describe('migrateProjects', () => {
  it('leaves a home that is already flat alone', async () => {
    const home = await tempDir()
    await mkdir(path.join(home, 'notes'))
    const config = defaultConfig(path.join(home, 'notes'))

    const result = await migrateProjects(home, config)

    expect(result.moved).toEqual([])
    expect(result.config).toEqual(config)
    expect(await names(home)).toEqual(['notes'])
  })

  it('hoists the vault up and carries the profile into the config', async () => {
    const home = await tempDir()
    const dir = await project(home, 'acme', 'work', ['handbook'])
    const was = path.join(dir, 'handbook')

    const result = await migrateProjects(home, defaultConfig(was))

    const now = path.join(home, 'handbook')
    expect(result.moved).toEqual([now])
    expect(result.config.vaultPath).toBe(now)
    expect(result.config.profiles).toEqual({ [now]: 'work' })
    expect(await readFile(path.join(now, 'README.md'), 'utf8')).toBe('# handbook\n')
    // The folder that held it is gone, `project.json` with it.
    await expect(stat(dir)).rejects.toThrow()
  })

  /* One vault named after the project it sits in is the common case, and the one where the
     vault has to take a name its own parent is still holding. */
  it('takes the name of the project folder it came out of', async () => {
    const home = await tempDir()
    await project(home, 'Proprium', 'me', ['Proprium'])

    const result = await migrateProjects(home, defaultConfig(null))

    expect(await names(home)).toEqual(['Proprium'])
    expect(result.config.profiles).toEqual({ [path.join(home, 'Proprium')]: 'me' })
    expect(await readFile(path.join(home, 'Proprium', 'README.md'), 'utf8')).toBe(
      '# Proprium\n',
    )
  })

  it('prefixes a vault whose name another project already took', async () => {
    const home = await tempDir()
    await project(home, 'acme', 'work', ['notes'])
    await project(home, 'personal', 'me', ['notes'])

    const result = await migrateProjects(home, defaultConfig(null))

    expect(await names(home)).toEqual(['notes', 'personal-notes'])
    expect(result.config.profiles).toEqual({
      [path.join(home, 'notes')]: 'work',
      [path.join(home, 'personal-notes')]: 'me',
    })
  })

  it('keeps a project folder that holds something else, and its contents', async () => {
    const home = await tempDir()
    const dir = await project(home, 'acme', 'work', ['handbook'])
    await writeFile(path.join(dir, 'notes-to-self.txt'), 'do not delete me')

    await migrateProjects(home, defaultConfig(null))

    expect(await readFile(path.join(dir, 'notes-to-self.txt'), 'utf8')).toBe(
      'do not delete me',
    )
    expect(await names(home)).toEqual(['acme', 'handbook'])
  })

  it('rewrites a vaultPath that pointed inside the vault that moved', async () => {
    const home = await tempDir()
    const dir = await project(home, 'acme', 'work', ['handbook'])
    const config = defaultConfig(path.join(dir, 'handbook'))

    const result = await migrateProjects(home, config)

    expect(result.config.vaultPath).toBe(path.join(home, 'handbook'))
  })

  it('leaves a vaultPath outside the home where it is', async () => {
    const home = await tempDir()
    const elsewhere = await tempDir()
    await project(home, 'acme', 'work', ['handbook'])

    const result = await migrateProjects(home, defaultConfig(elsewhere))

    expect(result.config.vaultPath).toBe(elsewhere)
  })

  /* Running twice is one migration, not two: the second pass finds nothing to do. */
  it('is a no-op the second time', async () => {
    const home = await tempDir()
    await project(home, 'acme', 'work', ['handbook'])

    const once = await migrateProjects(home, defaultConfig(null))
    const twice = await migrateProjects(home, once.config)

    expect(twice.moved).toEqual([])
    expect(twice.config).toEqual(once.config)
    expect(await names(home)).toEqual(['handbook'])
  })

  it('never mistakes the profiles folder for a project', async () => {
    const home = await tempDir()
    await mkdir(path.join(home, 'profiles'), { recursive: true })
    await writeFile(path.join(home, 'profiles', 'me.json'), '{}')
    await project(home, 'acme', 'me', ['handbook'])

    await migrateProjects(home, defaultConfig(null))

    expect(await names(home)).toEqual(['handbook', 'profiles'])
    expect(await readFile(path.join(home, 'profiles', 'me.json'), 'utf8')).toBe('{}')
  })
})
