import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { createMockClient, type MockClient } from './api/mock'
import { AppProvider, useApp } from './state'

function Probe() {
  const app = useApp()
  return (
    <div>
      <span data-testid="notice">{app.notice}</span>
      <span data-testid="files">{app.entries.length}</span>
      <button onClick={() => void app.move('README.md', 'Archive/README.md')}>
        move
      </button>
    </div>
  )
}

async function show(): Promise<MockClient> {
  const client = createMockClient()
  render(
    <AppProvider client={client}>
      <Probe />
    </AppProvider>,
  )
  await screen.findByText('3', { selector: '[data-testid="files"]' })
  return client
}

it('loads the vault tree over the API', async () => {
  await show()
  expect(screen.getByTestId('files')).toHaveTextContent('3')
})

it('reports how many links a move rewrote', async () => {
  await show()
  await userEvent.click(screen.getByRole('button', { name: 'move' }))
  expect(screen.getByTestId('notice')).toHaveTextContent('3 links rewritten')
})

it('surfaces relay errors as a notice', async () => {
  const client = await show()
  act(() => {
    client.emit({ type: 'error', message: 'relay unreachable' })
  })
  expect(screen.getByTestId('notice')).toHaveTextContent('relay unreachable')
})
