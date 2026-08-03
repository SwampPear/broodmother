import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { serializeDream, type Dream } from '@broodmother/shared'
import { createMockClient, type MockClient } from '../../api/mock'
import { AppProvider } from '../../state'
import { DreamsView } from './overview'

const push = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/dreams',
}))

beforeEach(() => push.mockClear())

const nightly: Dream = {
  version: 1,
  nodes: [
    { id: 'pulse', kind: 'trigger.interval', name: 'Pulse', x: 0, y: 0, minutes: 5 },
    { id: 'log', kind: 'agent.note', name: 'Log it', x: 200, y: 0, path: 'Ran.md' },
  ],
  edges: [{ from: 'pulse', to: 'log' }],
}

function seeded(): MockClient {
  return createMockClient({ docs: { 'Nightly.dream': serializeDream(nightly) } })
}

async function show(client: MockClient = seeded()) {
  render(
    <AppProvider client={client}>
      <DreamsView />
    </AppProvider>,
  )
  await screen.findByRole('heading', { name: 'Dreams' })
  return client
}

it('tables each dream with where it lives and what fires it', async () => {
  await show()
  const row = (await screen.findByRole('button', { name: 'Nightly' })).closest('tr')!
  expect(row).toHaveTextContent('vault')
  expect(row).toHaveTextContent('every 5 minutes')
  expect(row).toHaveTextContent('never')
  expect(screen.getByText('Nothing has run yet.')).toBeInTheDocument()
})

it('opens the dream itself from its row', async () => {
  await show()
  await userEvent.click(await screen.findByRole('button', { name: 'Nightly' }))
  expect(push).toHaveBeenCalledWith('/doc/vault/Nightly.dream')
})

it('installs a starter into the vault and opens it, never over an existing one', async () => {
  const client = seeded()
  await show(client)
  const starters = screen.getByRole('region', { name: 'starter dreams' })
  expect(starters).toHaveTextContent('Repo watchdog')
  await userEvent.click(within(starters).getAllByRole('button', { name: 'Add' })[1])
  const { markdown } = await client.request('GET /api/doc', {
    root: 'vault',
    path: 'Repo watchdog.dream',
  })
  expect(markdown).toContain('agent.gate')
  expect(push).toHaveBeenCalledWith('/doc/vault/Repo watchdog.dream')

  // The name is taken now, so adding it again lands beside it.
  await userEvent.click(within(starters).getAllByRole('button', { name: 'Add' })[1])
  expect(push).toHaveBeenCalledWith('/doc/vault/Repo watchdog 2.dream')
})

it('logs the runs, and a run opens into its steps', async () => {
  const client = seeded()
  await client.request('POST /api/dream/run', { root: 'vault', path: 'Nightly.dream' })
  await show(client)
  const log = await screen.findByRole('region', { name: 'dream runs' })
  const entry = await within(log).findByRole('button', { name: /Nightly/ })
  expect(entry).toHaveTextContent('done')
  await userEvent.click(entry)
  expect(entry).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getByText('ran Log it')).toBeInTheDocument()
  const row = screen.getAllByRole('button', { name: 'Nightly' })[0].closest('tr')!
  expect(row).not.toHaveTextContent('never')
})
