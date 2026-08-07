import { expect, it } from 'vitest'
import { parseInvite, type LairStatus } from '@broodmother/shared'
import { LairError, LairRefused, askLair, checkLair, mintInvite } from './core'

const account = { url: 'https://lair.example', key: 'k-123' }

function answering(
  handler: (url: URL, init: RequestInit) => { status: number; body: unknown },
): typeof fetch {
  return (async (input: URL | RequestInfo, init?: RequestInit) => {
    const answer = handler(new URL(String(input)), init ?? {})
    return new Response(JSON.stringify(answer.body), { status: answer.status })
  }) as typeof fetch
}

const status: LairStatus = { version: '0.1.0', uptime: 60, sites: 2, claude: true }

it('asks with the key in the header and the body where the method wants it', async () => {
  const seen: { url: string; method?: string; auth?: string; body?: unknown }[] = []
  const ask = answering((url, init) => {
    seen.push({
      url: url.toString(),
      method: init.method,
      auth: (init.headers as Record<string, string>).authorization,
      body: init.body ? JSON.parse(String(init.body)) : undefined,
    })
    return { status: 200, body: { runs: [] } }
  })
  await askLair(account, 'GET /dream/runs', { site: 'docs', path: 'A.dream' }, ask)
  expect(seen[0]).toMatchObject({
    url: 'https://lair.example/dream/runs?site=docs&path=A.dream',
    method: 'GET',
    auth: 'Bearer k-123',
  })

  await askLair(account, 'POST /keys', { name: 'ada' }, ask)
  expect(seen[1]).toMatchObject({ method: 'POST', body: { name: 'ada' } })
})

it('tells a refusal apart from any other failure', async () => {
  const refused = answering(() => ({ status: 401, body: { error: 'bad key' } }))
  await expect(askLair(account, 'GET /status', null, refused)).rejects.toBeInstanceOf(
    LairRefused,
  )
  const broken = answering(() => ({ status: 500, body: { error: 'boom' } }))
  await expect(askLair(account, 'GET /status', null, broken)).rejects.toThrow('boom')
  await expect(askLair(account, 'GET /status', null, broken)).rejects.not.toBeInstanceOf(
    LairRefused,
  )
})

it('maps the three check states', async () => {
  const up = answering(() => ({ status: 200, body: status }))
  expect((await checkLair(account, up)).state).toBe('connected')
  expect((await checkLair(account, up)).message).toContain('0.1.0')

  const refusing = answering(() => ({ status: 401, body: { error: 'bad key' } }))
  expect((await checkLair(account, refusing)).state).toBe('refused')

  const gone: typeof fetch = async () => {
    throw new Error('fetch failed')
  }
  expect((await checkLair(account, gone)).state).toBe('unreachable')
})

it('mints an invite whose key the lair never saw', async () => {
  const ask = answering(() => ({ status: 200, body: { room: 'r-1', token: 't-1' } }))
  const invite = parseInvite(await mintInvite(account, ask))
  expect(invite).toMatchObject({ url: 'https://lair.example', room: 'r-1', token: 't-1' })
  expect(invite?.key).toBeTruthy()
})

it('wraps a network failure as a lair error with the reason kept', async () => {
  const gone: typeof fetch = async () => {
    throw new Error('getaddrinfo ENOTFOUND lair.example')
  }
  await expect(askLair(account, 'GET /status', null, gone)).rejects.toThrow(/ENOTFOUND/)
  await expect(askLair(account, 'GET /status', null, gone)).rejects.toBeInstanceOf(
    LairError,
  )
})
