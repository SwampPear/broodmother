import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { expect, it, vi } from 'vitest'
import { Palette } from './core'
import { type Flow, type FlowCtx } from './flows'

function ctx(): FlowCtx {
  return {
    refs: ['README.md', 'Handbook/Overview.md', 'Business/Roadmap.md'].map((path) => ({
      root: 'vault' as const,
      path,
    })),
    open: vi.fn(),
    newNote: vi.fn(),
    newDream: vi.fn(),
    move: vi.fn(),
    remove: vi.fn(),
    syncNow: vi.fn(),
    settings: vi.fn(),
    dreams: vi.fn(),
    toggleTerminal: vi.fn(),
    vaults: vi.fn(),
    projects: vi.fn(),
    createProject: vi.fn(),
    liveDoc: null,
    shareLive: vi.fn(),
    joinLive: vi.fn(),
  }
}

function open(flowCtx: FlowCtx, initial: Flow = { kind: 'search' }) {
  function Harness() {
    const [flow, setFlow] = useState<Flow | null>(initial)
    return flow ? <Palette flow={flow} ctx={flowCtx} setFlow={setFlow} /> : <p>closed</p>
  }
  render(<Harness />)
}

const listed = () =>
  screen.getAllByRole('option').map((item) => item.getAttribute('aria-label'))

it('offers every command and every document, commands first', async () => {
  open(ctx())
  expect(listed()).toEqual([
    'New note',
    'New dream',
    'Move or rename document',
    'Delete document',
    'Join a live session',
    'Toggle terminal',
    'Sync now',
    'Switch project',
    'New project',
    'Switch or create vault',
    'Dreams',
    'Settings',
    'README.md',
    'Handbook/Overview.md',
    'Business/Roadmap.md',
  ])
})

it('fuzzy-matches a command', async () => {
  open(ctx())
  await userEvent.keyboard('snw')
  expect(listed()).toEqual(['Sync now'])
})

it('fuzzy-matches a document by name or by folder', async () => {
  open(ctx())
  await userEvent.keyboard('overv')
  expect(listed()).toEqual(['Handbook/Overview.md'])
  await userEvent.clear(screen.getByRole('textbox'))
  await userEvent.keyboard('business')
  expect(listed()).toEqual(['Business/Roadmap.md'])
})

it('shows a document as its name beside its folder', async () => {
  open(ctx())
  await userEvent.keyboard('overv')
  const row = screen.getByRole('option', { name: 'Handbook/Overview.md' })
  expect(row).toHaveTextContent('Overview')
  expect(row).toHaveTextContent('Handbook')
})

it('runs a command with the keyboard alone', async () => {
  const flowCtx = ctx()
  open(flowCtx)
  await userEvent.keyboard('sync now{Enter}')
  expect(flowCtx.syncNow).toHaveBeenCalled()
  expect(screen.getByText('closed')).toBeInTheDocument()
})

it('opens a document straight from the search', async () => {
  const flowCtx = ctx()
  open(flowCtx)
  await userEvent.keyboard('overview{Enter}')
  expect(flowCtx.open).toHaveBeenCalledWith({
    root: 'vault',
    path: 'Handbook/Overview.md',
  })
  expect(screen.getByText('closed')).toBeInTheDocument()
})

it('moves the cursor with the arrow keys', async () => {
  const flowCtx = ctx()
  open(flowCtx, {
    kind: 'pick',
    label: 'Open',
    next: (ref) => {
      flowCtx.open(ref)
      return null
    },
  })
  const options = listed()
  await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowUp}{Enter}')
  expect(flowCtx.open).toHaveBeenCalledWith({ root: 'vault', path: options[1] })
})

/* It used to ask for a path, which is the one thing you cannot give before there is a note
   to give it to. The note is made, and named afterwards in the tree. */
it('makes a note without asking anything', async () => {
  const flowCtx = ctx()
  open(flowCtx)
  await userEvent.keyboard('new note{Enter}')
  expect(flowCtx.newNote).toHaveBeenCalled()
  expect(screen.getByText('closed')).toBeInTheDocument()
})

it('prefills the current path when moving', async () => {
  const flowCtx = ctx()
  open(flowCtx)
  await userEvent.keyboard('move{Enter}readme{Enter}')
  const input = screen.getByRole('textbox')
  expect(screen.getByRole('dialog')).toHaveAccessibleName('Move README.md to')
  expect(input).toHaveValue('README.md')
  await userEvent.clear(input)
  await userEvent.type(input, 'Archive/README.md{Enter}')
  expect(flowCtx.move).toHaveBeenCalledWith('vault', 'README.md', 'Archive/README.md')
})

it('picks a document rather than a command inside a command', async () => {
  const flowCtx = ctx()
  open(flowCtx)
  await userEvent.keyboard('delete document{Enter}')
  expect(listed()).toEqual(['README.md', 'Handbook/Overview.md', 'Business/Roadmap.md'])
})

it('confirms a delete and says what it costs', async () => {
  const flowCtx = ctx()
  open(flowCtx)
  await userEvent.keyboard('delete document{Enter}readme{Enter}')
  expect(screen.getByText('Delete README.md?')).toBeInTheDocument()
  expect(screen.getByText(/cannot undo/)).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'delete' }))
  expect(flowCtx.remove).toHaveBeenCalledWith({ root: 'vault', path: 'README.md' })
})

it('cancels a delete on escape without removing anything', async () => {
  const flowCtx = ctx()
  open(flowCtx)
  await userEvent.keyboard('delete document{Enter}readme{Enter}{Escape}')
  expect(flowCtx.remove).not.toHaveBeenCalled()
  expect(screen.getByText('closed')).toBeInTheDocument()
})
