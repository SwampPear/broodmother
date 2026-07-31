import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { defaultGitSettings } from '@broodmother/shared'
import {
  ConfigStore,
  configSchema,
  defaultConfig,
  hasEmbeddedCredentials,
  normalizeRemote,
  remoteUrlSchema,
  repair,
} from './config'
import { cleanup, initRepo, tempDir } from './test'
import { Git } from './git'

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
    expect(remoteUrlSchema.safeParse('https://token@github.com/x.git').success).toBe(
      false,
    )
    expect(remoteUrlSchema.safeParse('git@github.com:you/x.git').success).toBe(true)
  })
})

/* What is on the clipboard is the address bar, not the clone URL — the app takes the
   difference rather than teaching it. */
describe('normalizeRemote', () => {
  it.each([
    ['https://github.com/you/vault', 'https://github.com/you/vault'],
    ['https://github.com/you/vault/', 'https://github.com/you/vault'],
    ['https://github.com/you/vault.git', 'https://github.com/you/vault.git'],
    ['  https://github.com/you/vault  ', 'https://github.com/you/vault'],
    ['https://github.com/you/vault/tree/main', 'https://github.com/you/vault'],
    ['https://github.com/you/vault/blob/main/README.md', 'https://github.com/you/vault'],
    ['https://github.com/you/vault/pull/12', 'https://github.com/you/vault'],
    ['https://github.com/you/vault?tab=readme-ov-file', 'https://github.com/you/vault'],
    // A segment is never dropped: a subgroup is one, and so is the repository under it.
    ['https://gitlab.com/group/sub/vault', 'https://gitlab.com/group/sub/vault'],
    [
      'https://gitlab.com/group/sub/vault/-/tree/main',
      'https://gitlab.com/group/sub/vault',
    ],
    // Already a clone URL, so left exactly as typed.
    ['git@github.com:you/vault.git', 'git@github.com:you/vault.git'],
    ['ssh://git@github.com/you/vault.git', 'ssh://git@github.com/you/vault.git'],
  ])('%s -> %s', (typed, cloned) => {
    expect(normalizeRemote(typed)).toBe(cloned)
  })

  it('is what a remote is accepted as', () => {
    expect(remoteUrlSchema.parse('https://github.com/you/vault/tree/main')).toBe(
      'https://github.com/you/vault',
    )
  })
})

describe('defaults', () => {
  it('are complete enough to start with no setup', () => {
    expect(configSchema.safeParse(defaultConfig('/project')).success).toBe(true)
  })
})

describe('repair', () => {
  it('keeps good fields and reports only the bad ones', () => {
    const defaults = defaultConfig('/project')
    const { config, reset } = repair(
      {
        vaultPath: '/elsewhere',
        profile: 'ada',
        checkouts: 42,
        git: { '/elsewhere': { enabled: 'yes' } },
      },
      defaults,
    )
    expect(reset.sort()).toEqual(['checkouts', 'git'])
    expect(config.vaultPath).toBe('/elsewhere')
    expect(config.profile).toBe('ada')
    expect(config.checkouts).toEqual(defaults.checkouts)
    expect(config.git).toEqual(defaults.git)
  })

  /* The field is gone from the config, but the migration that moves the folders is the one
     thing that still needs to know which profile each vault was bound to. */
  it('hands the old vault-to-profile map over rather than dropping it', () => {
    const { config, bindings } = repair(
      { profiles: { '/vaults/handbook': 'ada' } },
      defaultConfig(null),
    )
    expect(bindings).toEqual({ '/vaults/handbook': 'ada' })
    expect(config.profile).toBeNull()
  })

  it('keeps a whole set of sync settings for a project', () => {
    const settings = { ...defaultGitSettings(), enabled: true, push: false }
    const { config, reset } = repair(
      { vaultPath: '/project', git: { '/project': settings } },
      defaultConfig(null),
    )
    expect(reset).toEqual([])
    expect(config.git['/project']).toEqual(settings)
  })

  it('falls back to every default when the file is not an object', () => {
    const { config, reset } = repair('nonsense', defaultConfig('/project'))
    expect(reset).toEqual(Object.keys(configSchema.shape))
    expect(config).toEqual(defaultConfig('/project'))
  })
})

describe('adoptLegacySync', () => {
  it('carries the old machine-wide sync fields onto the open project', () => {
    const { config } = repair(
      {
        vaultPath: '/project',
        remoteUrl: 'git@github.com:you/x.git',
        branch: 'trunk',
        syncEnabled: true,
        syncIdleMs: 30_000,
      },
      defaultConfig(null),
    )

    expect(config.git['/project']).toEqual({
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
      { vaultPath: '/project', git: { '/project': mine }, syncEnabled: true },
      defaultConfig(null),
    )
    expect(config.git['/project']).toEqual(mine)
  })

  it('has nothing to carry when no project is open', () => {
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
    const project = path.dirname(path.dirname(configStore.file))
    await initRepo(project)
    await configStore.save(configStore.config)

    expect((await new Git(project).status()).changed).toEqual([])
  })

  it('round-trips a saved config and clears the reset list', async () => {
    const configStore = await store('{"checkouts": 7}')
    expect((await configStore.load()).reset).toEqual(['checkouts'])

    const git = { '/project': { ...defaultGitSettings(), enabled: true } }
    const saved = await configStore.save({ ...configStore.config, git })
    expect(saved.git).toEqual(git)
    expect(configStore.reset).toEqual([])
    expect(JSON.parse(await readFile(configStore.file, 'utf8')).git).toEqual(git)
  })
})
