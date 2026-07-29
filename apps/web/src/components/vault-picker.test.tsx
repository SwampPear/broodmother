import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { createMockClient, type MockClient } from '../api/mock'
import { AppProvider } from '../state'
import { VaultPicker } from './vault-picker'

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

it('creates a vault with the git remote it was given', async () => {
  const client = await show()

  await userEvent.type(screen.getByLabelText('Name'), 'fresh')
  await userEvent.type(
    screen.getByLabelText('Git remote'),
    'git@github.com:you/fresh.git',
  )
  await userEvent.click(screen.getByRole('button', { name: 'create vault' }))

  const { vaults } = await client.request('GET /api/vaults', null)
  expect(vaults.map((vault) => vault.name)).toContain('fresh')
  const { config } = await client.request('GET /api/config', null)
  expect(config.remoteUrl).toBe('git@github.com:you/fresh.git')
  expect(config.syncEnabled).toBe(true)
})

it('will not submit without a remote, because a vault is always git-backed', async () => {
  await show()

  await userEvent.type(screen.getByLabelText('Name'), 'fresh')

  expect(screen.getByRole('button', { name: 'create vault' })).toBeDisabled()
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
