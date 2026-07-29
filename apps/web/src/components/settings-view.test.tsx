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

it('edits and saves the config', async () => {
  const client = await show()
  const branch = screen.getByLabelText('Branch')
  await userEvent.clear(branch)
  await userEvent.type(branch, 'trunk')
  await userEvent.click(screen.getByRole('button', { name: 'save' }))
  const { config } = await client.request('GET /api/config', null)
  expect(config.branch).toBe('trunk')
})

it('reports a specific result from the remote test', async () => {
  await show()
  await userEvent.click(screen.getByRole('button', { name: 'test remote' }))
  expect(await screen.findByText(/reached git@github.com/)).toHaveAttribute(
    'data-ok',
    'true',
  )
})

it('reports failure when there is no remote to test', async () => {
  await show(createMockClient({ config: { remoteUrl: null } as never }))
  await userEvent.click(screen.getByRole('button', { name: 'test remote' }))
  expect(await screen.findByText(/no remote configured/)).toHaveAttribute(
    'data-ok',
    'false',
  )
})

/* Pointing the config at a folder broodmother never cloned is not a setting, it is a break. */
it('will not let the vault folder or its remote be retyped', async () => {
  await show()
  expect(screen.getByLabelText('Vault path')).toHaveAttribute('readonly')
  expect(screen.getByLabelText('Remote URL')).toHaveAttribute('readonly')
  expect(screen.getByText(/make a\s+new project/)).toBeInTheDocument()
})

it('names the fields the backend had to reset', async () => {
  const client = createMockClient()
  const request = client.request.bind(client)
  client.request = (async (route: ApiRoute, body: never) => {
    const result = await request(route, body)
    return route === 'GET /api/config'
      ? { ...result, reset: ['branch', 'syncIdleMs'] }
      : result
  }) as typeof client.request
  await show(client)
  expect(screen.getByRole('alert')).toHaveTextContent('branch, syncIdleMs')
})

it('opens the palette on the colour the profile already is', async () => {
  await show(
    createMockClient({
      profiles: [
        {
          name: 'you',
          path: '/Users/you/.broodmother/profiles/you.json',
          presenceColor: '#fbbf24',
          gitAuthor: { name: 'You', email: 'you@example.com' },
          sshKeyPath: null,
          claudeConfigDir: null,
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
    claudeConfigDir: '~/.claude-work',
  })
})
