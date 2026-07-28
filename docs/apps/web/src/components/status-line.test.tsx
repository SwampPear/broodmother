import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Peer, SessionState, SyncStatus } from '@docs/shared'
import { StatusLine } from './status-line'

const sync = (status: Partial<SyncStatus> = {}): SyncStatus => ({
  state: 'idle',
  lastSyncedAt: null,
  conflicted: [],
  message: null,
  ...status,
})

function show(status: SyncStatus, session: SessionState = 'solo', peers: Peer[] = []) {
  const onClearConflict = vi.fn()
  const onDismissNotice = vi.fn()
  render(
    <StatusLine
      sync={status}
      session={session}
      peers={peers}
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
      sync({ state: 'conflict', conflicted: ['ECSEQ-1/Whitepaper.md'] }),
    )
    expect(screen.getByText('conflict · 1 file')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('ECSEQ-1/Whitepaper.md')
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

describe('SessionState', () => {
  const peer: Peer = { id: 'a', displayName: 'ada', color: '#c084fc', selection: null }

  it('renders solo', () => {
    show(sync(), 'solo')
    expect(screen.getByText('solo')).toBeInTheDocument()
  })

  it('renders connecting', () => {
    show(sync(), 'connecting')
    expect(screen.getByText('connecting…')).toBeInTheDocument()
  })

  it('renders live with peers in their presence colors', () => {
    show(sync(), 'live', [peer])
    expect(screen.getByText('live · 1 here')).toBeInTheDocument()
    expect(screen.getByText('● ada')).toHaveStyle({ color: 'rgb(192, 132, 252)' })
  })

  it('renders divergent', () => {
    show(sync(), 'divergent')
    expect(
      screen.getByText(/divergent · your file differs from the room/),
    ).toBeInTheDocument()
  })
})

it('dismisses a notice', async () => {
  const onDismissNotice = vi.fn()
  render(
    <StatusLine
      sync={sync()}
      session="solo"
      peers={[]}
      notice="moved to a.md · 3 links rewritten"
      onClearConflict={vi.fn()}
      onDismissNotice={onDismissNotice}
    />,
  )
  await userEvent.click(screen.getByRole('button', { name: /3 links rewritten/ }))
  expect(onDismissNotice).toHaveBeenCalled()
})
