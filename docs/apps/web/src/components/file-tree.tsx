'use client'

import { useState, type KeyboardEvent } from 'react'
import type { VaultEntry, VaultPath } from '@docs/shared'

export type TreeCommand = 'create' | 'move' | 'delete'

interface Row {
  entry: VaultEntry
  depth: number
}

function flatten(entries: VaultEntry[], expanded: Set<VaultPath>, depth = 0): Row[] {
  return entries.flatMap((entry) =>
    entry.kind === 'dir' && expanded.has(entry.path)
      ? [{ entry, depth }, ...flatten(entry.children, expanded, depth + 1)]
      : [{ entry, depth }],
  )
}

export function filePaths(entries: VaultEntry[]): VaultPath[] {
  return entries.flatMap((entry) =>
    entry.kind === 'dir' ? filePaths(entry.children) : [entry.path],
  )
}

export function FileTree({
  entries,
  current,
  onOpen,
  onCommand,
}: {
  entries: VaultEntry[]
  current: VaultPath | null
  onOpen: (path: VaultPath) => void
  onCommand: (command: TreeCommand, path: VaultPath) => void
}) {
  const [expanded, setExpanded] = useState<Set<VaultPath>>(new Set())
  const [cursor, setCursor] = useState(0)
  const rows = flatten(entries, expanded)
  const row = rows[Math.min(cursor, rows.length - 1)]

  const toggle = (path: VaultPath, open: boolean) =>
    setExpanded((previous) => {
      const next = new Set(previous)
      if (open) next.add(path)
      else next.delete(path)
      return next
    })

  const activate = (target: Row) => {
    if (target.entry.kind === 'dir')
      toggle(target.entry.path, !expanded.has(target.entry.path))
    else onOpen(target.entry.path)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (!row) return
    const keys: Record<string, () => void> = {
      ArrowDown: () => setCursor(Math.min(cursor + 1, rows.length - 1)),
      ArrowUp: () => setCursor(Math.max(cursor - 1, 0)),
      ArrowRight: () => row.entry.kind === 'dir' && toggle(row.entry.path, true),
      ArrowLeft: () => row.entry.kind === 'dir' && toggle(row.entry.path, false),
      Enter: () => activate(row),
      n: () => onCommand('create', row.entry.path),
      r: () => onCommand('move', row.entry.path),
      d: () => onCommand('delete', row.entry.path),
    }
    const handler = keys[event.key]
    if (!handler) return
    event.preventDefault()
    handler()
  }

  return (
    <nav className="tree" aria-label="vault">
      <ul role="tree" tabIndex={0} onKeyDown={onKeyDown}>
        {rows.map(({ entry, depth }, index) => (
          <li
            key={entry.path}
            role="treeitem"
            aria-selected={entry.path === current}
            aria-expanded={entry.kind === 'dir' ? expanded.has(entry.path) : undefined}
            data-cursor={index === Math.min(cursor, rows.length - 1) || undefined}
            style={{ paddingLeft: `${depth}rem` }}
            onClick={() => {
              setCursor(index)
              activate({ entry, depth })
            }}
          >
            <span className="glyph" aria-hidden>
              {entry.kind === 'dir' ? (expanded.has(entry.path) ? '▾' : '▸') : '·'}
            </span>
            {entry.name}
          </li>
        ))}
      </ul>
      <p className="hint">↑↓ move · ←→ fold · ↵ open · n new · r move · d delete</p>
    </nav>
  )
}
