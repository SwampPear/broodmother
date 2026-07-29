import type { DocsConfig } from '@docs/shared'

/** The config fields a profile owns — vault, remote, and who you commit as. */
export const SCOPED = [
  'vaultPath',
  'remoteUrl',
  'branch',
  'displayName',
  'presenceColor',
  'gitAuthor',
] as const

export type Credentials = Pick<DocsConfig, (typeof SCOPED)[number]>

export interface Profile extends Credentials {
  id: string
  name: string
}

const KEY = 'docs.profiles'

interface Stored {
  active: string
  profiles: Profile[]
}

const credentialsOf = (config: DocsConfig): Credentials =>
  Object.fromEntries(SCOPED.map((key) => [key, config[key]])) as Credentials

export const applyProfile = (config: DocsConfig, profile: Profile): DocsConfig => ({
  ...config,
  ...credentialsOf(profile as unknown as DocsConfig),
})

export function load(): Stored | null {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? (JSON.parse(raw) as Stored) : null
    return parsed?.profiles?.length ? parsed : null
  } catch {
    return null
  }
}

export function save(stored: Stored): void {
  localStorage.setItem(KEY, JSON.stringify(stored))
}

/** First run: whatever the config already holds becomes the profile you are on. */
export const seed = (config: DocsConfig): Stored => ({
  active: 'default',
  profiles: [{ id: 'default', name: 'Default', ...credentialsOf(config) }],
})
