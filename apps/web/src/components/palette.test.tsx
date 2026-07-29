import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { expect, it, vi } from 'vitest'
import { Palette, type Flow, type FlowCtx } from './palette'

function ctx(): FlowCtx {
  return {
    paths: ['README.md', 'Handbook/Overview.md', 'Business/Roadmap.md'],
    open: vi.fn(),
    create: vi.fn(),
    move: vi.fn(),
    remove: vi.fn(),
    syncNow: vi.fn(),
    settings: vi.fn(),
    toggleTerminal: vi.fn(),
    vaults: vi.fn(),
  }
}

function open(flowCtx: FlowCtx, initial: Flow = { kind: 'commands' }) {
  function Harness() {
    const [flow, setFlow] = useState<Flow | null>(initial)
    return flow ? <Palette flow={flow} ctx={flowCtx} setFlow={setFlow} /> : <p>closed</p>
  }
  render(<Harness />)
}

it('lists every command and fuzzy-matches typing', async () => {
  open(ctx())
  expect(screen.getAllByRole('option')).toHaveLength(8)
  await userEvent.keyboard('snw')
  expect(screen.getAllByRole('option').map((item) => item.textContent)).toEqual([
    'Sync now',
  ])
})

it('runs a command with the keyboard alone', async () => {
  const flowCtx = ctx()
  open(flowCtx)
  await userEvent.keyboard('sync now{Enter}')
  expect(flowCtx.syncNow).toHaveBeenCalled()
  expect(screen.getByText('closed')).toBeInTheDocument()
})

it('walks open → pick → the chosen document', async () => {
  const flowCtx = ctx()
  open(flowCtx)
  await userEvent.keyboard('open document{Enter}')
  await userEvent.keyboard('overview{Enter}')
  expect(flowCtx.open).toHaveBeenCalledWith('Handbook/Overview.md')
})

it('moves the cursor with the arrow keys', async () => {
  const flowCtx = ctx()
  open(flowCtx, {
    kind: 'pick',
    label: 'Open',
    next: (path) => {
      flowCtx.open(path)
      return null
    },
  })
  const options = screen.getAllByRole('option').map((item) => item.textContent)
  await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowUp}{Enter}')
  expect(flowCtx.open).toHaveBeenCalledWith(options[1])
})

it('prompts for a path when creating', async () => {
  const flowCtx = ctx()
  open(flowCtx)
  await userEvent.keyboard('create document{Enter}')
  expect(screen.getByRole('dialog')).toHaveAccessibleName('New document path')
  await userEvent.keyboard('Notes/Today.md{Enter}')
  expect(flowCtx.create).toHaveBeenCalledWith('Notes/Today.md')
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
  expect(flowCtx.move).toHaveBeenCalledWith('README.md', 'Archive/README.md')
})

it('confirms a delete and says what it costs', async () => {
  const flowCtx = ctx()
  open(flowCtx)
  await userEvent.keyboard('delete{Enter}readme{Enter}')
  expect(screen.getByText('Delete README.md?')).toBeInTheDocument()
  expect(screen.getByText(/cannot undo/)).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'delete' }))
  expect(flowCtx.remove).toHaveBeenCalledWith('README.md')
})

it('cancels a delete on escape without removing anything', async () => {
  const flowCtx = ctx()
  open(flowCtx)
  await userEvent.keyboard('delete{Enter}readme{Enter}{Escape}')
  expect(flowCtx.remove).not.toHaveBeenCalled()
  expect(screen.getByText('closed')).toBeInTheDocument()
})
