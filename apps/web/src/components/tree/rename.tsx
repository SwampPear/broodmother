'use client'

import { useEffect, useRef, useState } from 'react'
import type { TreeEntry } from '@broodmother/shared'
import { displayName } from '../ui'

/** The row typed into where it sits. Only the basename is editable; the extension is the
 *  tag beside it and comes back on the way out. */
export function RenameRow({
  entry,
  onDone,
}: {
  entry: TreeEntry
  onDone: (name: string | null) => void
}) {
  const shown = entry.kind === 'file' ? displayName(entry.name) : entry.name
  const extension = entry.name.slice(shown.length)
  const [value, setValue] = useState(shown)
  const input = useRef<HTMLInputElement>(null)
  // Enter commits then blurs, and the blur must not commit again; Escape must not be undone.
  const settled = useRef(false)

  useEffect(() => {
    input.current?.focus()
    input.current?.select()
    input.current?.scrollIntoView({ block: 'nearest' })
  }, [])

  function finish(name: string | null) {
    if (settled.current) return
    settled.current = true
    onDone(name)
  }

  function typed() {
    return value.trim() ? `${value.trim()}${extension}` : null
  }

  return (
    <input
      ref={input}
      className="name rename"
      aria-label={`Rename ${entry.name}`}
      spellCheck={false}
      autoComplete="off"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      // The row underneath opens a document on click and runs commands on a keypress.
      onClick={(event) => event.stopPropagation()}
      onBlur={() => finish(typed())}
      onKeyDown={(event) => {
        event.stopPropagation()
        if (event.key === 'Enter') finish(typed())
        else if (event.key === 'Escape') finish(null)
      }}
    />
  )
}
