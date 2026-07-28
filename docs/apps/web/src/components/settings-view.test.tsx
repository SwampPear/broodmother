import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import type { ApiRoute } from '@docs/shared'
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
  await show()
  const remote = screen.getByLabelText('Remote URL')
  await userEvent.clear(remote)
  await userEvent.click(screen.getByRole('button', { name: 'test remote' }))
  expect(await screen.findByText(/no remote configured/)).toHaveAttribute(
    'data-ok',
    'false',
  )
})

it('reports a specific result from the relay test', async () => {
  await show()
  await userEvent.click(screen.getByRole('button', { name: 'test relay' }))
  expect(await screen.findByText(/relay answered at/)).toHaveAttribute('data-ok', 'true')
})

it('names the fields the backend had to reset', async () => {
  const client = createMockClient()
  const request = client.request.bind(client)
  client.request = (async (route: ApiRoute, body: never) => {
    const result = await request(route, body)
    return route === 'GET /api/config'
      ? { ...result, reset: ['branch', 'relayUrl'] }
      : result
  }) as typeof client.request
  await show(client)
  expect(screen.getByRole('alert')).toHaveTextContent('branch, relayUrl')
})

it('offers only the opal palette as presence colors', async () => {
  await show()
  const options = screen.getAllByRole('option').map((option) => option.textContent)
  expect(options).toEqual([
    'opal violet',
    'opal indigo',
    'opal cyan',
    'opal mint',
    'opal gold',
    'opal rose',
  ])
})
