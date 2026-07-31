import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { createMockClient, type MockClient } from '../../api/mock'
import { AppProvider } from '../../state'
import { Shell } from './core'

let pathname = '/'
const push = vi.fn((next: string) => {
  pathname = next
})

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push }),
}))

vi.mock('../terminal/core', () => ({
  TerminalPanel: () => null,
  TerminalTab: ({ active }: { active: boolean }) => (
    <div hidden={!active}>a running shell</div>
  ),
}))

beforeEach(() => {
  pathname = '/'
  push.mockClear()
  // The window remembers where each checkout was left, and one test's memory is not the
  // next one's.
  localStorage.clear()
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

/* Having no vault is a state you are allowed to stand in. The app used to hold a modal
   over the whole window until you made one, which asked for a decision before you had seen
   anything to base it on. */
it('does not ask for a vault when there is none, and shows the app anyway', async () => {
  show(
    createMockClient({ vaults: [], active: null, config: { vaultPath: null } as never }),
  )

  await screen.findByText('the vault')
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
})

/* Who you are is the one thing it cannot invent: a vault is created working as a profile,
   so there has to be one to name. */
it('asks who you are on a fresh machine, and nothing else', async () => {
  const client = createMockClient({ profiles: [], vaults: [], active: null })
  show(client)
  await screen.findByRole('dialog', { name: 'Welcome to broodmother' })

  await userEvent.type(screen.getByLabelText('Profile name'), 'ada')
  await userEvent.type(screen.getByLabelText('Author email'), 'ada@example.com')
  await userEvent.click(screen.getByRole('button', { name: 'create profile' }))

  const { profiles } = await client.request('GET /api/profiles', null)
  expect(profiles.map((profile) => profile.name)).toEqual(['ada'])
  // And then it gets out of the way rather than asking the next question for you.
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
})

/* The first vault is made the way the tenth is: from the selector at the head of the
   tree, which opens whether or not there is a vault to name. */
it('makes the first vault from the selector, with no vault to start from', async () => {
  const client = createMockClient({
    vaults: [],
    active: null,
    config: { vaultPath: null } as never,
  })
  show(client)
  await screen.findByText('the vault')

  await userEvent.click(await screen.findByRole('button', { name: /No vault/ }))
  await userEvent.click(await screen.findByRole('menuitem', { name: /New vault/ }))

  await screen.findByRole('dialog', { name: 'New vault' })
  await userEvent.type(screen.getByLabelText('Name'), 'handbook')
  await userEvent.type(
    screen.getByLabelText('Git remote'),
    'git@github.com:you/handbook.git',
  )
  await userEvent.click(screen.getByRole('button', { name: 'create vault' }))

  const { vaults } = await client.request('GET /api/vaults', null)
  expect(vaults.map((vault) => vault.name)).toEqual(['handbook'])
})

/* And it can be walked away from, which the gate could not. */
it('lets the vault picker be dismissed even with nothing to open', async () => {
  show(
    createMockClient({ vaults: [], active: null, config: { vaultPath: null } as never }),
  )
  await screen.findByText('the vault')

  await userEvent.click(await screen.findByRole('button', { name: /No vault/ }))
  await userEvent.click(await screen.findByRole('menuitem', { name: /New vault/ }))
  await screen.findByRole('dialog', { name: 'New vault' })

  await userEvent.click(screen.getByRole('button', { name: 'cancel' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
})

/* A folder dropped into the home by hand has nobody to commit as, and that is the same
   question first run asks — with the profiles you already have to pick from. */
it('asks who you are in a vault that names no profile', async () => {
  const dropped = {
    name: 'dropped-in',
    path: '/Users/you/.broodmother/dropped-in',
    profile: undefined,
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

  pathname = '/doc/vault/Handbook/Overview.md'
  rerender(tree(client))

  const tab = await screen.findByRole('tab', { name: /Overview/ })
  expect(tab).toHaveAttribute('aria-selected', 'true')
})

it('closes a tab and goes back to the vault when it was the last one', async () => {
  const client = createMockClient()
  const { rerender } = show(client)
  pathname = '/doc/vault/Handbook/Overview.md'
  rerender(tree(client))
  await screen.findByRole('tab', { name: /Overview/ })

  await userEvent.click(screen.getByRole('button', { name: 'Close Overview' }))

  expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  expect(push).toHaveBeenCalledWith('/')
})

/* Settings is a page about the app rather than a place in it: there is nothing there to
   open in a tab or run in a shell. */
it('offers no new tab while the settings are up', async () => {
  pathname = '/settings'
  show(createMockClient())
  await screen.findByText('the vault')

  expect(screen.queryByRole('button', { name: 'New tab' })).not.toBeInTheDocument()
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

/* A file open on two branches is two files. Switching between them keeps each set where it
   was rather than carrying one into the other. */
it('keeps a tab set per branch', async () => {
  const client = createMockClient({
    branches: [
      { name: 'main', path: '/v/local', checkedOut: true, primary: true },
      { name: 'fix', path: '/v/fix', checkedOut: true, primary: false },
    ],
  })
  const { rerender } = show(client)
  await screen.findByText('the vault')

  pathname = '/doc/vault/Handbook/Overview.md'
  rerender(tree(client))
  await screen.findByRole('tab', { name: /Overview/ })

  // Switched from the control in the tab bar, the way it is switched in the app.
  await userEvent.click(screen.getByRole('button', { name: 'Branch' }))
  await userEvent.click(await screen.findByRole('menuitemradio', { name: /fix/ }))

  // The tab belonged to `local`, and that is where it stayed.
  await waitFor(() =>
    expect(screen.queryByRole('tab', { name: /Overview/ })).not.toBeInTheDocument(),
  )
})

/* Switching project is the same kind of move as switching branch: the tabs are the ones
   you had open there, and the branch selector points at the other repository. It is picked
   from the head of the tree, in the one list that says where you are working. */
it('swaps the tabs when you switch project, from the same menu as the vault', async () => {
  const client = createMockClient({
    projects: [
      { name: 'api', repo: '/dev/api', missing: false },
      { name: 'web', repo: '/dev/web', missing: false },
    ],
    project: 'api',
    projectDocs: { api: { 'main.rs': 'fn main() {}\n' } },
    projectBranches: {
      api: [{ name: 'main', path: '/dev/api', checkedOut: true, primary: true }],
    },
  })
  const { rerender } = show(client)
  await screen.findByText('the vault')

  pathname = '/doc/vault/Handbook/Overview.md'
  rerender(tree(client))
  await screen.findByRole('tab', { name: /Overview/ })
  // The head of the tree names the vault and the project in it, without being opened.
  const where = screen.getByRole('button', { name: /handbook/ })
  expect(where).toHaveTextContent('handbook')
  expect(where).toHaveTextContent('api')

  // Clicking the project's row is the whole gesture: the row you touch is the tree you
  // are working in, so there is no second control that says so.
  await userEvent.click(await screen.findByRole('treeitem', { name: 'web' }))

  await waitFor(() =>
    expect(screen.getByRole('button', { name: /handbook/ })).toHaveTextContent('web'),
  )
  // The tab belonged to the checkout you were in, and that is where it stayed.
  expect(screen.queryByRole('tab', { name: /Overview/ })).not.toBeInTheDocument()
})

/* One branch selector, not one per repository: it belongs to the tabs beside it, and the
   tabs are about the tree you are standing in. So it follows the scope. */
it('points the branch selector at the repository the scope is in', async () => {
  show(
    createMockClient({
      projects: [{ name: 'api', repo: '/dev/api', missing: false }],
      project: 'api',
      projectBranches: {
        api: [
          { name: 'main', path: '/dev/api', checkedOut: true, primary: true },
          {
            name: 'fix-login',
            path: '/h/.projects/api/fix-login',
            checkedOut: false,
            primary: false,
          },
        ],
      },
    }),
  )
  await screen.findByText('the vault')

  const menus = await screen.findAllByRole('button', { name: 'Branch' })
  expect(menus).toHaveLength(1)
  // The scope opens on the project, so the branches offered are the project's.
  await userEvent.click(menus[0]!)
  expect(
    await screen.findByRole('menuitemradio', { name: /fix-login/ }),
  ).toBeInTheDocument()
})

/* The dialog that used to stand here asked for a path, which is the one thing you cannot
   give before there is a note to give it to. */
it('makes a note called Untitled and opens its row to be named', async () => {
  const client = createMockClient()
  show(client)
  await screen.findByText('the vault')

  await userEvent.click(screen.getByRole('button', { name: 'New tab' }))
  await userEvent.click(await screen.findByRole('menuitem', { name: /New note/ }))

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  await waitFor(() => expect(push).toHaveBeenCalledWith('/doc/vault/Untitled.md'))
  const field = await screen.findByRole('textbox', { name: 'Rename Untitled.md' })
  expect(field).toHaveValue('Untitled')
  expect(field).toHaveFocus()
})

/* Naming is a rename, and a rename leaves the route naming a file that is gone. */
it('follows the note to the name it is given', async () => {
  const client = createMockClient()
  show(client)
  await screen.findByText('the vault')

  await userEvent.click(screen.getByRole('button', { name: 'New tab' }))
  await userEvent.click(await screen.findByRole('menuitem', { name: /New note/ }))
  await screen.findByRole('textbox', { name: 'Rename Untitled.md' })
  pathname = '/doc/vault/Untitled.md'

  await userEvent.keyboard('Ideas{Enter}')

  const { vault: entries } = await client.request('GET /api/tree', null)
  await waitFor(() =>
    expect(entries.some((entry) => entry.path === 'Ideas.md')).toBe(true),
  )
  await waitFor(() => expect(push).toHaveBeenCalledWith('/doc/vault/Ideas.md'))
})

/* Rename used to be "Rename or move…", a dialog asking for a whole path. The name is typed
   where the name is shown, so nothing opens over the top of the tree. */
it('renames from the row itself rather than a dialog', async () => {
  const client = createMockClient()
  show(client)
  await screen.findByText('the vault')
  await waitFor(() => expect(screen.getByRole('treeitem', { name: 'README.md' })))

  await userEvent.pointer({
    keys: '[MouseRight]',
    target: screen.getByRole('treeitem', { name: 'README.md' }),
  })
  await userEvent.click(await screen.findByRole('menuitem', { name: 'Rename note' }))

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  const field = await screen.findByRole('textbox', { name: 'Rename README.md' })
  // The extension is the tag beside the name, not something to type around.
  expect(field).toHaveValue('README')
  expect(field).toHaveFocus()
})

/* A folder answers `folderOf` with itself, so building the new path that way renamed
   `Handbook` to `Handbook/Manual` — a folder moved inside itself. It is the parent that
   the new name hangs off. */
it('renames a folder beside itself, not into itself', async () => {
  const client = createMockClient()
  const request = vi.spyOn(client, 'request')
  show(client)
  await screen.findByText('the vault')
  await waitFor(() => expect(screen.getByRole('treeitem', { name: 'Handbook' })))

  await userEvent.pointer({
    keys: '[MouseRight]',
    target: screen.getByRole('treeitem', { name: 'Handbook' }),
  })
  await userEvent.click(await screen.findByRole('menuitem', { name: 'Rename folder' }))
  await screen.findByRole('textbox', { name: 'Rename Handbook' })
  await userEvent.keyboard('Manual{Enter}')

  await waitFor(() =>
    expect(request).toHaveBeenCalledWith('POST /api/doc/move', {
      root: 'vault',
      from: 'Handbook',
      to: 'Manual',
    }),
  )
})

/* A second note made before the first is named cannot be called the same thing. */
it('numbers the next Untitled rather than colliding with it', async () => {
  const client = createMockClient()
  show(client)
  await screen.findByText('the vault')

  const note = async () => {
    await userEvent.click(screen.getByRole('button', { name: 'New tab' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: /New note/ }))
  }
  await note()
  await screen.findByRole('textbox', { name: 'Rename Untitled.md' })
  await note()

  await waitFor(() => expect(push).toHaveBeenCalledWith('/doc/vault/Untitled 2.md'))
})

it('opens the new-branch modal from the menu', async () => {
  show(createMockClient())
  await screen.findByText('the vault')

  await userEvent.click(await screen.findByRole('button', { name: 'Branch' }))
  await userEvent.click(await screen.findByRole('menuitem', { name: /New branch/ }))

  await screen.findByRole('dialog', { name: 'New branch' })
})

/* The route is one route for the whole window, so a switch that changed only the tabs left
   a document from the branch you just left sitting on screen. */
it('leaves the document behind when you switch checkout', async () => {
  const client = createMockClient({
    branches: [
      { name: 'main', path: '/v/local', checkedOut: true, primary: true },
      { name: 'fix', path: '/v/fix', checkedOut: true, primary: false },
    ],
  })
  const { rerender } = show(client)
  await screen.findByText('the vault')

  pathname = '/doc/vault/Handbook/Overview.md'
  rerender(tree(client))
  await screen.findByRole('tab', { name: /Overview/ })

  await userEvent.click(screen.getByRole('button', { name: 'Branch' }))
  await userEvent.click(await screen.findByRole('menuitemradio', { name: /fix/ }))

  // Nothing was open in `fix`, so it goes to the home screen rather than showing a file
  // that is not on this branch.
  await waitFor(() => expect(push).toHaveBeenCalledWith('/'))
})

it('goes back to what was open when you return', async () => {
  const client = createMockClient({
    branches: [
      { name: 'main', path: '/v/local', checkedOut: true, primary: true },
      { name: 'fix', path: '/v/fix', checkedOut: true, primary: false },
    ],
  })
  const { rerender } = show(client)
  await screen.findByText('the vault')

  pathname = '/doc/vault/Handbook/Overview.md'
  rerender(tree(client))
  await screen.findByRole('tab', { name: /Overview/ })

  // Away…
  await userEvent.click(screen.getByRole('button', { name: 'Branch' }))
  await userEvent.click(await screen.findByRole('menuitemradio', { name: /fix/ }))
  await waitFor(() => expect(push).toHaveBeenCalledWith('/'))
  pathname = '/'
  rerender(tree(client))

  // …and back.
  push.mockClear()
  await userEvent.click(screen.getByRole('button', { name: 'Branch' }))
  await userEvent.click(await screen.findByRole('menuitemradio', { name: /main/ }))

  await waitFor(() =>
    expect(push).toHaveBeenCalledWith('/doc/vault/Handbook/Overview.md'),
  )
})

/* Held in the window, the page each checkout was left on lasted exactly as long as the
   window did, and a relaunch sent every branch back to the home screen. */
it('remembers the page a checkout was left on across a relaunch', async () => {
  const client = createMockClient({
    branches: [
      { name: 'main', path: '/v/local', checkedOut: true, primary: true },
      { name: 'fix', path: '/v/fix', checkedOut: true, primary: false },
    ],
  })
  const { rerender, unmount } = show(client)
  await screen.findByText('the vault')

  pathname = '/doc/vault/Handbook/Overview.md'
  rerender(tree(client))
  await screen.findByRole('tab', { name: /Overview/ })

  // Left on `fix`, which is where the window closes.
  await userEvent.click(screen.getByRole('button', { name: 'Branch' }))
  await userEvent.click(await screen.findByRole('menuitemradio', { name: /fix/ }))
  await waitFor(() => expect(push).toHaveBeenCalledWith('/'))
  pathname = '/'
  unmount()

  // A new window on the same machine, opening where the app opens.
  push.mockClear()
  show(client)
  await screen.findByText('the vault')
  await userEvent.click(await screen.findByRole('button', { name: 'Branch' }))
  await userEvent.click(await screen.findByRole('menuitemradio', { name: /main/ }))

  await waitFor(() =>
    expect(push).toHaveBeenCalledWith('/doc/vault/Handbook/Overview.md'),
  )
})
