import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { SyncStatus } from '@/types'
import { StatusLine } from './status-line'

const sync = (status: Partial<SyncStatus> = {}): SyncStatus => ({
  state: 'idle',
  lastSyncedAt: undefined,
  conflicted: [],
  message: undefined,
  ...status,
})

function show(status: SyncStatus) {
  const onClearConflict = vi.fn()
  const onDismissNotice = vi.fn()
  render(
    <StatusLine
      sync={status}
      notice={null}
      onClearConflict={onClearConflict}
      onDismissNotice={onDismissNotice}
    />,
  )
  return { onClearConflict, onDismissNotice }
}

describe('SyncState', () => {
  it('renders idle with the last sync time', () => {
    show(sync({ lastSyncedAt: Date.UTC(2026, 0, 1, 12, 0, 0) }))
    expect(screen.getByText(/idle · synced/)).toBeInTheDocument()
  })

  it('renders idle that has never synced', () => {
    show(sync())
    expect(screen.getByText('idle · never synced')).toBeInTheDocument()
  })

  it('renders syncing', () => {
    show(sync({ state: 'syncing' }))
    expect(screen.getByText('syncing…')).toBeInTheDocument()
  })

  it('renders conflict with a banner naming the files', async () => {
    const { onClearConflict } = show(
      sync({ state: 'conflict', conflicted: ['Handbook/Overview.md'] }),
    )
    expect(screen.getByText('conflict · 1 file')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Handbook/Overview.md')
    await userEvent.click(screen.getByRole('button', { name: 'clear conflict' }))
    expect(onClearConflict).toHaveBeenCalled()
  })

  it('renders error with its message', () => {
    show(sync({ state: 'error', message: 'push rejected' }))
    expect(screen.getByText('error · push rejected')).toBeInTheDocument()
  })

  it('renders offline distinctly from error', () => {
    show(sync({ state: 'offline', message: 'no route to host' }))
    expect(screen.getByText('offline · no route to host')).toBeInTheDocument()
  })
})

it('dismisses a notice', async () => {
  const onDismissNotice = vi.fn()
  render(
    <StatusLine
      sync={sync()}
      notice="moved to a.md · 3 links rewritten"
      onClearConflict={vi.fn()}
      onDismissNotice={onDismissNotice}
    />,
  )
  await userEvent.click(screen.getByRole('button', { name: /3 links rewritten/ }))
  expect(onDismissNotice).toHaveBeenCalled()
})
