import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { defaultGitSettings } from '@broodmother/shared'
import {
  ConfigStore,
  configSchema,
  defaultConfig,
  hasEmbeddedCredentials,
  remoteUrlSchema,
  repair,
} from './config'
import { cleanup, initRepo, tempDir } from './test/fixtures'
import { Git } from './git/git'

afterAll(cleanup)

async function store(contents?: string) {
  const root = await tempDir()
  const file = path.join(root, '.broodmother/config.json')
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
    ['git@github.com:you/handbook.git', false],
    ['https://github.com/x/y.git', false],
  ])('%s -> %s', (url, expected) => {
    expect(hasEmbeddedCredentials(url)).toBe(expected)
  })

  it('is rejected where a remote is accepted', () => {
    expect(remoteUrlSchema.safeParse('https://token@github.com/x.git').success).toBe(false)
    expect(remoteUrlSchema.safeParse('git@github.com:you/x.git').success).toBe(true)
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
        profiles: { '/elsewhere': 'ada' },
        worktrees: 42,
        git: { '/elsewhere': { enabled: 'yes' } },
      },
      defaults,
    )
    expect(reset.sort()).toEqual(['git', 'worktrees'])
    expect(config.vaultPath).toBe('/elsewhere')
    expect(config.profiles).toEqual({ '/elsewhere': 'ada' })
    expect(config.worktrees).toEqual(defaults.worktrees)
    expect(config.git).toEqual(defaults.git)
  })

  it('keeps a whole set of sync settings for a vault', () => {
    const settings = { ...defaultGitSettings(), enabled: true, push: false }
    const { config, reset } = repair(
      { vaultPath: '/vault', git: { '/vault': settings } },
      defaultConfig(null),
    )
    expect(reset).toEqual([])
    expect(config.git['/vault']).toEqual(settings)
  })

  it('falls back to every default when the file is not an object', () => {
    const { config, reset } = repair('nonsense', defaultConfig('/vault'))
    expect(reset).toEqual(Object.keys(configSchema.shape))
    expect(config).toEqual(defaultConfig('/vault'))
  })
})

describe('adoptLegacySync', () => {
  it('carries the old machine-wide sync fields onto the open vault', () => {
    const { config } = repair(
      {
        vaultPath: '/vault',
        remoteUrl: 'git@github.com:you/x.git',
        branch: 'trunk',
        syncEnabled: true,
        syncIdleMs: 30_000,
      },
      defaultConfig(null),
    )

    expect(config.git['/vault']).toEqual({
      ...defaultGitSettings(),
      enabled: true,
      idleMs: 30_000,
    })
    // The remote and the branch are the repository's to answer, so they are not carried.
    expect(config).not.toHaveProperty('remoteUrl')
    expect(config).not.toHaveProperty('branch')
  })

  it('leaves settings the new layout already has alone', () => {
    const mine = { ...defaultGitSettings(), enabled: false, idleMs: 5_000 }
    const { config } = repair(
      { vaultPath: '/vault', git: { '/vault': mine }, syncEnabled: true },
      defaultConfig(null),
    )
    expect(config.git['/vault']).toEqual(mine)
  })

  it('has nothing to carry when no vault is open', () => {
    const { config } = repair({ syncEnabled: true }, defaultConfig(null))
    expect(config.git).toEqual({})
  })
})

describe('ConfigStore', () => {
  it('uses defaults when the file does not exist', async () => {
    const configStore = await store()
    const { config, reset } = await configStore.load()
    expect(reset).toEqual([])
    expect(config.git).toEqual({})
  })

  it('recovers from malformed JSON instead of refusing to start', async () => {
    const configStore = await store('{ this is not json')
    const { config, reset } = await configStore.load()
    expect(reset.length).toBeGreaterThan(0)
    expect(config.git).toEqual({})
  })

  it('keeps .broodmother out of git so the sync loop never commits app state', async () => {
    const configStore = await store()
    const vault = path.dirname(path.dirname(configStore.file))
    await initRepo(vault)
    await configStore.save(configStore.config)

    expect((await new Git(vault).status()).changed).toEqual([])
  })

  it('round-trips a saved config and clears the reset list', async () => {
    const configStore = await store('{"worktrees": 7}')
    expect((await configStore.load()).reset).toEqual(['worktrees'])

    const git = { '/vault': { ...defaultGitSettings(), enabled: true } }
    const saved = await configStore.save({ ...configStore.config, git })
    expect(saved.git).toEqual(git)
    expect(configStore.reset).toEqual([])
    expect(JSON.parse(await readFile(configStore.file, 'utf8')).git).toEqual(git)
  })
})
