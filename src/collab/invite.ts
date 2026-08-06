import type { Invite } from '@/types'
import { looksLikeKey, looksLikeRoom, randomKey, randomRoom } from './crypto'

/** The path a joinable link wears. Short because the whole thing is pasted by hand. */
const JOIN = '/j/'

/** The relay's one socket route. The room is named in the hello rather than in the URL, so
 *  a relay's access log holds no room ids to leak later. */
export const SOCKET = '/room'

export function mintInvite(relay: string): Invite {
  return { relay: origin(relay), room: randomRoom(), key: randomKey() }
}

export function formatInvite({ relay, room, key }: Invite): string {
  return `${origin(relay)}${JOIN}${room}#${key}`
}

/** What a paste turns into, or null when it is not an invite at all — a URL with no key in
 *  its fragment is a link to a relay, not a way into a room. */
export function parseInvite(text: string): Invite | null {
  let url: URL
  try {
    url = new URL(text.trim())
  } catch {
    return null
  }
  if (!/^https?:$/.test(url.protocol)) return null
  if (!url.pathname.startsWith(JOIN)) return null
  const room = url.pathname.slice(JOIN.length)
  const key = url.hash.slice(1)
  if (!looksLikeRoom(room) || !looksLikeKey(key)) return null
  return { relay: url.origin, room, key }
}

export function socketUrl(relay: string): string {
  return `${origin(relay).replace(/^http/, 'ws')}${SOCKET}`
}

/** A relay is named by its origin, however it was typed — a trailing slash or a path on the
 *  end of one is somebody's clipboard, not a different relay. */
function origin(relay: string): string {
  try {
    return new URL(relay).origin
  } catch {
    return relay.replace(/\/+$/, '')
  }
}
