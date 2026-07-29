import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { createMockClient, type MockClient } from './api/mock'
import { AppProvider, useApp } from './state'

function Probe() {
  const app = useApp()
  return (
    <div>
      <span data-testid="session">{app.session?.state ?? 'solo'}</span>
      <span data-testid="peers">{app.session?.peers.length ?? 0}</span>
      <span data-testid="notice">{app.notice}</span>
      <span data-testid="files">{app.entries.length}</span>
      <span data-testid="divergence">{app.divergence?.path}</span>
      <button onClick={() => app.share('README.md')}>share</button>
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

it('starts solo and goes live when a document is shared', async () => {
  await show()
  expect(screen.getByTestId('session')).toHaveTextContent('solo')
  await userEvent.click(screen.getByRole('button', { name: 'share' }))
  expect(screen.getByTestId('session')).toHaveTextContent('live')
  expect(screen.getByTestId('peers')).toHaveTextContent('1')
})

it('surfaces divergence reported by the relay', async () => {
  const client = await show()
  act(() => {
    client.emit({ type: 'session', room: 'README.md', state: 'divergent', peers: [] })
    client.emit({
      type: 'divergence',
      report: { room: 'README.md', path: 'README.md', local: 'mine', remote: 'theirs' },
    })
  })
  expect(screen.getByTestId('session')).toHaveTextContent('divergent')
  expect(screen.getByTestId('divergence')).toHaveTextContent('README.md')
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
