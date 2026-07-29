'use client'

import fuzzysort from 'fuzzysort'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { VaultPath } from '@docs/shared'

export interface FlowCtx {
  paths: VaultPath[]
  open(path: VaultPath): void
  create(path: VaultPath): void
  move(from: VaultPath, to: VaultPath): void
  remove(path: VaultPath): void
  share(path: VaultPath): void
  syncNow(): void
  settings(): void
  toggleTerminal(): void
}

export type Flow =
  | { kind: 'commands' }
  | { kind: 'pick'; label: string; next: (path: VaultPath) => Flow | null }
  | {
      kind: 'input'
      label: string
      initial: string
      next: (value: string) => Flow | null
    }
  | { kind: 'confirm'; label: string; detail: string; next: () => void }

export function createFlow(ctx: FlowCtx, parent = ''): Flow {
  const dir = parent.includes('/') ? `${parent.slice(0, parent.lastIndexOf('/'))}/` : ''
  return {
    kind: 'input',
    label: 'New document path',
    initial: dir,
    next: (path) => {
      ctx.create(path)
      return null
    },
  }
}

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

function commands(ctx: FlowCtx): { label: string; run: () => Flow | null }[] {
  const pick = (label: string, next: (path: VaultPath) => Flow | null): Flow => ({
    kind: 'pick',
    label,
    next,
  })
  const done = (perform: () => void): Flow | null => {
    perform()
    return null
  }
  return [
    {
      label: 'Open document',
      run: () => pick('Open', (path) => done(() => ctx.open(path))),
    },
    { label: 'Create document', run: () => createFlow(ctx) },
    {
      label: 'Move or rename document',
      run: () => pick('Move', (path) => moveFlow(ctx, path)),
    },
    {
      label: 'Delete document',
      run: () => pick('Delete', (path) => deleteFlow(ctx, path)),
    },
    {
      label: 'Share document',
      run: () => pick('Share', (path) => done(() => ctx.share(path))),
    },
    { label: 'Toggle terminal', run: () => done(() => ctx.toggleTerminal()) },
    { label: 'Sync now', run: () => done(() => ctx.syncNow()) },
    { label: 'Settings', run: () => done(() => ctx.settings()) },
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

  useEffect(() => {
    setQuery(flow.kind === 'input' ? flow.initial : '')
    setCursor(0)
    ;(input.current ?? dialog.current)?.focus()
  }, [flow])

  const items =
    flow.kind === 'commands'
      ? commands(ctx).map((command) => ({ label: command.label, run: command.run }))
      : flow.kind === 'pick'
        ? ctx.paths.map((path) => ({ label: path, run: () => flow.next(path) }))
        : []

  const matches =
    items.length === 0
      ? []
      : fuzzysort
          .go(query, items, { key: 'label', all: true })
          .map((result) => result.obj)

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

  const label = flow.kind === 'commands' ? 'Command' : flow.label

  return (
    <div className="palette-backdrop">
      <div
        className="palette"
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
              <button type="button" onClick={submit}>
                delete
              </button>
              <button type="button" onClick={() => setFlow(null)}>
                cancel
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
                    key={match.label}
                    role="option"
                    aria-selected={index === cursor}
                    data-cursor={index === cursor || undefined}
                    onClick={() => setFlow(match.run())}
                  >
                    {match.label}
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
