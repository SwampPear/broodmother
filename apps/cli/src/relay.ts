import { admissionToken, formatInvite, mintInvite } from '@/collab'
import type { Invite } from '@/types'
import { describeHealth, isHealth } from './core'

/** What a command answers with: a line to print, and whether it worked. */
export interface Said {
  text: string
  ok: boolean
}

/** A relay is a plain node process, so running one here is running one — no spawn, no npm,
 *  and the same code that a deployment runs. */
export async function runRelay(): Promise<Said> {
  const { startRelay, HOST } = await import('@broodmother/relay')
  let url: string
  let rooms: { count: number }
  try {
    ;({ url, rooms } = await startRelay())
  } catch (error) {
    return { ok: false, text: error instanceof Error ? error.message : String(error) }
  }
  return {
    ok: true,
    text: [
      `broodmother relay on ${url} — holding ${rooms.count} rooms and no documents`,
      HOST === '127.0.0.1'
        ? 'loopback only. set RELAY_HOST=0.0.0.0 to let other machines reach it.'
        : 'reachable from other machines.',
    ].join('\n'),
  }
}

export async function status(relay: string): Promise<Said> {
  const health = await ask(`${relay}/health`)
  if (!health.ok) return { ok: false, text: `${relay} — ${health.why}` }
  if (!isHealth(health.body))
    return { ok: false, text: `${relay} — not a broodmother relay` }
  return { ok: true, text: describeHealth(relay, health.body) }
}

/**
 * How many are in that room. The token is derived from the invite's own key rather than
 * carried, so asking proves you were told about the room without handing the relay anything
 * that would open a frame — and a relay that does not know the room says the same thing as
 * one that disagrees about the token.
 */
export async function peers(invite: Invite): Promise<Said> {
  const token = await admissionToken(invite.key)
  const answer = await ask(`${invite.relay}/rooms/${invite.room}`, token)
  // A room the relay is not holding and a link it does not recognise are the same 404 by
  // design, so they are the same sentence here.
  if (!answer.ok)
    return {
      ok: false,
      text:
        answer.status === 404
          ? 'nobody is in that document'
          : `${invite.relay} — ${answer.why}`,
    }

  const body = answer.body as { peers?: unknown }
  if (typeof body.peers !== 'number')
    return { ok: false, text: `${invite.relay} — not a broodmother relay` }
  return {
    ok: true,
    text: `${body.peers} ${body.peers === 1 ? 'person is' : 'people are'} in that document`,
  }
}

export function invite(relay: string): Said {
  return {
    ok: true,
    text: [
      formatInvite(mintInvite(relay)),
      '',
      'Anyone holding that link can read and edit the document until the room empties.',
      'Send it over something private.',
    ].join('\n'),
  }
}

type Answer =
  { ok: true; body: unknown } | { ok: false; why: string; status: number | null }

/** The status comes back with the failure rather than being read into a sentence here: what
 *  a 404 means is the caller's to say, and it means two different things. */
async function ask(url: string, token?: string): Promise<Answer> {
  let response: Response
  try {
    response = await fetch(url, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    })
  } catch {
    // The ordinary case by far: nothing is listening there.
    return { ok: false, why: 'no relay answering', status: null }
  }
  if (!response.ok)
    return { ok: false, why: `answered ${response.status}`, status: response.status }
  try {
    return { ok: true, body: await response.json() }
  } catch {
    return {
      ok: false,
      why: 'answered with something that is not JSON',
      status: response.status,
    }
  }
}
