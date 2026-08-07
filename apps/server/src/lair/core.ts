import { randomBytes } from 'node:crypto'
import {
  formatInvite,
  type LairCheck,
  type LairRequest,
  type LairResponse,
  type LairRoute,
} from '@broodmother/shared'
import type { LairAccount } from '../profiles'

export class LairError extends Error {}

/** The lair answered and said no — the key's fault, never the network's. */
export class LairRefused extends LairError {}

const ASK_TIMEOUT_MS = 15_000

/** One typed ask of the lair: the stored key rides the header, GET and DELETE carry
 *  their body in the query string the way the local API already does. */
export async function askLair<R extends LairRoute>(
  account: LairAccount,
  route: R,
  body: LairRequest<R>,
  ask: typeof fetch = fetch,
): Promise<LairResponse<R>> {
  const [method, path] = route.split(' ') as [string, string]
  const url = new URL(path, account.url)
  const query = method === 'GET' || method === 'DELETE'
  if (query && body)
    for (const [key, value] of Object.entries(body))
      url.searchParams.set(key, String(value))
  const response = await ask(url, {
    method,
    headers: {
      authorization: `Bearer ${account.key}`,
      ...(query ? {} : { 'content-type': 'application/json' }),
    },
    body: query ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(ASK_TIMEOUT_MS),
  }).catch((error: unknown) => {
    throw new LairError(error instanceof Error ? error.message : String(error))
  })
  const payload: unknown = await response.json().catch(() => null)
  const said =
    payload && typeof payload === 'object' && 'error' in payload
      ? String((payload as { error: unknown }).error)
      : null
  if (response.status === 401 || response.status === 403)
    throw new LairRefused(said ?? 'the lair refused the key')
  if (!response.ok) throw new LairError(said ?? `the lair answered ${response.status}`)
  return payload as LairResponse<R>
}

/** Asked on purpose rather than found out by a share failing, and named — the
 *  `git/check` rule applied to the one remote this app has. */
export async function checkLair(
  account: LairAccount,
  ask: typeof fetch = fetch,
): Promise<LairCheck> {
  try {
    const status = await askLair(account, 'GET /status', null, ask)
    const sites = `${status.sites} site${status.sites === 1 ? '' : 's'}`
    return {
      state: 'connected',
      message: `Reached ${account.url} — version ${status.version}, ${sites}, claude ${
        status.claude ? 'ready' : 'missing'
      }.`,
    }
  } catch (error) {
    if (error instanceof LairRefused)
      return {
        state: 'refused',
        message: `${account.url} answered but refused the key. Mint a fresh one on the lair with \`lair keys mint\` and paste it here.`,
      }
    return {
      state: 'unreachable',
      message: `Could not reach ${account.url}. That usually means the address or the network, not the key.`,
    }
  }
}

/** Mints the room on the lair and everything else here: the encryption key never
 *  travels anywhere but the invite's fragment. */
export async function mintInvite(
  account: LairAccount,
  ask: typeof fetch = fetch,
): Promise<string> {
  const { room, token } = await askLair(account, 'POST /rooms', null, ask)
  return formatInvite({
    url: account.url,
    room,
    token,
    key: randomBytes(16).toString('base64'),
  })
}
