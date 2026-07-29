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

/**
 * First run: the identity already configured becomes the profile you are on. It is named
 * after that identity rather than "Default" — a placeholder name teaches nothing and is
 * the first thing anyone would rename.
 */
export const seed = (config: MotherConfig): Stored => {
  const name = config.displayName || config.gitAuthor.name
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'me'
  return { active: id, profiles: [{ id, name, ...credentialsOf(config) }] }
}
