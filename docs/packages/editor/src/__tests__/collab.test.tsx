import type { DocNode, Peer } from '@docs/shared'
import type { Editor as Tiptap } from '@tiptap/core'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
} from 'y-protocols/awareness'
import * as Y from 'yjs'
import { afterEach, describe, expect, it } from 'vitest'
import { Editor } from '../editor'
import type { CollabProps } from '../collab'
import { typeText } from './harness'

afterEach(cleanup)

const empty: DocNode = { type: 'doc', content: [{ type: 'paragraph' }] }

/** Two peers wired directly to each other — the relay plan 03 builds, minus the socket. */
const session = (): [CollabProps, CollabProps] => {
  const docs = [new Y.Doc(), new Y.Doc()]
  const awareness = docs.map((doc) => new Awareness(doc))
  const link = (from: number, to: number) => {
    docs[from].on('update', (update) => Y.applyUpdate(docs[to], update))
    awareness[from].on(
      'update',
      ({ added, updated, removed }: Record<string, number[]>) =>
        applyAwarenessUpdate(
          awareness[to],
          encodeAwarenessUpdate(awareness[from], [...added, ...updated, ...removed]),
          'test',
        ),
    )
  }
  link(0, 1)
  link(1, 0)
  return docs.map((doc, index) => ({
    fragment: doc.getXmlFragment('prosemirror'),
    awareness: awareness[index],
  })) as [CollabProps, CollabProps]
}

const editorAt = async (index: number) => {
  const elements = await screen.findAllByRole('textbox')
  return elements[index] as HTMLElement & { editor: Tiptap }
}

describe('collab slot', () => {
  it('stays a plain editor with nothing passed', async () => {
    render(<Editor value={empty} onChange={() => {}} />)
    const { editor } = await editorAt(0)
    expect(editor.extensionManager.extensions.map((e) => e.name)).toContain('undoRedo')
    expect(editor.extensionManager.extensions.map((e) => e.name)).not.toContain('collab')
  })

  it('shares edits between peers through the yjs fragment', async () => {
    const [one, two] = session()
    render(
      <>
        <Editor value={empty} onChange={() => {}} collab={one} />
        <Editor value={empty} onChange={() => {}} collab={two} />
      </>,
    )
    const { editor } = await editorAt(0)
    act(() => typeText(editor, 'shared'))

    const other = await editorAt(1)
    await waitFor(() => expect(other.editor.state.doc.textContent).toContain('shared'))
  })

  it('renders a remote caret in the peer colour', async () => {
    const [one, two] = session()
    const peer: Pick<Peer, 'displayName' | 'color'> = {
      displayName: 'Ada',
      color: '#ff0000',
    }
    one.awareness.setLocalStateField('user', peer)

    render(
      <>
        <Editor value={empty} onChange={() => {}} collab={one} />
        <Editor value={empty} onChange={() => {}} collab={two} />
      </>,
    )
    const first = await editorAt(0)
    act(() => {
      first.focus()
      typeText(first.editor, 'hi')
      first.editor.commands.setTextSelection(2)
    })

    const other = await editorAt(1)
    await waitFor(() => {
      const caret = other.editor.view.dom.querySelector<HTMLElement>('.docs-peer-cursor')
      expect(caret?.dataset.peer).toBe('Ada')
      expect(caret?.style.borderColor).toBe('rgb(255, 0, 0)')
    })
  })
})
