'use client'

import type { CollabSession } from '@/collab'
import { Editor as MarkdownEditor, type EditMode } from '@/editor'
import { render } from '@/markdown'
import { useEffect, useMemo, useState } from 'react'
import { useKeyDown } from './hooks'

export type Mode = EditMode | 'reading'

const isMarkdown = (path: string) => /\.(md|markdown|mdx)$/i.test(path)

const LABELS: Record<Mode, string> = {
  live: 'live',
  source: 'source',
  reading: 'reading',
}

const MODES = Object.keys(LABELS) as Mode[]

/** Remembered for the session so opening a second note does not inherit the first note's
 *  mode — which is what a single piece of state did before. */
const remembered = new Map<string, Mode>()

/** The app stores text and the editor edits text — there is nothing to convert. */
export function Editor({
  markdown,
  onChange,
  path,
  session,
}: {
  markdown: string
  onChange: (markdown: string) => void
  /** The project path, which is what decides the language and whether preview applies. */
  path: string
  /** A document somebody else is in. Passed straight through: what it changes is the
   *  buffer's ownership, which is the inner editor's business. */
  session?: CollabSession | null
}) {
  const [mode, setMode] = useState<Mode>(() => remembered.get(path) ?? 'live')

  // A source file has nothing to render, so it is always the buffer — ⌘E does nothing there
  // rather than showing you a page of escaped code.
  const markdownFile = isMarkdown(path)

  useEffect(() => {
    setMode(markdownFile ? (remembered.get(path) ?? 'live') : 'live')
  }, [path, markdownFile])

  useKeyDown((event) => {
    if (!markdownFile) return
    if (event.key !== 'e' || !(event.metaKey || event.ctrlKey)) return
    event.preventDefault()
    choose(mode === 'reading' ? 'live' : 'reading')
  })

  function choose(next: Mode) {
    remembered.set(path, next)
    setMode(next)
  }

  const html = useMemo(
    () => (mode === 'reading' ? render(markdown) : ''),
    [mode, markdown],
  )

  const body =
    mode === 'reading' ? (
      <div
        className="broodmother-editor broodmother-reading"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    ) : (
      <div className="broodmother-editor">
        <MarkdownEditor
          markdown={markdown}
          onChange={onChange}
          mode={mode}
          path={path}
          session={session}
        />
      </div>
    )

  if (!markdownFile) return body

  return (
    <div className="doc-modes-host">
      <ModePicker mode={mode} onChoose={choose} />
      {body}
    </div>
  )
}

/**
 * Not a band across the top of every note — that was weighed and rejected when the doc view
 * dropped its header. It sits in the corner and stays quiet until the pointer or the
 * keyboard arrives. ⌘E still toggles reading; this is how source is reached at all.
 */
function ModePicker({ mode, onChoose }: { mode: Mode; onChoose: (mode: Mode) => void }) {
  return (
    <div className="doc-modes" role="group" aria-label="View mode">
      {MODES.map((one) => (
        <button
          key={one}
          type="button"
          className="doc-modes-button"
          aria-pressed={mode === one}
          onClick={() => onChoose(one)}
        >
          {LABELS[one]}
        </button>
      ))}
    </div>
  )
}

/** The same editor, in a field's clothes: markdown that is part of a form rather than a
 *  document of its own, so it is a box a few lines tall with no mode to switch. */
export function InlineEditor({
  markdown,
  onChange,
  label,
}: {
  markdown: string
  onChange: (markdown: string) => void
  label: string
}) {
  return (
    <div className="broodmother-editor inline-editor" role="group" aria-label={label}>
      <MarkdownEditor markdown={markdown} onChange={onChange} compact path="inline.md" />
    </div>
  )
}
