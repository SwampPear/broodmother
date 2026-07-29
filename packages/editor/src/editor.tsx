'use client'

import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { syntaxHighlighting } from '@codemirror/language'
import { history, historyKeymap, defaultKeymap } from '@codemirror/commands'
import { searchKeymap } from '@codemirror/search'
import { Compartment, EditorState, Prec } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { useEffect, useRef, useState } from 'react'
import { type Command, type Trigger, toggleWrap, triggerAt } from './commands'
import { livePreview } from './live-preview'
import { markdownHighlight } from './syntax'

export type EditMode = 'live' | 'source'

export interface EditorProps {
  markdown: string
  onChange: (markdown: string) => void
  mode?: EditMode
}

const preview = new Compartment()

export function Editor({ markdown: value, onChange, mode = 'live' }: EditorProps) {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const emit = useRef(onChange)
  const emitted = useRef(value)
  const menu = useRef<(Trigger & { index: number }) | null>(null)
  const [open, setOpen] = useState<{
    trigger: Trigger
    index: number
    top: number
    left: number
  } | null>(null)
  emit.current = onChange

  useEffect(() => {
    if (!host.current) return

    const close = () => {
      menu.current = null
      setOpen(null)
    }

    const run = (command: Command) => {
      const current = menu.current
      if (!current || !view.current) return false
      close()
      command.run(view.current, current.from, current.to)
      return true
    }

    const menuKeys = keymap.of([
      {
        key: 'ArrowDown',
        run: () => {
          const current = menu.current
          if (!current) return false
          const index = (current.index + 1) % current.items.length
          menu.current = { ...current, index }
          setOpen((was) => (was ? { ...was, index } : was))
          return true
        },
      },
      {
        key: 'ArrowUp',
        run: () => {
          const current = menu.current
          if (!current) return false
          const index = (current.index + current.items.length - 1) % current.items.length
          menu.current = { ...current, index }
          setOpen((was) => (was ? { ...was, index } : was))
          return true
        },
      },
      {
        key: 'Enter',
        run: () => {
          const current = menu.current
          return current ? run(current.items[current.index]) : false
        },
      },
      {
        key: 'Escape',
        run: () => {
          if (!menu.current) return false
          close()
          return true
        },
      },
    ])

    const watch = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        emitted.current = update.state.doc.toString()
        emit.current(emitted.current)
      }
      if (!update.docChanged && !update.selectionSet) return

      const trigger = triggerAt(update.state)
      if (!trigger) return close()

      const index = menu.current?.from === trigger.from ? menu.current.index : 0
      menu.current = { ...trigger, index: Math.min(index, trigger.items.length - 1) }
      const at = update.view.coordsAtPos(trigger.from)
      setOpen(
        at ? { trigger, index: menu.current.index, top: at.bottom, left: at.left } : null,
      )
    })

    const editor = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          history(),
          Prec.highest(menuKeys),
          keymap.of([
            { key: 'Mod-b', run: toggleWrap('**') },
            { key: 'Mod-i', run: toggleWrap('*') },
            ...defaultKeymap,
            ...historyKeymap,
            ...searchKeymap,
          ]),
          markdown({ base: markdownLanguage, codeLanguages: languages }),
          syntaxHighlighting(markdownHighlight),
          preview.of(mode === 'live' ? livePreview : []),
          EditorView.lineWrapping,
          watch,
        ],
      }),
      parent: host.current,
    })
    view.current = editor
    return () => {
      editor.destroy()
      view.current = null
    }
    // The document is reconciled below; rebuilding on every keystroke would lose the cursor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    view.current?.dispatch({
      effects: preview.reconfigure(mode === 'live' ? livePreview : []),
    })
  }, [mode])

  // A value that did not come from this editor is a write from somewhere else — another
  // window, an editor on disk, a shell. Replacing the whole document would map the cursor to
  // one end of it, so the caret is put back where it was, clamped to what is now there.
  useEffect(() => {
    const editor = view.current
    if (!editor || value === emitted.current) return
    emitted.current = value
    const head = Math.min(editor.state.selection.main.head, value.length)
    editor.dispatch({
      changes: { from: 0, to: editor.state.doc.length, insert: value },
      selection: { anchor: head },
    })
  }, [value])

  return (
    <div className="cm-host">
      <div ref={host} />
      {open && (
        <ul
          className="cm-commands"
          role="listbox"
          style={{ position: 'fixed', top: open.top, left: open.left }}
        >
          {open.trigger.items.map((command, index) => (
            <li key={command.title} role="option" aria-selected={index === open.index}>
              <span className="title">{command.title}</span>
              <span className="hint">{command.hint}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
