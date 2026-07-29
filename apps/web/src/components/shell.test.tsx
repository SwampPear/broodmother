import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { createMockClient, type MockClient } from '../api/mock'
import { AppProvider } from '../state'
import { Shell } from './shell'

let pathname = '/'
const push = vi.fn((next: string) => {
  pathname = next
})

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push }),
}))

vi.mock('./terminal', () => ({
  TerminalPanel: () => null,
  TerminalTab: ({ active }: { active: boolean }) => (
    <div hidden={!active}>a running shell</div>
  ),
}))

beforeEach(() => {
  pathname = '/'
  push.mockClear()
})

const tree = (client: MockClient) => (
  <AppProvider client={client}>
    <Shell>
      <div>the vault</div>
    </Shell>
  </AppProvider>
)

const show = (client: MockClient) => render(tree(client))

it('opens on an empty home with the setup over it, not on a screen of its own', async () => {
  show(createMockClient({ profiles: [], projects: [], active: null }))

  await screen.findByRole('dialog', { name: 'Welcome to mother' })
  expect(screen.getByText('the vault')).toBeInTheDocument()
})

/* The gates read state that arrives a request later than the first paint. Opening them on
   the way past asks a project that already exists to introduce itself again. */
it('never asks where you are when a project is already there', async () => {
  show(createMockClient())

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  await screen.findByText('the vault')
  await waitFor(() => expect(screen.getByRole('treeitem', { name: 'README.md' })))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

it('asks for a vault once there is a project but nothing to open', async () => {
  show(createMockClient({ config: { vaultPath: null } as never }))

  await screen.findByRole('dialog', { name: 'Vaults' })
})

/* Who you are, then where you work: a project is created working as a profile, so there
   has to be one to name. */
it('walks a fresh machine from the first profile to the first project', async () => {
  const client = createMockClient({ profiles: [], projects: [], active: null })
  show(client)
  await screen.findByRole('dialog', { name: 'Welcome to mother' })

  await userEvent.type(screen.getByLabelText('Profile name'), 'ada')
  await userEvent.type(screen.getByLabelText('Git author email'), 'ada@example.com')
  await userEvent.click(screen.getByRole('button', { name: 'create profile' }))

  const { profiles } = await client.request('GET /api/profiles', null)
  expect(profiles.map((profile) => profile.name)).toEqual(['ada'])

  await screen.findByRole('dialog', { name: 'Your first project' })
  await userEvent.type(screen.getByLabelText('Project name'), 'acme')
  await userEvent.click(screen.getByRole('button', { name: 'create project' }))

  const { projects } = await client.request('GET /api/projects', null)
  expect(projects).toEqual([
    { name: 'acme', path: '/Users/you/.mother/acme', profile: 'ada' },
  ])
})

/* A folder dropped into the home by hand has nobody to commit as, and that is the same
   question first run asks — with the profiles you already have to pick from. */
it('asks who you are in a project that names no profile', async () => {
  const client = createMockClient({
    projects: [
      { name: 'dropped-in', path: '/Users/you/.mother/dropped-in', profile: null },
    ],
    active: { name: 'dropped-in', path: '/Users/you/.mother/dropped-in', profile: null },
  })
  show(client)

  await screen.findByRole('dialog', { name: 'Profiles' })
  await userEvent.click(screen.getByRole('button', { name: /you@example/ }))

  const { active } = await client.request('GET /api/projects', null)
  expect(active?.profile).toBe('you')
})

/* Tabs are the record of what you have open, so the thing that opens documents — the
   route — is what has to put them there. */
it('opens a tab for the document the route is on', async () => {
  const client = createMockClient()
  const { rerender } = show(client)
  await screen.findByText('the vault')

  pathname = '/doc/Handbook/Overview.md'
  rerender(tree(client))

  const tab = await screen.findByRole('tab', { name: /Overview/ })
  expect(tab).toHaveAttribute('aria-selected', 'true')
})

it('closes a tab and goes back to the vault when it was the last one', async () => {
  const client = createMockClient()
  const { rerender } = show(client)
  pathname = '/doc/Handbook/Overview.md'
  rerender(tree(client))
  await screen.findByRole('tab', { name: /Overview/ })

  await userEvent.click(screen.getByRole('button', { name: 'Close Overview' }))

  expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  expect(push).toHaveBeenCalledWith('/')
})

it('gives a terminal tab the whole pane, and hands it back on the way out', async () => {
  show(createMockClient())
  await screen.findByText('the vault')

  await userEvent.click(screen.getByRole('button', { name: 'New tab' }))
  await userEvent.click(await screen.findByRole('menuitem', { name: /Terminal/ }))

  expect(screen.getByRole('tab', { name: /terminal/ })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  expect(screen.getByText('a running shell')).toBeVisible()
  expect(screen.getByText('the vault')).not.toBeVisible()

  await userEvent.click(screen.getByRole('button', { name: 'Close terminal' }))
  expect(screen.getByText('the vault')).toBeVisible()
})
