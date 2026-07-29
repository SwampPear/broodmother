'use client'

import { useState, type KeyboardEvent, type ReactNode } from 'react'
import type { VaultEntry, VaultPath } from '@broodmother/shared'
import { ContextMenu } from './context-menu'
import { Icon, displayName, fileTag, iconFor } from './icons'
import type { MenuSection } from './menu'

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
  head,
  onOpen,
  onCommand,
}: {
  entries: VaultEntry[]
  current: VaultPath | null
  head?: ReactNode
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

  // The same three commands the keys run, for the hand that reached for the mouse.
  const menuFor = (path: VaultPath): MenuSection[] => [
    {
      actions: [
        {
          id: 'create',
          label: 'New note here…',
          icon: 'plus',
          onSelect: () => onCommand('create', path),
        },
        {
          id: 'move',
          label: 'Rename or move…',
          icon: 'file-text',
          onSelect: () => onCommand('move', path),
        },
        {
          id: 'delete',
          label: 'Delete…',
          icon: 'x',
          danger: true,
          onSelect: () => onCommand('delete', path),
        },
      ],
    },
  ]

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
      {head}
      <ul role="tree" tabIndex={0} onKeyDown={onKeyDown}>
        {rows.map(({ entry, depth }, index) => (
          <ContextMenu key={entry.path} label={entry.name} sections={menuFor(entry.path)}>
            <li
              role="treeitem"
              // The row shows a basename and a separate extension tag; assistive tech gets
              // the filename whole rather than the two glued together.
              aria-label={entry.name}
              aria-selected={entry.path === current}
              aria-expanded={entry.kind === 'dir' ? expanded.has(entry.path) : undefined}
              data-cursor={index === Math.min(cursor, rows.length - 1) || undefined}
              data-tint={depth % 6}
              onClick={() => {
                setCursor(index)
                activate({ entry, depth })
              }}
              onContextMenu={() => setCursor(index)}
            >
              {Array.from({ length: depth }, (_, level) => (
                <span key={level} className="indent" data-tint={level % 6} aria-hidden />
              ))}
              {entry.kind === 'dir' ? (
                <Icon
                  name={expanded.has(entry.path) ? 'chevron-down' : 'chevron-right'}
                />
              ) : (
                <Icon name={iconFor(entry.path)} />
              )}
              <span className="name">
                {entry.kind === 'file' ? displayName(entry.name) : entry.name}
              </span>
              {entry.kind === 'file' && fileTag(entry.name) && (
                <span className="tag">{fileTag(entry.name)}</span>
              )}
            </li>
          </ContextMenu>
        ))}
      </ul>
    </nav>
  )
}
