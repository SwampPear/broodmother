import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { createMockClient, type MockClient } from '../api/mock'
import { AppProvider } from '../state'
import { TerminalPanel } from './terminal'

const written: string[] = []
let typed: ((data: string) => void) | null = null
const disposed = vi.fn()
const focused = vi.fn()

/** xterm needs a laid-out DOM jsdom does not have; the glue around it is what we test. */
vi.mock('@xterm/xterm', () => ({
  Terminal: class {
    cols = 100
    rows = 30
    loadAddon() {}
    open() {}
    write(data: string) {
      written.push(data)
    }
    onData(handler: (data: string) => void) {
      typed = handler
    }
    focus() {
      focused()
    }
    dispose() {
      disposed()
    }
  },
}))

vi.mock('@xterm/addon-fit', () => ({
  FitAddon: class {
    fit() {}
  },
}))

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    disconnect() {}
  },
)

async function show(props: Partial<Parameters<typeof TerminalPanel>[0]> = {}) {
  const client = createMockClient()
  const onExit = vi.fn()
  const onHide = vi.fn()
  const view = render(
    <AppProvider client={client}>
      <TerminalPanel
        height={288}
        onHeight={vi.fn()}
        visible
        onHide={onHide}
        onExit={onExit}
        {...props}
      />
    </AppProvider>,
  )
  await waitFor(() => expect(typed).not.toBeNull())
  return { client, onExit, onHide, view }
}

beforeEach(() => {
  written.length = 0
  typed = null
  disposed.mockClear()
  focused.mockClear()
})

it('sizes the shell to the panel and writes what it sends back', async () => {
  const { client } = await show()
  act(() => {
    ;(client as MockClient).emitTerminal({ type: 'output', data: 'ECSEQ-1 $ ' })
  })
  expect(written).toEqual(['ECSEQ-1 $ '])
})

it('sends what is typed to the shell', async () => {
  await show()
  act(() => typed?.('ls\r'))
  expect(written).toEqual(['ls\r']) // the mock client echoes input back as output
})

it('reports a shell that exited', async () => {
  const { client, onExit } = await show()
  act(() => {
    ;(client as MockClient).emitTerminal({ type: 'exit', code: 0 })
  })
  expect(onExit).toHaveBeenCalled()
})

/** The mock echoes input back as output, so a run command shows up in what was written. */
const bodies = () => document.querySelectorAll('.terminal-body')

it('opens a second shell on the claude tab and runs claude in it', async () => {
  const { client, onExit } = await show()
  await userEvent.click(screen.getByRole('button', { name: /claude code/ }))
  await waitFor(() => expect(bodies()).toHaveLength(2))

  act(() => client.emitTerminal({ type: 'output', data: '$ ' }))

  const run = written.find((data) => data.startsWith('claude'))
  expect(run).toContain('--dangerously-skip-permissions')
  expect(run).toContain(
    '--append-system-prompt "You are running in a terminal inside mother',
  )
  expect(run?.endsWith('"\r')).toBe(true)
  expect(disposed).not.toHaveBeenCalled()
  expect(onExit).not.toHaveBeenCalled()
})

/* Typed before the shell has printed its prompt, the command lands in a tty still echoing
   raw and is then redrawn by the line editor that starts underneath it — the same command
   on screen twice, which reads as claude having started twice. */
it('types nothing into a shell that has not spoken yet', async () => {
  const { client } = await show()
  await userEvent.click(screen.getByRole('button', { name: /claude code/ }))
  await waitFor(() => expect(bodies()).toHaveLength(2))

  expect(written.some((data) => data.startsWith('claude'))).toBe(false)

  act(() => client.emitTerminal({ type: 'output', data: '$ ' }))
  expect(written.filter((data) => data.startsWith('claude'))).toHaveLength(1)

  // And only once, however much the shell goes on to say.
  act(() => client.emitTerminal({ type: 'output', data: 'more output\r\n' }))
  expect(written.filter((data) => data.startsWith('claude'))).toHaveLength(1)
})

it('nothing runs claude until the tab is opened', async () => {
  await show()
  expect(written.join('')).not.toContain('claude')
  expect(bodies()).toHaveLength(1)
})

it('closes only the tab whose shell exited', async () => {
  const { client, onExit } = await show()
  await userEvent.click(screen.getByRole('button', { name: /claude code/ }))
  await waitFor(() => expect(bodies()).toHaveLength(2))

  // The mock routes to the shell that connected last, which is claude's.
  act(() => {
    ;(client as MockClient).emitTerminal({ type: 'exit', code: 0 })
  })
  expect(onExit).not.toHaveBeenCalled()
  expect(bodies()).toHaveLength(1)
  expect(screen.getByRole('button', { name: /^shell/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

it('hides on the close button without killing the shell', async () => {
  const { onHide } = await show()
  await userEvent.click(screen.getByRole('button', { name: /hide terminal/ }))
  expect(onHide).toHaveBeenCalled()
  expect(disposed).not.toHaveBeenCalled()
})

it('stays mounted but hidden when the panel is put away', async () => {
  const { view } = await show({ visible: false })
  expect(document.querySelector('.terminal')).toHaveAttribute('hidden')
  expect(disposed).not.toHaveBeenCalled()
  view.unmount()
  expect(disposed).toHaveBeenCalled()
})
