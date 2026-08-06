import type { SyncStatus } from '../sync'
import type { DocRoot, TreeEvent } from '../tree'

export type WsRoute = '/ws' | '/terminal' | '/kernel'

export type ServerMessage =
  | { type: 'tree'; root: DocRoot; event: TreeEvent }
  | { type: 'sync'; status: SyncStatus }
  | { type: 'error'; message: string }
  // The vault this window stands in is gone — deleted from another window, or with all
  // the data. There is nothing here to draw any more; the window leaves for the picker.
  | { type: 'vault-gone' }
