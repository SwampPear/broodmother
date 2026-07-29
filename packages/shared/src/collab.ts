import type { VaultPath } from './vault'

/** `${repoId}/${vaultPath}` — the relay keys rooms by this and stores nothing else. */
export type RoomId = string

export interface Peer {
  id: string
  displayName: string
  color: string
  selection: { anchor: number; head: number } | null
}

export type SessionState = 'solo' | 'connecting' | 'live' | 'divergent'

/** Raised when a joiner's file differs from room state. Never merged, always shown. */
export interface DivergenceReport {
  room: RoomId
  path: VaultPath
  local: string
  remote: string
}

export type DivergenceChoice = 'adoptRoom' | 'keepLocal'
