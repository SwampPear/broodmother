'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createSession, mintInvite, relayTransport, type CollabSession } from '@/collab'
import type { DocRef, Invite, SessionState } from '@/types'

/** Where the relay is for this build. A build with none has no share command rather than a
 *  share command that fails. */
export const RELAY = process.env.NEXT_PUBLIC_RELAY_URL ?? 'http://127.0.0.1:3002'

const keyOf = (ref: DocRef) => `${ref.root}:${ref.path}`

/** A document being shared, and the way back to it. */
export interface Live {
  ref: DocRef
  invite: Invite
  session: CollabSession
}

/**
 * What somebody asked for and the session it turns into. The ask and the doing are separate
 * because they happen in different places: the palette knows you meant to share this
 * document, and only the pane holding it knows what is in it.
 */
type Want = { kind: 'share' } | { kind: 'join'; invite: Invite }

const wanted = new Map<string, Want>()
const living = new Map<string, Live>()
const watchers = new Set<() => void>()

function changed(): void {
  for (const watcher of watchers) watcher()
}

function subscribe(watcher: () => void): () => void {
  watchers.add(watcher)
  return () => void watchers.delete(watcher)
}

export function askShare(ref: DocRef): void {
  wanted.set(keyOf(ref), { kind: 'share' })
  changed()
}

export function askJoin(ref: DocRef, invite: Invite): void {
  wanted.set(keyOf(ref), { kind: 'join', invite })
  changed()
}

export function liveOf(ref: DocRef | null): Live | undefined {
  return ref ? living.get(keyOf(ref)) : undefined
}

/**
 * Leaving is the only way a share ends. Closing the tab does not: you meant to come back.
 *
 * Closed before it is forgotten, and in that order on purpose. Closing writes the document
 * one last time, which is what brings the pane's own copy up to date — and the pane goes
 * back to owning the buffer the moment this disappears from the registry. The other order
 * hands the editor a copy of the text from before the share and lets it save that.
 */
export function leave(ref: DocRef): void {
  const key = keyOf(ref)
  const live = living.get(key)
  wanted.delete(key)
  if (!live) return void changed()
  void live.session.close().finally(() => {
    living.delete(key)
    changed()
  })
}

/** Every document this window is sharing, for the status line and for a clean shutdown. */
export function useShares(): Live[] {
  return useSyncExternalStore(
    subscribe,
    () => snapshot(),
    () => EMPTY,
  )
}

const EMPTY: Live[] = []
let cached: Live[] = EMPTY
let cachedSize = -1

/** `useSyncExternalStore` compares by identity, so the list has to be the same array until
 *  the set of shares actually changes. */
function snapshot(): Live[] {
  if (living.size !== cachedSize) {
    cached = [...living.values()]
    cachedSize = living.size
  }
  return cached
}

export interface Collab {
  live: Live
  state: SessionState
}

/** What a session is doing, for anything that only watches — the status line, the share
 *  card. Mode and membership only; typing does not wake it. */
export function useSessionState(live: Live | undefined): SessionState | null {
  const [state, setState] = useState<SessionState | null>(null)
  useEffect(() => {
    if (!live) return setState(null)
    setState(live.session.state())
    return live.session.subscribe(setState)
  }, [live])
  return live ? state : null
}

/**
 * The session for the document in this pane, made here because this is where the text is.
 *
 * `markdown` is what this peer would be contributing: the first peer into a room seeds it
 * from exactly this, and a later one compares it with what it adopted. Held in a ref and read
 * once, at creation — the session owns the buffer from that moment and a later render's
 * `markdown` is a stale copy of what the session itself has since changed.
 */
export function useCollab(
  ref: DocRef,
  markdown: string | null,
  identity: { name: string; color: string } | null,
  write: (text: string) => Promise<unknown>,
): Collab | null {
  const shares = useShares()
  const live = shares.find((one) => keyOf(one.ref) === keyOf(ref))
  const state = useSessionState(live)

  const text = useRef(markdown)
  text.current = markdown
  const save = useRef(write)
  save.current = write

  const key = keyOf(ref)
  const want = wanted.get(key)

  useEffect(() => {
    if (!want || living.has(key) || text.current === null || !identity) return
    const invite = want.kind === 'join' ? want.invite : mintInvite(RELAY)
    const session = createSession({
      connect: relayTransport(invite),
      io: { write: async (next) => void (await save.current(next)) },
      identity,
      initial: text.current,
    })
    living.set(key, { ref, invite, session })
    wanted.delete(key)
    changed()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, want, identity?.name, identity?.color, markdown !== null])

  return live && state ? { live, state } : null
}
