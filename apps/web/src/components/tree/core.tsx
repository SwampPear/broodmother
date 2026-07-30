'use client'

import { useEffect, useState, type KeyboardEvent } from 'react'
import type { VaultEntry, VaultPath } from '@broodmother/shared'
import { ancestorsOf, flatten, type Row } from './paths'
import { type TreeCommand, TreeRow } from './row'
import { useTreeDrag } from './drag'

export type { TreeCommand }

export function FileTree({
  entries,
  current,
  onOpen,
  onCommand,
  onMove,
  renaming,
  onRename,
}: {
  entries: VaultEntry[]
  current: VaultPath | null
  onOpen: (path: VaultPath) => void
  onCommand: (command: TreeCommand, path: VaultPath) => void
  onMove: (from: VaultPath, to: VaultPath) => void
  /** The row waiting to be named — a note just created, which is nothing until it is. */
  renaming: VaultPath | null
  /** The filename typed into that row, or null if it was abandoned. The row closes either
   *  way; whether anything moves is the caller's to decide. */
  onRename: (path: VaultPath, name: string | null) => void
}) {
  const [expanded, setExpanded] = useState<Set<VaultPath>>(new Set())
  const [cursor, setCursor] = useState(0)

  const rows = flatten(entries, expanded)
  const at = Math.min(cursor, rows.length - 1)
  const row = rows[at]

  function toggle(path: VaultPath, open: boolean) {
    setExpanded((previous) => {
      const next = new Set(previous)
      if (open) next.add(path)
      else next.delete(path)
      return next
    })
  }

  const drag = useTreeDrag({
    expanded,
    onExpand: (path) => toggle(path, true),
    onMove,
  })

  function activate(going: Row) {
    if (going.entry.kind === 'dir')
      toggle(going.entry.path, !expanded.has(going.entry.path))
    else onOpen(going.entry.path)
  }

  // A row cannot be typed into while the folder holding it is shut.
  useEffect(() => {
    if (renaming === null) return
    setExpanded((previous) => new Set([...previous, ...ancestorsOf(renaming)]))
  }, [renaming])

  function onKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    if (!row) return
    const keys: Record<string, () => void> = {
      ArrowDown: () => setCursor(Math.min(cursor + 1, rows.length - 1)),
      ArrowUp: () => setCursor(Math.max(cursor - 1, 0)),
      ArrowRight: () => row.entry.kind === 'dir' && toggle(row.entry.path, true),
      ArrowLeft: () => row.entry.kind === 'dir' && toggle(row.entry.path, false),
      Enter: () => activate(row),
      n: () => onCommand('create', row.entry.path),
      r: () => onCommand('rename', row.entry.path),
      d: () => onCommand('delete', row.entry.path),
    }
    const handler = keys[event.key]
    if (!handler) return
    event.preventDefault()
    handler()
  }

  return (
    <nav className="tree" aria-label="vault">
      {/* Nothing sits above the rows. In the desktop app the window's own close, minimise
          and zoom buttons land on this row, which leaves it as the place to pick the window
          up by; in a browser tab it is the strip the tab bar beside it lines up with. */}
      <div className="tree-head" />
      <ul
        role="tree"
        tabIndex={0}
        onKeyDown={onKeyDown}
        // Whatever the rows leave over is the vault root, which is how a file comes back out.
        data-drop={drag.target === '' || undefined}
        onDragOver={drag.overRoot}
        onDrop={(event) => drag.drop(event, '')}
        onDragLeave={drag.leaveList}
      >
        {rows.map(({ entry, depth }, index) => (
          <TreeRow
            key={entry.path}
            entry={entry}
            depth={depth}
            expanded={expanded.has(entry.path)}
            selected={entry.path === current}
            cursor={index === at}
            renaming={entry.path === renaming}
            drag={drag}
            onActivate={() => activate({ entry, depth })}
            onFocus={() => setCursor(index)}
            onCommand={onCommand}
            onRename={(name) => onRename(entry.path, name)}
          />
        ))}
      </ul>
    </nav>
  )
}
