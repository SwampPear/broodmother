import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import {
  ConfigStore,
  configSchema,
  defaultConfig,
  hasEmbeddedCredentials,
  repair,
} from './config'
import { cleanup, initRepo, tempDir } from './fixtures'
import { Git } from './git'

afterAll(cleanup)

async function store(contents?: string) {
  const root = await tempDir()
  const file = path.join(root, '.mother/config.json')
  if (contents !== undefined) {
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, contents)
  }
  return new ConfigStore(file, defaultConfig(root))
}

describe('hasEmbeddedCredentials', () => {
  it.each([
    ['https://token@github.com/x/y.git', true],
    ['https://user:pass@github.com/x/y.git', true],
    ['ssh://git@github.com/x/y.git', false],
    ['ssh://git:secret@github.com/x/y.git', true],
    ['git@github.com:Proprium-Bioscience/docs.git', false],
    ['https://github.com/x/y.git', false],
  ])('%s -> %s', (url, expected) => {
    expect(hasEmbeddedCredentials(url)).toBe(expected)
  })

  it('is rejected by the schema', () => {
    const config = {
      ...defaultConfig('/vault'),
      remoteUrl: 'https://token@github.com/x.git',
    }
    expect(configSchema.safeParse(config).success).toBe(false)
  })
})

describe('defaults', () => {
  it('are complete enough to start with no setup', () => {
    expect(configSchema.safeParse(defaultConfig('/vault')).success).toBe(true)
  })
})

describe('repair', () => {
  it('keeps good fields and reports only the bad ones', () => {
    const defaults = defaultConfig('/vault')
    const { config, reset } = repair(
      {
        vaultPath: '/elsewhere',
        branch: 42,
        syncIdleMs: 5,
        presenceColor: 'not-a-color',
        displayName: 'Ada',
        gitAuthor: { name: 'Ada', email: 'ada@localhost' },
      },
      defaults,
    )
    expect(reset.sort()).toEqual(['branch', 'presenceColor', 'syncIdleMs'])
    expect(config.vaultPath).toBe('/elsewhere')
    expect(config.displayName).toBe('Ada')
    expect(config.branch).toBe(defaults.branch)
    expect(config.syncIdleMs).toBe(defaults.syncIdleMs)
  })

  it('resets a remote with embedded credentials', () => {
    const { config, reset } = repair(
      { remoteUrl: 'https://token@github.com/x.git' },
      defaultConfig('/vault'),
    )
    expect(reset).toEqual(['remoteUrl'])
    expect(config.remoteUrl).toBeNull()
  })

  it('falls back to every default when the file is not an object', () => {
    const { config, reset } = repair('nonsense', defaultConfig('/vault'))
    expect(reset).toEqual(Object.keys(configSchema.shape))
    expect(config).toEqual(defaultConfig('/vault'))
  })
})

describe('ConfigStore', () => {
  it('uses defaults when the file does not exist', async () => {
    const configStore = await store()
    const { config, reset } = await configStore.load()
    expect(reset).toEqual([])
    expect(config.branch).toBe('main')
  })

  it('recovers from malformed JSON instead of refusing to start', async () => {
    const configStore = await store('{ this is not json')
    const { config, reset } = await configStore.load()
    expect(reset.length).toBeGreaterThan(0)
    expect(config.syncIdleMs).toBe(10_000)
  })

  it('keeps .mother out of git so the sync loop never commits app state', async () => {
    const configStore = await store()
    const vault = path.dirname(path.dirname(configStore.file))
    await initRepo(vault)
    await configStore.save(configStore.config)

    expect((await new Git(vault).status()).changed).toEqual([])
  })

  it('round-trips a saved config and clears the reset list', async () => {
    const configStore = await store('{"branch": 7}')
    expect((await configStore.load()).reset).toEqual(['branch'])

    const saved = await configStore.save({ ...configStore.config, branch: 'trunk' })
    expect(saved.branch).toBe('trunk')
    expect(configStore.reset).toEqual([])
    expect(JSON.parse(await readFile(configStore.file, 'utf8')).branch).toBe('trunk')
  })
})
