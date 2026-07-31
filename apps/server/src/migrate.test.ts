import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { defaultConfig } from './config'
import { migrateCheckouts } from './migrate'
import { PRIMARY } from './vault'
import { cleanup, tempDir } from './test'

afterAll(cleanup)

const names = async (dir: string) =>
  (await readdir(dir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()

describe('migrateCheckouts', () => {
  /** A project the way it was before checkouts: the folder is the checkout. */
  async function checkout(home: string, name: string) {
    const dir = path.join(home, name)
    await mkdir(path.join(dir, '.git'), { recursive: true })
    await writeFile(path.join(dir, '.git', 'HEAD'), 'ref: refs/heads/main\n')
    await writeFile(path.join(dir, 'README.md'), `# ${name}\n`)
    await mkdir(path.join(dir, 'Notes'), { recursive: true })
    return dir
  }

  it('moves the checkout down into local, git and all', async () => {
    const home = await tempDir()
    const dir = await checkout(home, 'Proprium')

    const result = await migrateCheckouts(home, defaultConfig(dir))

    expect(result.moved).toEqual([path.join(dir, PRIMARY)])
    expect(await names(dir)).toEqual([PRIMARY])
    expect(await readFile(path.join(dir, PRIMARY, 'README.md'), 'utf8')).toBe(
      '# Proprium\n',
    )
    expect(await stat(path.join(dir, PRIMARY, '.git', 'HEAD'))).toBeTruthy()
    // `.git` is in the list because it moved with everything else, which is what makes
    // the folder that arrived a repository rather than a copy of one.
    expect(await names(path.join(dir, PRIMARY))).toEqual(['.git', 'Notes'])
  })

  /* The project is still the project. Which checkout is open in it is a separate fact,
     and it starts as the only one there is. */
  it('leaves vaultPath naming the project rather than the checkout', async () => {
    const home = await tempDir()
    const dir = await checkout(home, 'Proprium')

    const result = await migrateCheckouts(home, defaultConfig(dir))

    expect(result.config.vaultPath).toBe(dir)
  })

  it('is a no-op the second time', async () => {
    const home = await tempDir()
    await checkout(home, 'Proprium')

    const once = await migrateCheckouts(home, defaultConfig(null))
    const twice = await migrateCheckouts(home, once.config)

    expect(twice.moved).toEqual([])
    expect(await names(path.join(home, 'Proprium'))).toEqual([PRIMARY])
  })

  it('leaves an empty project alone, having nothing to move', async () => {
    const home = await tempDir()
    await mkdir(path.join(home, 'Empty'))

    const result = await migrateCheckouts(home, defaultConfig(null))

    expect(result.moved).toEqual([])
  })

  it('never moves the profiles folder', async () => {
    const home = await tempDir()
    await mkdir(path.join(home, 'profiles'), { recursive: true })
    await writeFile(path.join(home, 'profiles', 'me.json'), '{}')

    await migrateCheckouts(home, defaultConfig(null))

    expect(await readFile(path.join(home, 'profiles', 'me.json'), 'utf8')).toBe('{}')
  })

  it('moves every project in the home, not only the open one', async () => {
    const home = await tempDir()
    await checkout(home, 'One')
    await checkout(home, 'Two')

    const result = await migrateCheckouts(home, defaultConfig(null))

    expect(result.moved).toHaveLength(2)
  })
})
