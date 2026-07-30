'use client'

import fuzzysort from 'fuzzysort'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { VaultPath } from '@broodmother/shared'
import { Icon, displayName, fileTag, iconFor, type IconName } from './icons'

export interface FlowCtx {
  paths: VaultPath[]
  open(path: VaultPath): void
  /** Makes one and hands it to the tree to be named. Nothing to ask, so nothing is asked:
   *  the question a dialog put first — what is it called — is the one you answer last. */
  newNote(): void
  move(from: VaultPath, to: VaultPath): void
  remove(path: VaultPath): void
  syncNow(): void
  settings(): void
  toggleTerminal(): void
  vaults(): void
}

export type Flow =
  | { kind: 'search' }
  | { kind: 'pick'; label: string; next: (path: VaultPath) => Flow | null }
  | {
      kind: 'input'
      label: string
      initial: string
      next: (value: string) => Flow | null
    }
  | { kind: 'confirm'; label: string; detail: string; next: () => void }

/** A row in the list: what it matches on, what it looks like, and what choosing it does. */
interface Choice {
  key: string
  icon: IconName
  /** What fuzzy matching sees, and the accessible name of the row. */
  text: string
  name: string
  /** The folder a document sits in, dimmed after its name. Commands have none. */
  note?: string
  tag?: string
  run: () => Flow | null
}

/** Long lists are scrolled, not read: past this the rest is noise the query narrows down. */
const LIMIT = 60

export function moveFlow(ctx: FlowCtx, from: VaultPath): Flow {
  return {
    kind: 'input',
    label: `Move ${from} to`,
    initial: from,
    next: (to) => {
      ctx.move(from, to)
      return null
    },
  }
}

export function deleteFlow(ctx: FlowCtx, path: VaultPath): Flow {
  return {
    kind: 'confirm',
    label: `Delete ${path}?`,
    detail: 'The file is removed from disk. The app cannot undo it.',
    next: () => ctx.remove(path),
  }
}

function commands(ctx: FlowCtx): Choice[] {
  const pick = (label: string, next: (path: VaultPath) => Flow | null): Flow => ({
    kind: 'pick',
    label,
    next,
  })
  const done = (perform: () => void): Flow | null => {
    perform()
    return null
  }
  const command = (text: string, icon: IconName, run: () => Flow | null): Choice => ({
    key: `command:${text}`,
    icon,
    text,
    name: text,
    run,
  })
  return [
    command('New note', 'plus', () => done(() => ctx.newNote())),
    command('Move or rename document', 'file-text', () =>
      pick('Move', (path) => moveFlow(ctx, path)),
    ),
    command('Delete document', 'x', () =>
      pick('Delete', (path) => deleteFlow(ctx, path)),
    ),
    command('Toggle terminal', 'terminal', () => done(() => ctx.toggleTerminal())),
    command('Sync now', 'chevrons-up-down', () => done(() => ctx.syncNow())),
    command('Switch or create vault', 'layout-dashboard', () => done(() => ctx.vaults())),
    command('Settings', 'settings', () => done(() => ctx.settings())),
  ]
}

/** A document, matched on its whole path so a folder narrows the search the way a name does. */
function documentChoice(path: VaultPath, run: () => Flow | null): Choice {
  const cut = path.lastIndexOf('/')
  const base = cut < 0 ? path : path.slice(cut + 1)
  return {
    key: `doc:${path}`,
    icon: iconFor(path),
    text: path,
    name: displayName(base),
    note: cut < 0 ? undefined : path.slice(0, cut),
    tag: fileTag(base) ?? undefined,
    run,
  }
}

/** Commands and documents in one list: the top level searches both, and a picker asked for
 *  inside a command searches only documents, because a path is what it came back for. */
function choices(flow: Flow, ctx: FlowCtx): Choice[] {
  const docs = (run: (path: VaultPath) => Flow | null) =>
    ctx.paths.map((path) => documentChoice(path, () => run(path)))
  if (flow.kind === 'pick') return docs((path) => flow.next(path))
  if (flow.kind !== 'search') return []
  return [
    ...commands(ctx),
    ...docs((path) => {
      ctx.open(path)
      return null
    }),
  ]
}

export function Palette({
  flow,
  ctx,
  setFlow,
}: {
  flow: Flow
  ctx: FlowCtx
  setFlow: (flow: Flow | null) => void
}) {
  const [query, setQuery] = useState(flow.kind === 'input' ? flow.initial : '')
  const [cursor, setCursor] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const dialog = useRef<HTMLDivElement>(null)
  const current = useRef<HTMLLIElement>(null)

  useEffect(() => {
    setQuery(flow.kind === 'input' ? flow.initial : '')
    setCursor(0)
    ;(input.current ?? dialog.current)?.focus()
  }, [flow])

  const items = choices(flow, ctx)

  // With nothing typed the input order stands — commands first, then the vault in tree
  // order. A query replaces it with how well each row matches, documents and commands
  // ranked against each other rather than kept in separate piles.
  const matches =
    items.length === 0
      ? []
      : fuzzysort
          .go(query, items, { key: 'text', all: true, limit: LIMIT })
          .map((result) => result.obj)

  // The cursor walks past what the list shows; the list follows it rather than the reverse.
  useEffect(() => {
    current.current?.scrollIntoView({ block: 'nearest' })
  }, [cursor, query])

  const submit = () => {
    if (flow.kind === 'input') {
      const value = query.trim()
      setFlow(value ? flow.next(value) : null)
    } else if (flow.kind === 'confirm') {
      flow.next()
      setFlow(null)
    } else {
      const chosen = matches[cursor]
      setFlow(chosen ? chosen.run() : null)
    }
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setFlow(null)
    } else if (event.key === 'Enter') {
      submit()
    } else if (event.key === 'ArrowDown') {
      setCursor(Math.min(cursor + 1, matches.length - 1))
    } else if (event.key === 'ArrowUp') {
      setCursor(Math.max(cursor - 1, 0))
    } else {
      return
    }
    event.preventDefault()
  }

  const label = flow.kind === 'search' ? 'Search' : flow.label

  return (
    <div className="palette-backdrop">
      <div
        className="palette"
        // A question is a small dialog; a list of documents needs the width.
        data-confirm={flow.kind === 'confirm' || undefined}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        ref={dialog}
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        {flow.kind === 'confirm' ? (
          <>
            <p className="palette-label">{flow.label}</p>
            <p className="palette-detail">{flow.detail}</p>
            <div className="palette-actions">
              <button type="button" onClick={() => setFlow(null)}>
                cancel
              </button>
              <button type="button" className="danger" onClick={submit}>
                delete
              </button>
            </div>
          </>
        ) : (
          <>
            <label className="palette-label" htmlFor="palette-input">
              {label}
            </label>
            <input
              id="palette-input"
              ref={input}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              placeholder={flow.kind === 'search' ? 'documents and commands' : undefined}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setCursor(0)
              }}
            />
            {matches.length > 0 && (
              <ul role="listbox" aria-label={label}>
                {matches.map((match, index) => (
                  <li
                    key={match.key}
                    role="option"
                    // The row shows a basename beside its folder; assistive tech gets the
                    // path whole rather than the two glued together.
                    aria-label={match.text}
                    aria-selected={index === cursor}
                    data-cursor={index === cursor || undefined}
                    ref={index === cursor ? current : undefined}
                    onClick={() => setFlow(match.run())}
                  >
                    <Icon name={match.icon} />
                    <span className="name">{match.name}</span>
                    {match.note && <span className="note">{match.note}</span>}
                    {match.tag && <span className="tag">{match.tag}</span>}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  )
}
