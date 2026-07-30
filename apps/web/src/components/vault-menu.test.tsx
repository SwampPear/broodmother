import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Profile, VaultSummary } from '@broodmother/shared'
import { VaultMenu } from './vault-menu'

const vaults: VaultSummary[] = [
  { name: 'Work', path: '/Users/you/.broodmother/Work', profile: 'ada' },
  { name: 'Personal', path: '/Users/you/.broodmother/Personal', profile: null },
]

const profiles: Profile[] = [
  {
    name: 'ada',
    path: '/Users/you/.broodmother/profiles/ada.json',
    color: '#c084fc',
    gitAuthor: { name: 'Ada Lovelace', email: 'ada@example.com' },
    sshKeyPath: '~/.ssh/id_work',
    claudeCfgDir: null,
  },
  {
    name: 'grace',
    path: '/Users/you/.broodmother/profiles/grace.json',
    color: '#34d399',
    gitAuthor: { name: 'Grace Hopper', email: 'grace@example.com' },
    sshKeyPath: null,
    claudeCfgDir: null,
  },
]

function show(activePath = '/Users/you/.broodmother/Work') {
  const onSelect = vi.fn()
  const onAdd = vi.fn()
  const onDelete = vi.fn()
  const onSelectProfile = vi.fn()
  const onAddProfile = vi.fn()
  const onSettings = vi.fn()
  render(
    <VaultMenu
      vaults={vaults}
      activePath={activePath}
      profiles={profiles}
      activeProfile="ada"
      onSelect={onSelect}
      onAdd={onAdd}
      onDelete={onDelete}
      onSelectProfile={onSelectProfile}
      onAddProfile={onAddProfile}
      onSettings={onSettings}
    />,
  )
  return {
    onSelect,
    onAdd,
    onDelete,
    onSelectProfile,
    onAddProfile,
    onSettings,
  }
}

const open = () => userEvent.click(screen.getByRole('button', { name: /Work|Personal/ }))

it('names the vault you are in', () => {
  show()
  expect(screen.getByRole('button')).toHaveTextContent('Work')
  expect(screen.queryByRole('menu')).not.toBeInTheDocument()
})

it('lists every vault with the profile it commits as', async () => {
  show()
  await open()
  const rows = screen.getAllByRole('menuitemradio')
  expect(rows[0]).toHaveTextContent('ada')
  expect(rows[1]).toHaveTextContent('no profile yet')
  expect(rows[0]).toHaveAttribute('aria-checked', 'true')
})

it('switches on pick, by path rather than by name, and closes', async () => {
  const { onSelect } = show()
  await open()
  await userEvent.click(screen.getByRole('menuitemradio', { name: /Personal/ }))
  await waitFor(() =>
    expect(onSelect).toHaveBeenCalledWith('/Users/you/.broodmother/Personal'),
  )
  expect(screen.queryByRole('menu')).not.toBeInTheDocument()
})

it('does not re-open the vault already active', async () => {
  const { onSelect } = show()
  await open()
  await userEvent.click(screen.getByRole('menuitemradio', { name: /^Work/ }))
  expect(onSelect).not.toHaveBeenCalled()
})

/* Who you are is picked in the same surface as where you are, because it is the same
   question asked twice. */
it('picks the profile the vault commits as, without leaving the menu', async () => {
  const { onSelectProfile } = show()
  await open()

  await userEvent.click(screen.getByRole('menuitemradio', { name: /grace/ }))

  await waitFor(() => expect(onSelectProfile).toHaveBeenCalledWith('grace'))
})

it('does not re-apply the profile already in use', async () => {
  const { onSelectProfile } = show()
  await open()
  await userEvent.click(screen.getByRole('menuitemradio', { name: /ada@example\.com/ }))
  expect(onSelectProfile).not.toHaveBeenCalled()
})

it('opens the new-profile flow from its own row', async () => {
  const { onAddProfile } = show()
  await open()
  await userEvent.click(screen.getByRole('menuitem', { name: /New profile/ }))
  expect(onAddProfile).toHaveBeenCalled()
})

it('opens the new-vault flow from its own row', async () => {
  const { onAdd } = show()
  await open()
  await userEvent.click(screen.getByRole('menuitem', { name: /New vault/ }))
  expect(onAdd).toHaveBeenCalled()
})

it('reaches settings without leaving the menu to find it', async () => {
  const { onSettings } = show()
  await open()
  await userEvent.click(screen.getByRole('menuitem', { name: 'Settings' }))
  expect(onSettings).toHaveBeenCalled()
})

/* A second click is the only gesture a row in a dropdown has left, and switching vault is
   not what you meant by it. */
it('drills into a vault on a double click instead of opening it', async () => {
  const { onSelect } = show()
  await open()

  await userEvent.dblClick(screen.getByRole('menuitemradio', { name: /Personal/ }))

  expect(await screen.findByRole('menuitem', { name: /Delete vault/ })).toBeVisible()
  await waitFor(() => expect(onSelect).not.toHaveBeenCalled())
})

it('deletes only after the folder it is about to remove has been named', async () => {
  const { onDelete } = show()
  await open()
  await userEvent.dblClick(screen.getByRole('menuitemradio', { name: /Personal/ }))
  await userEvent.click(screen.getByRole('menuitem', { name: /Delete vault/ }))

  const dialog = await screen.findByRole('dialog', { name: 'Delete Personal?' })
  expect(dialog).toHaveTextContent('/Users/you/.broodmother/Personal')
  expect(onDelete).not.toHaveBeenCalled()

  await userEvent.click(screen.getByRole('button', { name: 'delete vault' }))
  expect(onDelete).toHaveBeenCalledWith('Personal')
})

it('leaves the vault alone when the confirmation is cancelled', async () => {
  const { onDelete } = show()
  await open()
  await userEvent.dblClick(screen.getByRole('menuitemradio', { name: /Personal/ }))
  await userEvent.click(screen.getByRole('menuitem', { name: /Delete vault/ }))
  await userEvent.click(screen.getByRole('button', { name: 'cancel' }))

  expect(onDelete).not.toHaveBeenCalled()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

it('closes on escape', async () => {
  show()
  await open()
  await userEvent.keyboard('{Escape}')
  expect(screen.queryByRole('menu')).not.toBeInTheDocument()
})

it('moves through the list with the arrow keys and picks with enter', async () => {
  const { onSelect } = show()
  await open()

  await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}')

  await waitFor(() =>
    expect(onSelect).toHaveBeenCalledWith('/Users/you/.broodmother/Personal'),
  )
})

it('wraps past the last row back onto the first', async () => {
  const { onAdd, onSettings } = show()
  await open()

  await userEvent.keyboard('{ArrowUp}{Enter}')

  expect(onSettings).toHaveBeenCalled()
  expect(onAdd).not.toHaveBeenCalled()
})
