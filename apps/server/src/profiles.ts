import { mkdir, readFile, readdir } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { z } from 'zod'
import type { Identity, Profile } from '@broodmother/shared'
import { atomicWrite } from './fs'
import { nameProblem } from './fs'

export class ProfileError extends Error {}

const DEFAULT_COLOR = '#8fb8d8'

/** Profiles are files rather than folders, so they live in one of their own beside the
 *  projects instead of being mistaken for one. */
export const PROFILES_DIR = 'profiles'

const credential = z.string().min(1).nullable()

export const identitySchema = z.object({
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'presence color must be #rrggbb'),
  gitAuthor: z.object({ name: z.string().min(1), email: z.string().min(1) }),
  sshKeyPath: credential,
  claudeCfgDir: credential,
})

export function broodmotherHome(): string {
  return process.env.BROODMOTHER_HOME ?? path.join(os.homedir(), '.broodmother')
}

const profilesDir = (home = broodmotherHome()) => path.join(home, PROFILES_DIR)

const profileFile = (home: string, name: string) =>
  path.join(profilesDir(home), `${name}.json`)

function assertProfileName(name: string): void {
  const problem = nameProblem(name)
  if (problem) throw new ProfileError(`profile name ${problem}`)
}

/** A credential path is typed by a human, so `~` is what they will type. */
export function expandHome(target: string): string {
  if (target === '~') return os.homedir()
  return target.startsWith('~/') ? path.join(os.homedir(), target.slice(2)) : target
}

/**
 * A file dropped in by hand is a profile too, so a malformed one fills in from the file
 * name field by field rather than refusing the whole profile.
 */
async function identityOf(file: string, name: string): Promise<Identity> {
  const identity: Identity = {
    color: DEFAULT_COLOR,
    gitAuthor: { name, email: `${name}@localhost` },
    sshKeyPath: null,
    claudeCfgDir: null,
  }
  const raw = await readFile(file, 'utf8')
    .then(JSON.parse)
    .catch(() => null)
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return identity

  const source = raw as Record<string, unknown>
  for (const [key, field] of Object.entries(identitySchema.shape)) {
    const result = field.safeParse(source[key])
    if (result.success) (identity as Record<string, unknown>)[key] = result.data
  }
  return identity
}

/** Every `.json` in the profiles folder is a profile — drop one in and it is picked up. */
export async function listProfiles(home = broodmotherHome()): Promise<Profile[]> {
  const dir = profilesDir(home)
  await mkdir(dir, { recursive: true })
  const entries = await readdir(dir, { withFileTypes: true })
  const profiles = await Promise.all(
    entries
      .filter(
        (entry) =>
          entry.isFile() && entry.name.endsWith('.json') && !entry.name.startsWith('.'),
      )
      .map(async (entry) => {
        const file = path.join(dir, entry.name)
        const name = entry.name.slice(0, -'.json'.length)
        return { name, path: file, ...(await identityOf(file, name)) }
      }),
  )
  return profiles.sort((a, b) => a.name.localeCompare(b.name))
}

export async function findProfile(
  name: string,
  home = broodmotherHome(),
): Promise<Profile | null> {
  const profiles = await listProfiles(home)
  return profiles.find((profile) => profile.name === name) ?? null
}

export async function writeIdentity(
  profile: Profile,
  identity: Identity,
): Promise<Profile> {
  await atomicWrite(profile.path, `${JSON.stringify(identity, null, 2)}\n`)
  return { ...profile, ...identity }
}

export async function createProfile(
  { name, ...identity }: { name: string } & Identity,
  home = broodmotherHome(),
): Promise<Profile> {
  assertProfileName(name)
  await mkdir(profilesDir(home), { recursive: true })
  if (await findProfile(name, home))
    throw new ProfileError(`a profile named "${name}" already exists`)

  return writeIdentity({ name, path: profileFile(home, name), ...identity }, identity)
}
