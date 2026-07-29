'use client'

import { Editor as MarkdownEditor, type EditMode } from '@mother/editor'
import { render } from '@mother/markdown'
import { useEffect, useMemo, useState } from 'react'

export type Mode = EditMode | 'reading'

/** The app stores markdown and the editor edits markdown — there is nothing to convert. */
export function Editor({
  markdown,
  onChange,
}: {
  markdown: string
  onChange: (markdown: string) => void
}) {
  const [mode, setMode] = useState<Mode>('live')

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'e' || !(event.metaKey || event.ctrlKey)) return
      event.preventDefault()
      setMode((was) => (was === 'reading' ? 'live' : 'reading'))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const html = useMemo(
    () => (mode === 'reading' ? render(markdown) : ''),
    [mode, markdown],
  )

  if (mode === 'reading')
    return (
      <div
        className="mother-editor mother-reading"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )

  return (
    <div className="mother-editor">
      <MarkdownEditor markdown={markdown} onChange={onChange} mode={mode} />
    </div>
  )
}
