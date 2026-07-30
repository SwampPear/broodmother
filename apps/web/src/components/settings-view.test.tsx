import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import type { ApiRoute } from '@broodmother/shared'
import { createMockClient } from '../api/mock'
import { AppProvider } from '../state'
import { SettingsView } from './settings-view'

async function show(client = createMockClient()) {
  render(
    <AppProvider client={client}>
      <SettingsView />
    </AppProvider>,
  )
  await screen.findByLabelText('Vault path')
  return client
}

const NO_GIT = { repo: false, remoteUrl: null, branch: null }

it('saves the sync settings for the open vault', async () => {
  const client = await show()
  await userEvent.click(screen.getByRole('checkbox', { name: 'Push after committing' }))
  const idle = screen.getByLabelText('Idle before sync (ms)')
  await userEvent.clear(idle)
  await userEvent.type(idle, '30000')
  await userEvent.click(screen.getByRole('button', { name: 'save sync settings' }))

  const { settings } = await client.request('GET /api/git', null)
  expect(settings).toMatchObject({ enabled: true, push: false, idleMs: 30_000 })
})

it('says what the switches add up to, rather than leaving it to be worked out', async () => {
  await show()
  expect(
    screen.getByText('After 10s of quiet, broodmother commits what changed, then pulls, then pushes.'),
  ).toBeInTheDocument()

  await userEvent.click(screen.getByRole('checkbox', { name: 'Push after committing' }))
  expect(
    screen.getByText('After 10s of quiet, broodmother commits what changed, then pulls.'),
  ).toBeInTheDocument()
})

it('reports a vault with no repository, and offers it no sync switches', async () => {
  await show(createMockClient({ gitState: NO_GIT }))

  expect(screen.getByLabelText('Repository')).toHaveValue(
    'none — this vault is a plain folder',
  )
  expect(screen.getByText(/Nothing syncs: this vault has no repository/)).toBeVisible()
  expect(screen.getByRole('checkbox', { name: 'Sync this vault' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'test remote' })).toBeDisabled()
})

it('reports a repository that has no remote as local only', async () => {
  await show(
    createMockClient({ gitState: { repo: true, remoteUrl: null, branch: 'main' } }),
  )
  expect(screen.getByLabelText('Repository')).toHaveValue('local only — no remote')
  expect(screen.getByRole('button', { name: 'test remote' })).toBeDisabled()
})

it('reports a specific result from the remote test', async () => {
  await show()
  await userEvent.click(screen.getByRole('button', { name: 'test remote' }))
  expect(await screen.findByText(/reached git@github.com/)).toHaveAttribute(
    'data-ok',
    'true',
  )
})

/* Pointing the config at a folder broodmother never made is not a setting, it is a break.
   The repository is read off the checkout, so it is not typed here either. */
it('will not let the vault folder or its repository be retyped', async () => {
  await show()
  expect(screen.getByLabelText('Vault path')).toHaveAttribute('readonly')
  expect(screen.getByLabelText('Repository')).toHaveAttribute('readonly')
  expect(screen.getByText(/make\s+another vault/)).toBeInTheDocument()
})

it('names the fields the backend had to reset', async () => {
  const client = createMockClient()
  const request = client.request.bind(client)
  client.request = (async (route: ApiRoute, body: never) => {
    const result = await request(route, body)
    return route === 'GET /api/config' ? { ...result, reset: ['git', 'worktrees'] } : result
  }) as typeof client.request
  await show(client)
  expect(screen.getByRole('alert')).toHaveTextContent('git, worktrees')
})

it('opens the palette on the colour the profile already is', async () => {
  await show(
    createMockClient({
      profiles: [
        {
          name: 'you',
          path: '/Users/you/.broodmother/profiles/you.json',
          color: '#fbbf24',
          gitAuthor: { name: 'You', email: 'you@example.com' },
          sshKeyPath: null,
          claudeCfgDir: null,
        },
      ],
    }),
  )
  const options = screen.getAllByRole('option').map((option) => option.textContent)
  expect(options).toEqual([
    'opal gold',
    'opal navy',
    'opal violet',
    'opal indigo',
    'opal cyan',
    'opal mint',
    'opal rose',
  ])
})

it('offers only the opal palette as presence colors', async () => {
  await show()
  const options = screen.getAllByRole('option').map((option) => option.textContent)
  expect(options).toEqual([
    'opal violet',
    'opal indigo',
    'opal cyan',
    'opal mint',
    'opal rose',
    'opal gold',
    'opal navy',
  ])
})

/* Credentials belong to the profile rather than to this machine's config, so they save on
   the profile's own button and land in its file. */
it('saves the credentials the profile works with', async () => {
  const client = await show()
  await userEvent.type(screen.getByLabelText('SSH key'), '~/.ssh/id_ed25519')
  await userEvent.type(screen.getByLabelText('Claude config directory'), '~/.claude-work')
  await userEvent.click(screen.getByRole('button', { name: 'save profile' }))

  const { active } = await client.request('GET /api/profiles', null)
  expect(active).toMatchObject({
    sshKeyPath: '~/.ssh/id_ed25519',
    claudeCfgDir: '~/.claude-work',
  })
})
