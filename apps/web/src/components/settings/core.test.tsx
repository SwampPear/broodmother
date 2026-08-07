import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import type { ApiRoute } from '@broodmother/shared'
import { createMockClient } from '../../api/mock'
import { AppProvider } from '../../state'
import { SettingsView } from './core'

/** The real editor is Monaco; what this file is about is which markdown reaches it. */
vi.mock('../../editor', () => ({
  InlineEditor: ({
    markdown,
    onChange,
    label,
  }: {
    markdown: string
    onChange: (next: string) => void
    label: string
  }) => (
    <textarea
      aria-label={label}
      value={markdown}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}))

async function show(client = createMockClient()) {
  render(
    <AppProvider client={client}>
      <SettingsView />
    </AppProvider>,
  )
  await screen.findByLabelText('Author name')
  return client
}

/** The section being tested, picked off the rail the way anyone reaching it would. */
async function open(section: string) {
  await userEvent.click(screen.getByRole('tab', { name: section }))
}

/** The colours the profile is offered, in the order the dropdown lists them. */
async function palette() {
  await userEvent.click(screen.getByLabelText('Color'))
  const rows = await screen.findAllByRole('menuitemradio')
  return rows.map((row) => row.textContent)
}

const NO_GIT = { repo: false, remoteUrl: null, branch: null }

/* One section at a time, so the page is as long as what you came to change rather than as
   long as everything. */
it('opens on the profile, and shows one section at a time', async () => {
  await show()
  expect(screen.getByRole('tab', { name: 'Profile' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  // The key is the profile's, so it is under it rather than beside it.
  expect(screen.getByRole('heading', { name: 'Key' })).toBeVisible()
  expect(screen.queryByLabelText('Repository')).not.toBeInTheDocument()

  await open('Vault')
  expect(screen.getByRole('tab', { name: 'Vault' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  // And the sync is the vault's.
  expect(screen.getByRole('heading', { name: 'Git sync' })).toBeVisible()
  expect(screen.getByLabelText('Repository')).toBeVisible()
  expect(screen.queryByLabelText('Author name')).not.toBeInTheDocument()
})

/* A section is about something you have open: there is nothing to say about a project when
   the vault has none. */
it('offers the project section only while a project is open', async () => {
  await show()
  expect(screen.queryByRole('tab', { name: 'Project' })).not.toBeInTheDocument()

  await show(
    createMockClient({
      projects: [
        { name: 'api', repo: '/Users/you/.broodmother/you/handbook/.projects/api/local' },
      ],
      project: 'api',
    }),
  )
  await open('Project')
  expect(screen.getByLabelText('Repository')).toHaveValue(
    '~/.broodmother/you/handbook/.projects/api/local',
  )
})

it('saves the sync settings for the open vault', async () => {
  const client = await show()
  await open('Vault')
  await userEvent.click(screen.getByRole('checkbox', { name: 'Push after committing' }))
  const idle = screen.getByLabelText('Idle before sync (seconds)')
  await userEvent.clear(idle)
  await userEvent.type(idle, '30')
  await userEvent.click(screen.getByRole('button', { name: 'save sync settings' }))

  const { settings } = await client.request('GET /api/git', null)
  expect(settings).toMatchObject({ enabled: true, push: false, idleMs: 30_000 })
})

it('says what the switches add up to, rather than leaving it to be worked out', async () => {
  await show()
  await open('Vault')
  expect(
    screen.getByText(
      'After 10s of quiet, broodmother commits what changed, then pulls, then pushes.',
    ),
  ).toBeInTheDocument()

  await userEvent.click(screen.getByRole('checkbox', { name: 'Push after committing' }))
  expect(
    screen.getByText('After 10s of quiet, broodmother commits what changed, then pulls.'),
  ).toBeInTheDocument()
})

it('reports a vault with no repository, and offers it no sync switches', async () => {
  await show(createMockClient({ gitState: NO_GIT }))
  await open('Vault')

  expect(screen.getByLabelText('Repository')).toHaveValue(
    'none, this vault is a plain folder',
  )
  expect(screen.getByText(/Nothing syncs: this vault has no repository/)).toBeVisible()
  expect(screen.getByRole('checkbox', { name: 'Sync this vault' })).toBeDisabled()
})

it('reports a repository that has no remote as local only', async () => {
  await show(
    createMockClient({ gitState: { repo: true, remoteUrl: null, branch: 'main' } }),
  )
  await open('Vault')
  expect(screen.getByLabelText('Repository')).toHaveValue('local only, no remote')
})

/* `auth` on its own is not something anybody can act on, so the check names which of the
   four it is and what to do about it. */
it('checks access on request, and says which answer it got', async () => {
  await show()
  await open('Vault')
  await userEvent.click(screen.getByRole('button', { name: 'check access' }))

  expect(await screen.findByText('reachable')).toHaveAttribute('data-ok', 'true')
  expect(screen.getByText(/Reached git@github.com/)).toBeVisible()
})

it('names a folder with no repository rather than calling it a failure', async () => {
  await show(createMockClient({ gitState: NO_GIT }))
  await open('Vault')
  await userEvent.click(screen.getByRole('button', { name: 'check access' }))

  expect(await screen.findByText('no repository')).toHaveAttribute('data-ok', 'false')
  expect(screen.getByText(/not a repository/)).toBeVisible()
})

/* The whole point of it: no key, no URL, nothing pasted back — a code read off one screen
   and typed into another. */
it('connects to GitHub with a code, and drops the connection when asked', async () => {
  const client = await show(createMockClient({ githubReady: true }))

  await userEvent.click(screen.getByRole('button', { name: 'connect GitHub' }))
  expect(await screen.findByText('ABCD-1234')).toBeVisible()

  // The browser half is stood in for by the mock: the first ask is pending, the next is not.
  expect(await screen.findByText(/Connected as/)).toBeVisible()

  await userEvent.click(screen.getByRole('button', { name: 'disconnect' }))
  expect(await screen.findByRole('button', { name: 'connect GitHub' })).toBeVisible()
  expect((await client.request('GET /api/profiles', null)).active?.github).toBeNull()
})

/* A button that cannot work is worse than no button, and a build with no client id has
   nothing to connect with. */
it('offers no GitHub connection in a build that has none', async () => {
  await show()
  expect(screen.queryByRole('button', { name: 'connect GitHub' })).not.toBeInTheDocument()
})

/* The one step of setting a key up that the app can take off you. */
it('generates a key and shows the public half with somewhere to put it', async () => {
  await show()

  expect(screen.queryByText(/^ssh-ed25519/)).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'generate a key' }))

  expect(await screen.findByText(/^ssh-ed25519 /)).toBeVisible()
  expect(screen.getByRole('link', { name: /add to GitHub/ })).toHaveAttribute(
    'href',
    'https://github.com/settings/ssh/new',
  )
  expect(screen.getByRole('button', { name: 'copy key' })).toBeVisible()
})

/* Most people have an agent already and need none of this, which the copy has to say
   before it offers the button. */
it('says the machine’s own credentials are used before offering to make a key', async () => {
  await show()
  expect(screen.getByText(/already uses whatever ssh and git have/)).toBeVisible()
})

/* Pointing the config at a folder broodmother never made is not a setting, it is a break.
   The repository is read off the checkout, so it is not typed here either. */
it('will not let the vault folder or its repository be retyped', async () => {
  await show()
  await open('Vault')
  expect(screen.getByLabelText('Folder')).toHaveAttribute('readonly')
  expect(screen.getByText(/make\s+another vault/)).toBeInTheDocument()
  expect(screen.getByLabelText('Repository')).toHaveAttribute('readonly')
})

it('names the fields the backend had to reset', async () => {
  const client = createMockClient()
  const request = client.request.bind(client)
  client.request = (async (route: ApiRoute, body: never) => {
    const result = await request(route, body)
    return route === 'GET /api/config'
      ? { ...result, reset: ['checkouts', 'git'] }
      : result
  }) as typeof client.request
  await show(client)
  expect(screen.getByRole('alert')).toHaveTextContent('checkouts, git')
})

it('opens the palette on the colour the profile already is', async () => {
  await show(
    createMockClient({
      profiles: [
        {
          name: 'you',
          path: '/Users/you/.broodmother/you/profile.json',
          color: '#b39051',
          gitAuthor: { name: 'You', email: 'you@example.com' },
          sshKeyPath: null,
          claudeCfgDir: null,
          soul: null,
          github: null,
          lair: null,
        },
      ],
    }),
  )
  await open('Profile')
  expect(await palette()).toEqual([
    'opal gold',
    'opal navy',
    'opal violet',
    'opal indigo',
    'opal cyan',
    'opal mint',
    'opal rose',
  ])
})

it('offers only the opal palette as colours', async () => {
  await show()
  await open('Profile')
  expect(await palette()).toEqual([
    'opal violet',
    'opal indigo',
    'opal cyan',
    'opal mint',
    'opal rose',
    'opal gold',
    'opal navy',
  ])
})

/* The one button that cannot be taken back, so it is asked twice and the first answer
   counts for nothing. It is at the foot of the profile: what it empties is the profile's. */
it('empties the home from the danger zone, and only once it is confirmed', async () => {
  const client = await show()

  await userEvent.click(screen.getByRole('button', { name: 'delete all data…' }))
  await userEvent.click(screen.getByRole('button', { name: 'cancel' }))
  expect((await client.request('GET /api/vaults', null)).vaults).toHaveLength(1)

  await userEvent.click(screen.getByRole('button', { name: 'delete all data…' }))
  await userEvent.click(screen.getByRole('button', { name: 'delete all data' }))

  const vaults = await client.request('GET /api/vaults', null)
  expect(vaults.vaults).toEqual([])
  expect(vaults.active).toBeNull()
  const { config } = await client.request('GET /api/config', null)
  expect(config).toEqual({
    vaultPath: null,
    profile: null,
    checkouts: {},
    git: {},
    project: {},
    projectBranch: {},
  })
})

/* Credentials belong to the profile rather than to this machine's config, so they save on
   the profile's own button and land in its file. */
it('saves the credentials the profile works with', async () => {
  const client = await show()
  await open('Profile')
  await userEvent.type(screen.getByLabelText('SSH key'), '~/.ssh/id_ed25519')
  await userEvent.type(screen.getByLabelText('Config directory'), '~/.claude-work')
  await userEvent.click(screen.getByRole('button', { name: 'save profile' }))

  const { active } = await client.request('GET /api/profiles', null)
  expect(active).toMatchObject({
    sshKeyPath: '~/.ssh/id_ed25519',
    claudeCfgDir: '~/.claude-work',
    soul: null,
  })
})

/* Who claude is while it works as this profile, written as markdown because that is what
   the box it is written in edits. */
it('saves the soul the claude shells of this profile wake up with', async () => {
  const client = await show()
  await open('Profile')
  await userEvent.type(screen.getByLabelText('Soul'), '# You\n\nTerse.')
  await userEvent.click(screen.getByRole('button', { name: 'save profile' }))

  const { active } = await client.request('GET /api/profiles', null)
  expect(active).toMatchObject({ soul: '# You\n\nTerse.' })
})
