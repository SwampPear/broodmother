import type { SyncStatus } from '../sync'
import type { VaultEvent } from '../vault'

export type WsRoute = '/ws' | '/terminal'

export type ServerMessage =
  | { type: 'vault'; event: VaultEvent }
  | { type: 'sync'; status: SyncStatus }
  | { type: 'error'; message: string }
