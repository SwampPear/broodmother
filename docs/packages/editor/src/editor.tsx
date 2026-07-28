import type { DocAttrs, DocNode } from '@docs/shared'
import type { JSONContent } from '@tiptap/core'
import { DragHandle } from '@tiptap/extension-drag-handle-react'
import { UndoRedo } from '@tiptap/extensions'
import { EditorContent, useEditor } from '@tiptap/react'
import { useEffect, useRef, useState } from 'react'
import { collabExtension, type CollabProps } from './collab'
import { schemaExtensions } from './schema'
import { SlashMenu, type SlashState } from './slash-menu'

export interface EditorProps {
  value: DocNode
  onChange: (doc: DocNode) => void
  /** When present the Yjs fragment is the source of truth and `value` is ignored. */
  collab?: CollabProps
}

const frontmatterOf = (doc: DocNode) =>
  (doc.attrs as DocAttrs | undefined)?.frontmatter ?? null

export function Editor({ value, onChange, collab }: EditorProps) {
  const [slash, setSlash] = useState<SlashState | null>(null)
  const emit = useRef(onChange)
  const emitted = useRef(value)
  emit.current = onChange

  const editor = useEditor(
    {
      extensions: [
        ...schemaExtensions,
        SlashMenu.configure({ onChange: setSlash }),
        collab ? collabExtension(collab) : UndoRedo,
      ],
      content: collab ? undefined : (value as JSONContent),
      immediatelyRender: false,
      onUpdate: ({ editor }) => {
        emitted.current = editor.getJSON() as DocNode
        emit.current(emitted.current)
      },
    },
    [collab?.fragment, collab?.awareness],
  )

  useEffect(() => {
    if (!editor || collab || value === emitted.current) return
    emitted.current = value
    editor
      .chain()
      .setContent(value as JSONContent, { emitUpdate: false })
      // setContent replaces content only, so frontmatter would be dropped here.
      .command(({ tr }) => !!tr.setDocAttribute('frontmatter', frontmatterOf(value)))
      .run()
  }, [editor, collab, value])

  if (!editor) return null

  return (
    <div className="docs-editor">
      <DragHandle editor={editor}>
        <span className="docs-drag-handle" />
      </DragHandle>
      <EditorContent editor={editor} />
      {slash && <SlashList state={slash} />}
    </div>
  )
}

function SlashList({ state: { items, index, rect } }: { state: SlashState }) {
  return (
    <ul
      className="docs-slash-menu"
      style={{ position: 'fixed', left: rect?.left ?? 0, top: rect?.bottom ?? 0 }}
    >
      {items.map((item, i) => (
        <li key={item.title} aria-selected={i === index} role="option">
          {item.title}
        </li>
      ))}
    </ul>
  )
}
