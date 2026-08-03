import type { SyncStatus } from '../sync'
import type { DocRoot, TreeEvent } from '../tree'

export type WsRoute = '/ws' | '/terminal' | '/kernel'

export type ServerMessage =
  | { type: 'tree'; root: DocRoot; event: TreeEvent }
  | { type: 'sync'; status: SyncStatus }
  | { type: 'error'; message: string }
