'use client'

import { useState } from 'react'
import {
  projectOf,
  type DocPath,
  type DocRef,
  type DocRoot,
  type DreamSummary,
  type TreeEntry,
} from '@broodmother/shared'
import { entriesOf, flatten, refKey, type TreeRoot } from '../tree'
import { displayName, FileIcon, Icon } from '../ui'

export function ago(at: number, now: number): string {
  const minutes = Math.floor(Math.max(0, now - at) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

/** The dreams as trees headed the way the sidebar's are: the vault's first, then each
 *  project's, holding only the folders on the way to a dream. */
function rootsFor(dreams: DreamSummary[], vault: string): TreeRoot[] {
  const order: DocRoot[] = []
  const paths = new Map<DocRoot, DocPath[]>()
  for (const dream of dreams) {
    const have = paths.get(dream.ref.root)
    if (have) have.push(dream.ref.path)
    else {
      order.push(dream.ref.root)
      paths.set(dream.ref.root, [dream.ref.path])
    }
  }
  return order.map((root) => ({
    root,
    entries: entriesOf(paths.get(root) ?? []),
    label: projectOf(root) ?? vault,
  }))
}

function dirKeys(roots: TreeRoot[]): string[] {
  const collect = (entries: TreeEntry[], root: DocRoot): string[] =>
    entries.flatMap((entry) =>
      entry.kind === 'dir'
        ? [refKey({ root, path: entry.path }), ...collect(entry.children, root)]
        : [],
    )
  return roots.flatMap(({ root, entries }) => [
    refKey({ root, path: '' }),
    ...collect(entries, root),
  ])
}

/**
 * The scheduled panel as the sidebar's explorer in miniature: only the folders a dream is
 * in, each dream on its own row wearing what the table's columns used to say. What is shut
 * is remembered rather than what is open, so a dream the poll brings in arrives unfolded.
 */
export function DreamTree({
  dreams,
  now,
  vault,
  onOpen,
}: {
  dreams: DreamSummary[]
  now: number
  /** The vault's name, heading its rows the way the sidebar does. */
  vault: string
  onOpen: (ref: DocRef) => void
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const roots = rootsFor(dreams, vault)
  const expanded = new Set(dirKeys(roots).filter((key) => !collapsed.has(key)))
  const rows = flatten(roots, expanded)
  const byRef = new Map(dreams.map((dream) => [refKey(dream.ref), dream]))

  const toggle = (key: string) =>
    setCollapsed((shut) => {
      const next = new Set(shut)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  return (
    <div className="tree dream-tree">
      <ul role="tree">
        {rows.map(({ entry, root, depth }) => {
          const key = refKey({ root, path: entry.path })
          const folder = entry.kind === 'dir'
          const isRoot = entry.path === ''
          const act = () => (folder ? toggle(key) : onOpen({ root, path: entry.path }))
          const dream = folder ? undefined : byRef.get(key)
          return (
            <li
              key={key}
              role="treeitem"
              aria-label={entry.name}
              aria-expanded={folder ? !collapsed.has(key) : undefined}
              tabIndex={0}
              data-root={isRoot || undefined}
              data-tint={depth % 6}
              onClick={act}
              onKeyDown={(event) => event.key === 'Enter' && act()}
            >
              {Array.from({ length: depth }, (_, level) => (
                <span key={level} className="indent" data-tint={level % 6} aria-hidden />
              ))}
              {folder ? (
                <Icon name={collapsed.has(key) ? 'chevron-right' : 'chevron-down'} />
              ) : (
                <FileIcon path={entry.path} />
              )}
              <span className="name">
                {folder ? entry.name : displayName(entry.name)}
              </span>
              {isRoot && (
                <span
                  className="root-kind"
                  data-kind={root === 'vault' ? 'vault' : 'project'}
                >
                  <Icon name={root === 'vault' ? 'vault' : 'package'} />
                </span>
              )}
              {dream && (
                <>
                  <span className="dreams-dim fires">
                    {dream.triggers.length > 0
                      ? dream.triggers.map((trigger) => trigger.label).join(', ')
                      : 'nothing wired'}
                  </span>
                  {dream.lastRun ? (
                    <>
                      <span className="dream-state" data-state={dream.lastRun.state}>
                        {dream.lastRun.state}
                      </span>
                      <span className="dreams-dim">
                        {ago(dream.lastRun.startedAt, now)}
                      </span>
                    </>
                  ) : (
                    <span className="dreams-dim">never</span>
                  )}
                </>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
