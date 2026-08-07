import { mkdir, readFile, readdir, stat } from 'node:fs/promises'
import { execa } from 'execa'
import os from 'node:os'
import path from 'node:path'
import { z } from 'zod'
import type { GitAuthor, Identity, Profile } from '@broodmother/shared'
import { DEFAULT_SOUL } from './brief'
import { atomicWrite } from './fs'
import { nameProblem } from './fs'

export class ProfileError extends Error {}

const DEFAULT_COLOR = '#8fb8d8'

/** A profile is a folder in the broodmother home holding this file and its vaults. The file
 *  is what tells one from a folder dropped in by hand that is not a profile at all. */
export const PROFILE_FILE = 'profile.json'

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

/** Where a profile's vaults live, which is the folder its own file sits in. */
export const profileDir = (profile: Profile) => path.dirname(profile.path)

const profileFile = (home: string, name: string) => path.join(home, name, PROFILE_FILE)

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

/** The lair a profile points at, kept exactly like the GitHub connection beside it: the
 *  whole credential in the profile file at 0600, the URL alone handed to the app. */
export const lairSchema = z.object({
  url: z.string().min(1),
  key: z.string().min(1),
})

export type LairAccount = z.infer<typeof lairSchema>

const isFile = (target: string) =>
  stat(target).then(
    (info) => info.isFile(),
    () => false,
  )

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

export async function readLairAccount(profile: Profile): Promise<LairAccount | null> {
  const parsed = lairSchema.safeParse((await rawProfile(profile.path)).lair)
  return parsed.success ? parsed.data : null
}

/** Null forgets the lair. The key is replaced whole with the URL — half a credential is
 *  not a state this file has. */
export async function writeLairAccount(
  profile: Profile,
  account: LairAccount | null,
): Promise<Profile> {
  const raw = await rawProfile(profile.path)
  const { lair: _gone, ...rest } = raw
  const next = account ? { ...rest, lair: account } : rest
  await atomicWrite(profile.path, `${JSON.stringify(next, null, 2)}\n`, 0o600)
  return { ...profile, lair: account?.url ?? null }
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
  return souled(identity)
}

/**
 * Every profile has a soul whether or not anyone has written one, which is the rule the
 * brief already follows. A file that never mentions one and a file that says `null` are the
 * same thing said twice, so both read back as the default — and the profile's page opens on
 * the prompt its agents are actually held to rather than on a blank box.
 *
 * Only what is handed back, never what is written: baking the default into every file would
 * freeze it at the day the profile was made.
 */
function souled<T extends { soul: string | null }>(value: T): T {
  return value.soul?.trim() ? value : { ...value, soul: DEFAULT_SOUL }
}

/** Every folder in the home holding a `profile.json` is a profile — drop one in and it is
 *  picked up. A folder without one is a vault from the layout before this, and is moved. */
export async function listProfiles(home = broodmotherHome()): Promise<Profile[]> {
  await mkdir(home, { recursive: true })
  const entries = await readdir(home, { withFileTypes: true })
  const found = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
      .map(async (entry) => {
        const file = profileFile(home, entry.name)
        if (!(await isFile(file))) return null
        const raw = await rawProfile(file)
        const account = githubSchema.safeParse(raw.github)
        const lair = lairSchema.safeParse(raw.lair)
        return {
          name: entry.name,
          path: file,
          ...(await identityOf(file, entry.name)),
          github: account.success ? account.data.login : null,
          lair: lair.success ? lair.data.url : null,
        }
      }),
  )
  return found
    .filter((profile) => profile !== null)
    .sort((a, b) => a.name.localeCompare(b.name))
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
  // The page opens on the default, so saving one that was never touched comes back here as
  // the default's own text. Storing it would freeze a copy of it on the day it was saved;
  // what it means is that nobody has written a soul, which is what goes in the file.
  const written =
    identity.soul?.trim() === DEFAULT_SOUL ? { ...identity, soul: null } : identity
  const next = { ...raw, ...written }
  await atomicWrite(profile.path, `${JSON.stringify(next, null, 2)}\n`, 0o600)
  return souled({ ...profile, ...written })
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
  if (await findProfile(name, home))
    throw new ProfileError(`a profile named "${name}" already exists`)
  await mkdir(path.join(home, name), { recursive: true })

  return writeIdentity(
    { name, path: profileFile(home, name), github: null, lair: null, ...identity },
    identity,
  )
}
