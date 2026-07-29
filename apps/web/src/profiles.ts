import type { MotherConfig } from '@mother/shared'

/** The config fields a profile owns — vault, remote, and who you commit as. */
export const SCOPED = [
  'vaultPath',
  'remoteUrl',
  'branch',
  'displayName',
  'presenceColor',
  'gitAuthor',
] as const

export type Credentials = Pick<MotherConfig, (typeof SCOPED)[number]>

export interface Profile extends Credentials {
  id: string
  name: string
}

const KEY = 'mother.profiles'

interface Stored {
  active: string
  profiles: Profile[]
}

const credentialsOf = (config: MotherConfig): Credentials =>
  Object.fromEntries(SCOPED.map((key) => [key, config[key]])) as Credentials

export const applyProfile = (config: MotherConfig, profile: Profile): MotherConfig => ({
  ...config,
  ...credentialsOf(profile as unknown as MotherConfig),
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
export const seed = (config: MotherConfig): Stored => ({
  active: 'default',
  profiles: [{ id: 'default', name: 'Default', ...credentialsOf(config) }],
})
