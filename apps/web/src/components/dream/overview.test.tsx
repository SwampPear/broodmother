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
  return createMockClient({ docs: { 'Ops/Nightly.dream': serializeDream(nightly) } })
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

/* The panel is the sidebar's explorer in miniature: the folders a dream lives in, headed
   by the vault they hang from, with what the table's columns said now on the row. */
it('draws each dream in the folder it lives in, wearing what fires it', async () => {
  await show()
  const row = await screen.findByRole('treeitem', { name: 'Nightly.dream' })
  expect(row).toHaveTextContent('every 5 minutes')
  expect(row).toHaveTextContent('never')
  expect(screen.getByRole('treeitem', { name: 'Ops' })).toBeInTheDocument()
  expect(await screen.findByRole('treeitem', { name: 'handbook' })).toBeInTheDocument()
  expect(screen.getByText('Nothing has run yet.')).toBeInTheDocument()
})

it('opens the dream itself from its row', async () => {
  await show()
  await userEvent.click(await screen.findByRole('treeitem', { name: 'Nightly.dream' }))
  expect(push).toHaveBeenCalledWith('/doc/vault/Ops/Nightly.dream')
})

it('removes a hosted dream from the lair', async () => {
  const client = createMockClient({
    docs: { 'Nightly.dream': serializeDream(nightly) },
    lair: 'https://lair.example.com',
    lairDreams: [
      {
        site: 'docs',
        path: 'Nightly.dream',
        name: 'Nightly',
        triggers: [],
        lastRun: null,
      },
    ],
  })
  await show(client)
  const onLair = await screen.findByRole('region', { name: 'dreams on the lair' })
  await userEvent.click(
    within(onLair).getByRole('button', { name: 'remove Nightly from the lair' }),
  )
  expect(await within(onLair).findByText(/Nothing hosted yet/)).toBeInTheDocument()
})

/* Everything starts open — a filtered overview has nothing worth hiding — and a folder
   folds the way the sidebar's do. */
it('folds a folder shut and open again', async () => {
  await show()
  await screen.findByRole('treeitem', { name: 'Nightly.dream' })
  const folder = screen.getByRole('treeitem', { name: 'Ops' })
  expect(folder).toHaveAttribute('aria-expanded', 'true')

  await userEvent.click(folder)
  expect(
    screen.queryByRole('treeitem', { name: 'Nightly.dream' }),
  ).not.toBeInTheDocument()

  await userEvent.click(folder)
  expect(
    await screen.findByRole('treeitem', { name: 'Nightly.dream' }),
  ).toBeInTheDocument()
})

/* Each tree is headed the way the sidebar's are — and only the trees that hold a dream
   get a head at all. */
it('heads a project dream with its project, and skips trees without dreams', async () => {
  await show(
    createMockClient({
      projectDocs: { api: { 'Deploy.dream': serializeDream(nightly) } },
    }),
  )
  await screen.findByRole('treeitem', { name: 'api' })
  expect(screen.getByRole('treeitem', { name: 'Deploy.dream' })).toBeInTheDocument()
  expect(screen.queryByRole('treeitem', { name: 'handbook' })).not.toBeInTheDocument()
})

it('logs the runs, and a run opens into its steps', async () => {
  const client = seeded()
  await client.request('POST /api/dream/run', {
    root: 'vault',
    path: 'Ops/Nightly.dream',
  })
  await show(client)
  const log = await screen.findByRole('region', { name: 'dream runs' })
  const entry = await within(log).findByRole('button', { name: /Nightly/ })
  expect(entry).toHaveTextContent('done')
  await userEvent.click(entry)
  expect(entry).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getByText('ran Log it')).toBeInTheDocument()
  const row = screen.getByRole('treeitem', { name: 'Nightly.dream' })
  expect(row).toHaveTextContent('done')
  expect(row).not.toHaveTextContent('never')
})
