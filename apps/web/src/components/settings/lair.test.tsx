import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { createMockClient } from '../../api/mock'
import { AppProvider } from '../../state'
import { SettingsView } from './core'

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
  await userEvent.click(screen.getByRole('tab', { name: 'Server' }))
  return client
}

it('takes a URL and a key, and never echoes the key back', async () => {
  await show()
  await userEvent.type(screen.getByLabelText('URL'), 'https://lair.example.com')
  const key = screen.getByLabelText('Access key')
  await userEvent.type(key, 'lk_secret')
  await userEvent.click(screen.getByRole('button', { name: 'save' }))

  // Stored: the check comes alive, and the field empties — the key is kept, not shown.
  expect(await screen.findByRole('button', { name: 'check connection' })).toBeEnabled()
  expect(key).toHaveValue('')
  expect((key as HTMLInputElement).placeholder).toContain('a key is stored')
})

it('cannot check before a key is stored', async () => {
  await show()
  expect(screen.getByRole('button', { name: 'check connection' })).toBeDisabled()
})

it('says which of the three states the check found', async () => {
  await show(
    createMockClient({
      lair: 'https://lair.example.com',
      lairCheck: { state: 'refused', message: 'the lair refused the key.' },
    }),
  )
  await userEvent.click(screen.getByRole('button', { name: 'check connection' }))
  expect(await screen.findByText('refused')).toBeInTheDocument()
  expect(screen.getByText(/refused the key/)).toBeInTheDocument()
})

it('forgets the lair on request', async () => {
  await show(createMockClient({ lair: 'https://lair.example.com' }))
  await userEvent.click(screen.getByRole('button', { name: 'forget this lair' }))
  expect(await screen.findByRole('button', { name: 'check connection' })).toBeDisabled()
})
