import type { DocPath, DocRef, DocRoot } from '@broodmother/shared'

/** Everything the palette can set in motion. It holds no state of its own: a flow returns
 *  the next one, or null when the work is done and the palette closes. */
export interface FlowCtx {
  /** Every file in both trees, as the addresses that name them. */
  refs: DocRef[]
  open(ref: DocRef): void
  /** Makes one and hands it to the tree to be named. Nothing to ask, so nothing is asked:
   *  the question a dialog put first — what is it called — is the one you answer last. */
  newNote(): void
  /** A workflow the same way: born runnable, named in the tree, drawn in the pane. */
  newDream(): void
  move(root: DocRoot, from: DocPath, to: DocPath): void
  remove(ref: DocRef): void
  syncNow(): void
  settings(): void
  /** The document a share would be about — the open one, when it is shareable text. */
  liveDoc: DocRef | null
  /** Mints an invite for `liveDoc` and puts it on the clipboard. */
  shareLive(): void
  /** A pasted invite, and the path the joiner files the document under. */
  joinLive(invite: string, path: DocPath): void
  /** The dreams page: what is scheduled, and how running has been going. */
  dreams(): void
  toggleTerminal(): void
  vaults(): void
  projects(): void
  createProject(): void
}

export type Flow =
  | { kind: 'search' }
  | { kind: 'pick'; label: string; next: (ref: DocRef) => Flow | null }
  | {
      kind: 'input'
      label: string
      initial: string
      next: (value: string) => Flow | null
    }
  | { kind: 'confirm'; label: string; detail: string; next: () => void }

export function moveFlow(ctx: FlowCtx, from: DocRef): Flow {
  return {
    kind: 'input',
    label: `Move ${from.path} to`,
    initial: from.path,
    next: (to) => {
      ctx.move(from.root, from.path, to)
      return null
    },
  }
}

/** Joining is two answers: the invite someone sent, and where the document lands in your
 *  vault — which need not be where it lives in theirs. */
export function joinFlow(ctx: FlowCtx): Flow {
  return {
    kind: 'input',
    label: 'Paste the invite',
    initial: '',
    next: (invite) => ({
      kind: 'input',
      label: 'File the shared document as',
      initial: 'Shared.md',
      next: (path) => {
        ctx.joinLive(invite, path)
        return null
      },
    }),
  }
}

/** A folder goes with everything inside it, which is the one thing worth being told before
 *  it happens rather than after. */
export function deleteFlow(ctx: FlowCtx, ref: DocRef, folder = false): Flow {
  return {
    kind: 'confirm',
    label: `Delete ${ref.path}?`,
    detail: folder
      ? 'The folder and everything in it are removed from disk. The app cannot undo it.'
      : 'The file is removed from disk. The app cannot undo it.',
    next: () => ctx.remove(ref),
  }
}
