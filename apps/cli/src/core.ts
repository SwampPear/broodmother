import { parseInvite } from '@/collab'
import type { Invite } from '@/types'

/** Where a relay is when nothing says otherwise: the one `npm run localhost` starts. */
export const LOCAL_RELAY = 'http://127.0.0.1:3002'

export function defaultRelay(): string {
  return process.env.BROODMOTHER_RELAY ?? LOCAL_RELAY
}

export type Command =
  | { kind: 'start'; vault: string | null }
  | { kind: 'relay' }
  | { kind: 'status'; relay: string | null }
  | { kind: 'peers'; text: string; invite: Invite | null }
  | { kind: 'invite'; relay: string | null }
  | { kind: 'help' }
  | { kind: 'unknown'; word: string }

/**
 * What the arguments meant. Separated from doing any of it so that the whole surface can be
 * asserted without starting a server, opening a browser or reaching a network.
 *
 * A bare word that is not a command is a vault path — starting the app is what this is for,
 * and `broodmother ~/notes` should not need a verb in front of it.
 */
export function parse(argv: string[]): Command {
  const [first, second, third] = argv

  if (!first) return { kind: 'start', vault: null }
  if (first === 'help' || first === '-h' || first === '--help') return { kind: 'help' }

  if (first === 'invite') return { kind: 'invite', relay: second ?? null }

  if (first === 'relay') {
    if (!second) return { kind: 'relay' }
    if (second === 'status') return { kind: 'status', relay: third ?? null }
    if (second === 'peers')
      return {
        kind: 'peers',
        text: third ?? '',
        invite: third ? parseInvite(third) : null,
      }
    return { kind: 'unknown', word: `relay ${second}` }
  }

  if (first.startsWith('-')) return { kind: 'unknown', word: first }
  return { kind: 'start', vault: first }
}

export interface Health {
  ok: boolean
  rooms: number
  sockets: number
  uptime: number
}

export function isHealth(value: unknown): value is Health {
  if (!value || typeof value !== 'object') return false
  const { ok, rooms, sockets, uptime } = value as Record<string, unknown>
  return (
    typeof ok === 'boolean' &&
    typeof rooms === 'number' &&
    typeof sockets === 'number' &&
    typeof uptime === 'number'
  )
}

/** Rounded to whatever unit reads as a duration rather than as a number of seconds. */
export function describeUptime(seconds: number): string {
  if (seconds < 60) return `${Math.max(0, Math.round(seconds))}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`
  return `${Math.round(seconds / 86400)}d`
}

const plural = (count: number, one: string) => `${count} ${one}${count === 1 ? '' : 's'}`

export function describeHealth(relay: string, health: Health): string {
  return [
    `${relay} — up ${describeUptime(health.uptime)}`,
    health.rooms === 0
      ? 'no rooms open'
      : `${plural(health.rooms, 'room')}, ${plural(health.sockets, 'peer')}`,
  ].join('\n')
}

export const HELP = `broodmother — local markdown, and a way to share a document live.

  broodmother                    start the app in the vault you had open
  broodmother <vault>            start it in this one

  broodmother relay              run a relay here, for two people on one network
  broodmother relay status [url] ask a relay how it is, and what it is holding
  broodmother relay peers <link> how many people are in that document right now
  broodmother invite [url]       mint a room and a key, as a link to send

The relay carries sealed bytes between people editing one document. It holds no document
and no key, and it forgets a room the moment the last person leaves.

  BROODMOTHER_RELAY  which relay the commands above mean (default ${LOCAL_RELAY})
  RELAY_HOST         what \`relay\` binds — 127.0.0.1 unless a deployment says 0.0.0.0
  RELAY_PORT         and on which port (default 3002)
`
