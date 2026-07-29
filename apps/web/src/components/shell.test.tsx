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
  show(createMockClient({ profiles: [], vaults: [], active: null }))

  await screen.findByRole('dialog', { name: 'Welcome to broodmother' })
  expect(screen.getByText('the vault')).toBeInTheDocument()
})

/* The gates read state that arrives a request later than the first paint. Opening them on
   the way past asks a vault that already exists to introduce itself again. */
it('never asks where you are when a vault is already there', async () => {
  show(createMockClient())

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  await screen.findByText('the vault')
  await waitFor(() => expect(screen.getByRole('treeitem', { name: 'README.md' })))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

it('asks for a vault once there is a profile but nothing to open', async () => {
  show(createMockClient({ config: { vaultPath: null } as never }))

  await screen.findByRole('dialog', { name: 'Vaults' })
})

/* Who you are, then where you work: a vault is created working as a profile, so there has
   to be one to name. */
it('walks a fresh machine from the first profile to the first vault', async () => {
  const client = createMockClient({ profiles: [], vaults: [], active: null })
  show(client)
  await screen.findByRole('dialog', { name: 'Welcome to broodmother' })

  await userEvent.type(screen.getByLabelText('Profile name'), 'ada')
  await userEvent.type(screen.getByLabelText('Git author email'), 'ada@example.com')
  await userEvent.click(screen.getByRole('button', { name: 'create profile' }))

  const { profiles } = await client.request('GET /api/profiles', null)
  expect(profiles.map((profile) => profile.name)).toEqual(['ada'])

  await screen.findByRole('dialog', { name: 'Your first vault' })
  await userEvent.type(screen.getByLabelText('Name'), 'handbook')
  await userEvent.type(
    screen.getByLabelText('Git remote'),
    'git@github.com:you/handbook.git',
  )
  await userEvent.click(screen.getByRole('button', { name: 'create vault' }))

  const { vaults } = await client.request('GET /api/vaults', null)
  expect(vaults.map((vault) => vault.name)).toEqual(['handbook'])
})

/* A folder dropped into the home by hand has nobody to commit as, and that is the same
   question first run asks — with the profiles you already have to pick from. */
it('asks who you are in a vault that names no profile', async () => {
  const dropped = {
    name: 'dropped-in',
    path: '/Users/you/.broodmother/dropped-in',
    profile: null,
  }
  const client = createMockClient({
    vaults: [dropped],
    active: dropped,
    config: { profiles: {} } as never,
  })
  show(client)

  await screen.findByRole('dialog', { name: 'Profiles' })
  await userEvent.click(screen.getByRole('button', { name: /you@example/ }))

  const { active } = await client.request('GET /api/vaults', null)
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

/* A file open in two worktrees is two files, on two branches. Switching between them keeps
   each set where it was rather than carrying one into the other. */
it('keeps a tab set per worktree', async () => {
  const client = createMockClient({
    worktrees: [
      { name: 'local', path: '/v/local', branch: 'main', primary: true },
      { name: 'fix', path: '/v/fix', branch: 'fix', primary: false },
    ],
  })
  const { rerender } = show(client)
  await screen.findByText('the vault')

  pathname = '/doc/Handbook/Overview.md'
  rerender(tree(client))
  await screen.findByRole('tab', { name: /Overview/ })

  // Switched from the control in the tab bar, the way it is switched in the app.
  await userEvent.click(screen.getByRole('button', { name: 'Worktree' }))
  await userEvent.click(await screen.findByRole('menuitemradio', { name: /fix/ }))

  // The tab belonged to `local`, and that is where it stayed.
  await waitFor(() =>
    expect(screen.queryByRole('tab', { name: /Overview/ })).not.toBeInTheDocument(),
  )
})

it('opens the new-worktree modal from the menu', async () => {
  show(createMockClient())
  await screen.findByText('the vault')

  await userEvent.click(await screen.findByRole('button', { name: 'Worktree' }))
  await userEvent.click(await screen.findByRole('menuitem', { name: /New worktree/ }))

  await screen.findByRole('dialog', { name: 'New worktree' })
})

/* The route is one route for the whole window, so a switch that changed only the tabs left
   a document from the branch you just left sitting on screen. */
it('leaves the document behind when you switch checkout', async () => {
  const client = createMockClient({
    worktrees: [
      { name: 'local', path: '/v/local', branch: 'main', primary: true },
      { name: 'fix', path: '/v/fix', branch: 'fix', primary: false },
    ],
  })
  const { rerender } = show(client)
  await screen.findByText('the vault')

  pathname = '/doc/Handbook/Overview.md'
  rerender(tree(client))
  await screen.findByRole('tab', { name: /Overview/ })

  await userEvent.click(screen.getByRole('button', { name: 'Worktree' }))
  await userEvent.click(await screen.findByRole('menuitemradio', { name: /fix/ }))

  // Nothing was open in `fix`, so it goes to the home screen rather than showing a file
  // that is not on this branch.
  await waitFor(() => expect(push).toHaveBeenCalledWith('/'))
})

it('goes back to what was open when you return', async () => {
  const client = createMockClient({
    worktrees: [
      { name: 'local', path: '/v/local', branch: 'main', primary: true },
      { name: 'fix', path: '/v/fix', branch: 'fix', primary: false },
    ],
  })
  const { rerender } = show(client)
  await screen.findByText('the vault')

  pathname = '/doc/Handbook/Overview.md'
  rerender(tree(client))
  await screen.findByRole('tab', { name: /Overview/ })

  // Away…
  await userEvent.click(screen.getByRole('button', { name: 'Worktree' }))
  await userEvent.click(await screen.findByRole('menuitemradio', { name: /fix/ }))
  await waitFor(() => expect(push).toHaveBeenCalledWith('/'))
  pathname = '/'
  rerender(tree(client))

  // …and back.
  push.mockClear()
  await userEvent.click(screen.getByRole('button', { name: 'Worktree' }))
  await userEvent.click(await screen.findByRole('menuitemradio', { name: /local/ }))

  await waitFor(() => expect(push).toHaveBeenCalledWith('/doc/Handbook/Overview.md'))
})
