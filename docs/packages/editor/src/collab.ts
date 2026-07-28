import type { Peer } from '@docs/shared'
import { Extension } from '@tiptap/core'
import { redo, undo, yCursorPlugin, ySyncPlugin, yUndoPlugin } from 'y-prosemirror'
import type { Awareness } from 'y-protocols/awareness'
import type * as Y from 'yjs'

/** Awareness state field y-prosemirror reads peers from; plan 03 fills it. */
export interface CollabProps {
  fragment: Y.XmlFragment
  awareness: Awareness
}

const peerCursor = (peer: Partial<Peer>) => {
  const caret = document.createElement('span')
  caret.className = 'docs-peer-cursor'
  caret.style.borderColor = peer.color ?? ''
  caret.dataset.peer = peer.displayName ?? ''
  return caret
}

const peerSelection = (peer: Partial<Peer>) => ({
  class: 'docs-peer-selection',
  style: `background-color: ${peer.color ?? ''}40`,
})

export const collabExtension = ({ fragment, awareness }: CollabProps) =>
  Extension.create({
    name: 'collab',

    addProseMirrorPlugins: () => [
      ySyncPlugin(fragment),
      yCursorPlugin(awareness, {
        cursorBuilder: peerCursor,
        selectionBuilder: peerSelection,
      }),
      yUndoPlugin(),
    ],

    addKeyboardShortcuts: () => ({
      'Mod-z': ({ editor }) => undo(editor.state),
      'Mod-y': ({ editor }) => redo(editor.state),
      'Shift-Mod-z': ({ editor }) => redo(editor.state),
    }),
  })
