'use client'

import type { DocRef, DocRoot, TreeEntry } from '@broodmother/shared'
import { ContextMenu, displayName, fileTag, Icon, iconFor, type MenuSection } from '../ui'
import { RenameRow } from './rename'
import { dropFolder, sameRef } from './paths'
import { type TreeDrag } from './drag'

export type TreeCommand = 'create' | 'rename' | 'delete' | 'unlink'

// The same commands the keys run, named after what the row is: a menu that says
// `Delete folder…` over a folder has already answered what it is about to take. Rename opens
// no dialog — the row becomes the field.
function menuFor(
  ref: DocRef,
  entry: TreeEntry,
  onCommand: (command: TreeCommand, ref: DocRef) => void,
  root: boolean,
): MenuSection[] {
  const folder = entry.kind === 'dir'
  const what = folder ? 'folder' : 'note'
  return [
    {
      actions: [
        // Somewhere to put one is a folder. On a file the row is the note, and the only
        // things worth offering are the two that act on it.
        ...(folder
          ? [
              {
                id: 'create',
                label: 'New note here',
                icon: 'plus' as const,
                onSelect: () => onCommand('create', ref),
              },
            ]
          : []),
        // The project's own row stands for a repository, which has no name of its own to
        // type here and is not a file to throw away. What it does have is a link to this
        // vault, and that is the one thing this row can let go of.
        ...(root
          ? [
              {
                id: 'unlink',
                label: 'Unlink project…',
                description: 'The repository stays where it is',
                icon: 'x' as const,
                danger: true,
                onSelect: () => onCommand('unlink', ref),
              },
            ]
          : [
              {
                id: 'rename',
                label: `Rename ${what}`,
                icon: 'file-text' as const,
                onSelect: () => onCommand('rename', ref),
              },
              {
                id: 'delete',
                label: `Delete ${what}…`,
                icon: 'x' as const,
                danger: true,
                onSelect: () => onCommand('delete', ref),
              },
            ]),
      ],
    },
  ]
}

export function TreeRow({
  entry,
  root,
  scoped,
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
  entry: TreeEntry
  root: DocRoot
  /** In the tree the app is working in, which is the one the tabs and the branches are
   *  about. */
  scoped: boolean
  depth: number
  expanded: boolean
  selected: boolean
  cursor: boolean
  renaming: boolean
  drag: TreeDrag
  onActivate: () => void
  onFocus: () => void
  onCommand: (command: TreeCommand, ref: DocRef) => void
  onRename: (name: string | null) => void
}) {
  const ref: DocRef = { root, path: entry.path }
  // A tree's root has no path, so the one row wearing the empty one is the project itself.
  // Only a labelled root draws that row, and only a project is labelled.
  const isRoot = entry.path === ''

  return (
    <ContextMenu label={entry.name} sections={menuFor(ref, entry, onCommand, isRoot)}>
      <li
        role="treeitem"
        // The row shows basename and extension apart; assistive tech gets the name whole.
        aria-label={entry.name}
        aria-selected={selected}
        aria-expanded={entry.kind === 'dir' ? expanded : undefined}
        data-cursor={cursor || undefined}
        data-root={isRoot || undefined}
        data-scoped={scoped || undefined}
        data-tint={depth % 6}
        data-dragging={sameRef(ref, drag.dragging) || undefined}
        data-drop={sameRef(ref, drag.target) || undefined}
        draggable={!renaming && !isRoot}
        onClick={() => {
          onFocus()
          onActivate()
        }}
        // The pane behind the rows has a menu of its own. A row that has been right-clicked
        // has answered the question, so the event stops here rather than opening both.
        onContextMenu={(event) => {
          event.stopPropagation()
          onFocus()
        }}
        onDragStart={(event) => drag.start(event, ref)}
        onDragOver={(event) => drag.overRow(event, root, entry)}
        onDrop={(event) => drag.drop(event, { root, path: dropFolder(entry) })}
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
            {/* A repository looks like any other folder in a sidebar of them, and clicking
                this one moves the whole app. The same pill a file wears for its extension
                says which folders those are. */}
            {isRoot && <span className="tag">project</span>}
            {entry.kind === 'file' && fileTag(entry.name) && (
              <span className="tag">{fileTag(entry.name)}</span>
            )}
          </>
        )}
      </li>
    </ContextMenu>
  )
}
