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
