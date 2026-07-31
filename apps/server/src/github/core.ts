import type { GithubDevice, GithubRepo } from '@broodmother/shared'

export class GithubError extends Error {}

const DEVICE_CODE_URL = 'https://github.com/login/device/code'
const TOKEN_URL = 'https://github.com/login/oauth/access_token'
const API = 'https://api.github.com'

/**
 * Pushing to a repository is all this asks for. `repo` covers private ones and is what
 * making one on your behalf needs; nothing here reads your profile, your organisations or
 * anyone else's code.
 */
const SCOPE = 'repo'

/**
 * The app as GitHub knows it. There is no secret: the device flow exists because a program
 * on someone's laptop cannot keep one, and its client id is as public as the app itself.
 * It is read from the environment rather than baked in so a build of this repo that is not
 * ours is not signing in as us.
 */
export function clientId(): string {
  const id = process.env.BROODMOTHER_GITHUB_CLIENT_ID?.trim()
  if (!id)
    throw new GithubError(
      'this build has no GitHub client id, so it cannot connect — set BROODMOTHER_GITHUB_CLIENT_ID',
    )
  return id
}

export function configured(): boolean {
  return Boolean(process.env.BROODMOTHER_GITHUB_CLIENT_ID?.trim())
}

async function post(url: string, body: Record<string, string>): Promise<UnknownRecord> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null)

  if (!response) throw new GithubError('could not reach GitHub — check the network')
  const json = await response.json().catch(() => null)
  if (!json || typeof json !== 'object')
    throw new GithubError(`GitHub answered ${response.status} with nothing to read`)
  return json as UnknownRecord
}

type UnknownRecord = Record<string, unknown>

const text = (source: UnknownRecord, key: string): string =>
  typeof source[key] === 'string' ? source[key] : ''

/**
 * The first half of the device flow: GitHub hands back a short code and the page to type it
 * into. Nothing is granted yet — what comes back is a question waiting to be answered in a
 * browser, and the answer is collected by `poll`.
 */
export async function startDevice(): Promise<GithubDevice> {
  const json = await post(DEVICE_CODE_URL, { client_id: clientId(), scope: SCOPE })
  const deviceCode = text(json, 'device_code')
  const userCode = text(json, 'user_code')
  if (!deviceCode || !userCode)
    throw new GithubError(text(json, 'error_description') || 'GitHub refused to start')

  return {
    deviceCode,
    userCode,
    verificationUri: text(json, 'verification_uri') || 'https://github.com/login/device',
    // GitHub asks not to be polled faster than this, and answers `slow_down` when it is.
    intervalMs: (Number(json.interval) || 5) * 1000,
  }
}

export interface DeviceAnswer {
  /** Still waiting on the browser. Nothing is wrong; ask again after the interval. */
  pending: boolean
  token: string | null
}

/**
 * The second half: one ask, one answer. Waiting is the caller's business — a poll loop on
 * this side would be a request held open for as long as someone takes to find their
 * password, and a window that closed halfway through would never be noticed.
 */
export async function poll(deviceCode: string): Promise<DeviceAnswer> {
  const json = await post(TOKEN_URL, {
    client_id: clientId(),
    device_code: deviceCode,
    grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
  })

  const token = text(json, 'access_token')
  if (token) return { pending: false, token }

  const error = text(json, 'error')
  if (error === 'authorization_pending' || error === 'slow_down')
    return { pending: true, token: null }
  if (error === 'expired_token') throw new GithubError('that code expired — start again')
  if (error === 'access_denied')
    throw new GithubError('the request was declined in the browser')
  throw new GithubError(text(json, 'error_description') || 'GitHub refused the sign-in')
}

async function api(
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<UnknownRecord | UnknownRecord[]> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'x-github-api-version': '2022-11-28',
    },
    signal: AbortSignal.timeout(20_000),
  }).catch(() => null)

  if (!response) throw new GithubError('could not reach GitHub — check the network')
  const json = await response.json().catch(() => null)
  if (response.status === 401)
    throw new GithubError('GitHub no longer accepts this connection — connect again')
  if (!response.ok) {
    const message =
      json && typeof json === 'object' ? text(json as UnknownRecord, 'message') : ''
    throw new GithubError(message || `GitHub answered ${response.status}`)
  }
  return json as UnknownRecord | UnknownRecord[]
}

/** Who the token belongs to, which is the only thing about you this ever asks for. */
export async function login(token: string): Promise<string> {
  const json = (await api(token, '/user')) as UnknownRecord
  const name = text(json, 'login')
  if (!name) throw new GithubError('GitHub did not say who this connection is')
  return name
}

const repoOf = (source: UnknownRecord): GithubRepo => ({
  fullName: text(source, 'full_name'),
  cloneUrl: text(source, 'clone_url'),
  private: source.private === true,
  defaultBranch: text(source, 'default_branch') || 'main',
})

/**
 * What you could push to, most recently touched first. Only repositories you can write to
 * are worth offering: picking one you cannot push to is a failure saved up for the first
 * sync rather than answered here.
 */
export async function repos(token: string): Promise<GithubRepo[]> {
  const json = (await api(
    token,
    '/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member',
  )) as UnknownRecord[]
  if (!Array.isArray(json)) return []
  return json
    .filter((one) => (one.permissions as UnknownRecord | undefined)?.push === true)
    .map(repoOf)
    .filter((repo) => repo.cloneUrl)
}

/** Made here rather than in a browser, because a repository that has to exist first is the
 *  step this whole flow is for. Private unless it is said otherwise. */
export async function createRepo(
  token: string,
  input: { name: string; private: boolean },
): Promise<GithubRepo> {
  const json = (await api(token, '/user/repos', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name,
      private: input.private,
      // Nothing is written into it: broodmother pushes the vault it just made, and a repo
      // with a commit already in it is a merge nobody asked for.
      auto_init: false,
    }),
  })) as UnknownRecord
  return repoOf(json)
}
