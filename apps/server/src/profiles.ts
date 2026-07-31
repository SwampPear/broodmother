import { mkdir, readFile, readdir } from 'node:fs/promises'
import { execa } from 'execa'
import os from 'node:os'
import path from 'node:path'
import { z } from 'zod'
import type { GitAuthor, Identity, Profile } from '@broodmother/shared'
import { atomicWrite } from './fs'
import { nameProblem } from './fs'

export class ProfileError extends Error {}

const DEFAULT_COLOR = '#8fb8d8'

/** Profiles are files rather than folders, so they live in one of their own beside the
 *  projects instead of being mistaken for one. */
export const PROFILES_DIR = 'profiles'

const credential = z.string().min(1).nullable()

export const identitySchema = z.object({
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'color must be #rrggbb'),
  gitAuthor: z.object({ name: z.string().min(1), email: z.string().min(1) }),
  sshKeyPath: credential,
  claudeCfgDir: credential,
  soul: credential,
})

/**
 * Who git on this machine already thinks you are. A profile is the first thing broodmother
 * asks for, and on any machine that has ever committed the answer is already on disk —
 * asking for it again is a question nobody needed.
 *
 * `execa` rather than `Git`, which reads a key path out of this file and cannot be imported
 * back into it. Run from the home, which is no repository, so what answers is the global and
 * system config: the machine's own answer rather than one vault's.
 */
export async function machineAuthor(home = broodmotherHome()): Promise<GitAuthor | null> {
  const read = async (key: string) => {
    const result = await execa('git', ['config', '--get', key], {
      cwd: home,
      reject: false,
      timeout: 5_000,
    })
    return result.exitCode === 0 ? String(result.stdout).trim() : ''
  }
  const [name, email] = await Promise.all([read('user.name'), read('user.email')])
  return name || email ? { name, email } : null
}

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
 * The GitHub connection a profile pushes with. It sits beside the identity in the same file
 * rather than in this machine's config, because it belongs to whoever the profile is — the
 * same reasoning the ssh key already follows.
 *
 * The token is a password and is kept like the private key beside it: a file in the
 * broodmother home at 0600. It never leaves the server — what the app is told is the login.
 */
export const githubSchema = z.object({
  login: z.string().min(1),
  token: z.string().min(1),
})

export type GithubAccount = z.infer<typeof githubSchema>

async function rawProfile(file: string): Promise<Record<string, unknown>> {
  const raw = await readFile(file, 'utf8')
    .then(JSON.parse)
    .catch(() => null)
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {}
}

export async function readAccount(profile: Profile): Promise<GithubAccount | null> {
  const parsed = githubSchema.safeParse((await rawProfile(profile.path)).github)
  return parsed.success ? parsed.data : null
}

/** Null disconnects. The profile keeps everything else it had — signing out of a host is
 *  not forgetting who you commit as. */
export async function writeAccount(
  profile: Profile,
  account: GithubAccount | null,
): Promise<Profile> {
  const raw = await rawProfile(profile.path)
  const { github: _gone, ...rest } = raw
  const next = account ? { ...rest, github: account } : rest
  await atomicWrite(profile.path, `${JSON.stringify(next, null, 2)}\n`, 0o600)
  return { ...profile, github: account?.login ?? null }
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
    soul: null,
  }
  const source = await rawProfile(file)
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
        const account = githubSchema.safeParse((await rawProfile(file)).github)
        return {
          name,
          path: file,
          ...(await identityOf(file, name)),
          github: account.success ? account.data.login : null,
        }
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

/** Merged rather than written over: the file holds the GitHub connection too, and saving
 *  who you commit as is not signing out of anywhere. */
export async function writeIdentity(
  profile: Profile,
  identity: Identity,
): Promise<Profile> {
  const raw = await rawProfile(profile.path)
  const next = { ...raw, ...identity }
  await atomicWrite(profile.path, `${JSON.stringify(next, null, 2)}\n`, 0o600)
  return { ...profile, ...identity }
}

/** The key a profile keeps beside its own file, when it has one broodmother made. */
export const keyFile = (profile: Profile) => profile.path.replace(/\.json$/, '.key')

/** The public half, or null when there is none to show. */
export async function readPublicKey(profile: Profile): Promise<string | null> {
  const named = profile.sshKeyPath ? expandHome(profile.sshKeyPath) : keyFile(profile)
  return readFile(`${named}.pub`, 'utf8').then(
    (text) => text.trim() || null,
    () => null,
  )
}

/**
 * A key, made here rather than in a terminal. ed25519 because it is the default everywhere
 * that matters and the public half is one short line, which is the line you are about to
 * paste into a host.
 *
 * No passphrase: git runs from this app with no terminal to answer a prompt on, so a
 * passphrase would be a key that cannot be used rather than a key that is safer. The file
 * sits in the broodmother home at 0600, which is the protection it actually has.
 *
 * Refused when one is already there — replacing a key silently is taking away access to
 * everything the old one opened.
 */
export async function generateKey(profile: Profile): Promise<string> {
  const target = keyFile(profile)
  const existing = await readPublicKey(profile)
  if (existing) throw new ProfileError(`${profile.name} already has a key`)

  const result = await execa(
    'ssh-keygen',
    ['-t', 'ed25519', '-f', target, '-N', '', '-C', `${profile.name}@broodmother`, '-q'],
    { reject: false, timeout: 30_000 },
  )
  if (result.exitCode !== 0)
    throw new ProfileError(String(result.stderr).trim() || 'ssh-keygen failed')

  const publicKey = await readFile(`${target}.pub`, 'utf8')
  return publicKey.trim()
}

export async function createProfile(
  { name, ...identity }: { name: string } & Identity,
  home = broodmotherHome(),
): Promise<Profile> {
  assertProfileName(name)
  await mkdir(profilesDir(home), { recursive: true })
  if (await findProfile(name, home))
    throw new ProfileError(`a profile named "${name}" already exists`)

  return writeIdentity(
    { name, path: profileFile(home, name), github: null, ...identity },
    identity,
  )
}
