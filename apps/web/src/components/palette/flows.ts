import type { VaultPath } from '@broodmother/shared'

/** Everything the palette can set in motion. It holds no state of its own: a flow returns
 *  the next one, or null when the work is done and the palette closes. */
export interface FlowCtx {
  paths: VaultPath[]
  open(path: VaultPath): void
  /** Makes one and hands it to the tree to be named. Nothing to ask, so nothing is asked:
   *  the question a dialog put first — what is it called — is the one you answer last. */
  newNote(): void
  move(from: VaultPath, to: VaultPath): void
  remove(path: VaultPath): void
  syncNow(): void
  settings(): void
  toggleTerminal(): void
  vaults(): void
}

export type Flow =
  | { kind: 'search' }
  | { kind: 'pick'; label: string; next: (path: VaultPath) => Flow | null }
  | {
      kind: 'input'
      label: string
      initial: string
      next: (value: string) => Flow | null
    }
  | { kind: 'confirm'; label: string; detail: string; next: () => void }

export function moveFlow(ctx: FlowCtx, from: VaultPath): Flow {
  return {
    kind: 'input',
    label: `Move ${from} to`,
    initial: from,
    next: (to) => {
      ctx.move(from, to)
      return null
    },
  }
}

export function deleteFlow(ctx: FlowCtx, path: VaultPath): Flow {
  return {
    kind: 'confirm',
    label: `Delete ${path}?`,
    detail: 'The file is removed from disk. The app cannot undo it.',
    next: () => ctx.remove(path),
  }
}
