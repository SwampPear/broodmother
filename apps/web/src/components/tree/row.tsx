'use client'

import type { VaultEntry, VaultPath } from '@broodmother/shared'
import { ContextMenu, displayName, fileTag, Icon, iconFor, type MenuSection } from '../ui'
import { RenameRow } from './rename'
import { dropFolder } from './paths'
import { type TreeDrag } from './drag'

export type TreeCommand = 'create' | 'rename' | 'delete'

// The same three commands the keys run. Rename opens no dialog: the row becomes the field.
function menuFor(
  path: VaultPath,
  onCommand: (command: TreeCommand, path: VaultPath) => void,
): MenuSection[] {
  return [
    {
      actions: [
        {
          id: 'create',
          label: 'New note here',
          icon: 'plus',
          onSelect: () => onCommand('create', path),
        },
        {
          id: 'rename',
          label: 'Rename',
          icon: 'file-text',
          onSelect: () => onCommand('rename', path),
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
}

export function TreeRow({
  entry,
  depth,
  expanded,
  selected,
  cursor,
  renaming,
  drag,
  onActivate,
  onFocus,
  onCommand,
  onRename,
}: {
  entry: VaultEntry
  depth: number
  expanded: boolean
  selected: boolean
  cursor: boolean
  renaming: boolean
  drag: TreeDrag
  onActivate: () => void
  onFocus: () => void
  onCommand: (command: TreeCommand, path: VaultPath) => void
  onRename: (name: string | null) => void
}) {
  return (
    <ContextMenu label={entry.name} sections={menuFor(entry.path, onCommand)}>
      <li
        role="treeitem"
        // The row shows basename and extension apart; assistive tech gets the name whole.
        aria-label={entry.name}
        aria-selected={selected}
        aria-expanded={entry.kind === 'dir' ? expanded : undefined}
        data-cursor={cursor || undefined}
        data-tint={depth % 6}
        data-dragging={entry.path === drag.dragging || undefined}
        data-drop={entry.path === drag.target || undefined}
        draggable={!renaming}
        onClick={() => {
          onFocus()
          onActivate()
        }}
        onContextMenu={onFocus}
        onDragStart={(event) => drag.start(event, entry.path)}
        onDragOver={(event) => drag.overRow(event, entry)}
        onDrop={(event) => drag.drop(event, dropFolder(entry))}
        onDragEnd={drag.end}
      >
        {Array.from({ length: depth }, (_, level) => (
          <span key={level} className="indent" data-tint={level % 6} aria-hidden />
        ))}
        {entry.kind === 'dir' ? (
          <Icon name={expanded ? 'chevron-down' : 'chevron-right'} />
        ) : (
          <Icon name={iconFor(entry.path)} />
        )}
        {renaming ? (
          <RenameRow entry={entry} onDone={onRename} />
        ) : (
          <>
            <span className="name">
              {entry.kind === 'file' ? displayName(entry.name) : entry.name}
            </span>
            {entry.kind === 'file' && fileTag(entry.name) && (
              <span className="tag">{fileTag(entry.name)}</span>
            )}
          </>
        )}
      </li>
    </ContextMenu>
  )
}
