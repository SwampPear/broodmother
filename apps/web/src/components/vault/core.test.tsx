import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { createMockClient, type MockClient } from '../../api/mock'
import { AppProvider } from '../../state'
import { VaultPicker } from './core'

async function show(client: MockClient = createMockClient(), onClose?: () => void) {
  render(
    <AppProvider client={client}>
      <VaultPicker onClose={onClose} />
    </AppProvider>,
  )
  await screen.findByLabelText('Git remote')
  return client
}

it('lists every folder in the vault home as a vault', async () => {
  await show(
    createMockClient({
      home: '/Users/you/.broodmother',
      vaults: [
        { name: 'notes', path: '/Users/you/.broodmother/notes', profile: 'you' },
        { name: 'handbook', path: '/Users/you/.broodmother/handbook', profile: 'you' },
      ],
    }),
  )

  expect(screen.getByRole('button', { name: /notes/ })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /handbook/ })).toBeInTheDocument()
})

it('opens the vault that was clicked', async () => {
  const client = await show(
    createMockClient({
      vaults: [{ name: 'notes', path: '/Users/you/.broodmother/notes', profile: 'you' }],
    }),
  )

  await userEvent.click(screen.getByRole('button', { name: /notes/ }))

  const { config } = await client.request('GET /api/config', null)
  expect(config.vaultPath).toBe('/Users/you/.broodmother/notes')
})

it('creates a vault with the git remote it was given, and turns sync on', async () => {
  const client = await show()

  await userEvent.type(screen.getByLabelText('Name'), 'fresh')
  await userEvent.type(
    screen.getByLabelText('Git remote'),
    'git@github.com:you/fresh.git',
  )
  await userEvent.click(screen.getByRole('button', { name: 'create vault' }))

  const { vaults } = await client.request('GET /api/vaults', null)
  expect(vaults.map((vault) => vault.name)).toContain('fresh')
  const { state, settings } = await client.request('GET /api/git', null)
  expect(state).toMatchObject({ repo: true, remoteUrl: 'git@github.com:you/fresh.git' })
  expect(settings.enabled).toBe(true)
})

it('will not submit a syncing vault without a remote to sync to', async () => {
  await show()

  await userEvent.type(screen.getByLabelText('Name'), 'fresh')

  expect(screen.getByRole('button', { name: 'create vault' })).toBeDisabled()
})

it('creates a vault with no git, and asks for no remote to do it', async () => {
  const client = await show()

  await userEvent.type(screen.getByLabelText('Name'), 'plain')
  await userEvent.click(screen.getByRole('radio', { name: 'No git' }))

  // The remote and branch fields are gone: a plain folder has nowhere to put them.
  expect(screen.queryByLabelText('Git remote')).not.toBeInTheDocument()
  expect(screen.queryByLabelText('Branch')).not.toBeInTheDocument()

  const create = screen.getByRole('button', { name: 'create vault' })
  expect(create).toBeEnabled()
  await userEvent.click(create)

  const { vaults } = await client.request('GET /api/vaults', null)
  expect(vaults.map((vault) => vault.name)).toContain('plain')
  const { state, settings } = await client.request('GET /api/git', null)
  expect(state).toEqual({ repo: false, remoteUrl: null, branch: null })
  expect(settings.enabled).toBe(false)
})

it('creates a repository with no remote, keeping the branch but not the remote', async () => {
  const client = await show()

  await userEvent.type(screen.getByLabelText('Name'), 'solo')
  await userEvent.click(screen.getByRole('radio', { name: 'Git, no remote' }))

  expect(screen.queryByLabelText('Git remote')).not.toBeInTheDocument()
  expect(screen.getByLabelText('Branch')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'create vault' }))

  const { state, settings } = await client.request('GET /api/git', null)
  expect(state).toEqual({ repo: true, remoteUrl: null, branch: 'main' })
  // A repository with nowhere to push is not signed up for pushing.
  expect(settings.enabled).toBe(false)
})

it('closes after a vault is chosen', async () => {
  const onClose = vi.fn()
  await show(
    createMockClient({
      vaults: [{ name: 'notes', path: '/Users/you/.broodmother/notes', profile: 'you' }],
    }),
    onClose,
  )

  await userEvent.click(screen.getByRole('button', { name: /notes/ }))

  expect(onClose).toHaveBeenCalled()
})
