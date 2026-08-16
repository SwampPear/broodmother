import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { VaultSummary } from '@broodmother/shared'
import { VaultMenu } from './menu'

const vaults: VaultSummary[] = [
  { name: 'Work', path: '/Users/you/.broodmother/ada/Work', profile: 'ada' },
  { name: 'Personal', path: '/Users/you/.broodmother/ada/Personal', profile: 'ada' },
]

function show(
  activePath = '/Users/you/.broodmother/ada/Work',
  activeProject: string | null = null,
) {
  const onSelect = vi.fn()
  const onAdd = vi.fn()
  const onDelete = vi.fn()
  const onCreateProject = vi.fn()
  const onSettings = vi.fn()
  // Open is the shell's to hold, because ⌘K opens this menu too.
  function Harness() {
    const [open, setOpen] = useState(false)
    return (
      <VaultMenu
        vaults={vaults}
        activePath={activePath}
        activeProject={activeProject}
        open={open}
        onOpenChange={setOpen}
        onSelect={onSelect}
        onAdd={onAdd}
        onDelete={onDelete}
        onCreateProject={onCreateProject}
        onSettings={onSettings}
      />
    )
  }
  render(<Harness />)
  return { onSelect, onAdd, onDelete, onCreateProject, onSettings }
}

const open = () => userEvent.click(screen.getByRole('button', { name: /Work|Personal/ }))

const rightClick = (name: RegExp) =>
  userEvent.pointer({
    target: screen.getByRole('menuitemradio', { name }),
    keys: '[MouseRight]',
  })

it('names the vault you are in', () => {
  show()
  expect(screen.getByRole('button')).toHaveTextContent('Work')
  expect(screen.queryByRole('menu')).not.toBeInTheDocument()
})

it('lists the vaults the profile has, with the open one checked', async () => {
  show()
  await open()
  const rows = screen.getAllByRole('menuitemradio')
  expect(rows[0]).toHaveTextContent('Work')
  expect(rows[1]).toHaveTextContent('Personal')
  expect(rows[0]).toHaveAttribute('aria-checked', 'true')
})

it('switches on pick, by path rather than by name, and closes', async () => {
  const { onSelect } = show()
  await open()
  await userEvent.click(screen.getByRole('menuitemradio', { name: /Personal/ }))
  await waitFor(() =>
    expect(onSelect).toHaveBeenCalledWith('/Users/you/.broodmother/ada/Personal'),
  )
  expect(screen.queryByRole('menu')).not.toBeInTheDocument()
})

it('does not re-open the vault already active', async () => {
  const { onSelect } = show()
  await open()
  await userEvent.click(screen.getByRole('menuitemradio', { name: /^Work/ }))
  expect(onSelect).not.toHaveBeenCalled()
})

/* Where you are working is one question, so the project is picked in the same list as the
   vault it belongs to — not from a control of its own. Who you are is the sidebar's foot. */
it('names the open project beside the vault, so neither has to be opened to read', () => {
  show('/Users/you/.broodmother/ada/Work', 'api')
  const anchor = screen.getByRole('button')
  expect(anchor).toHaveTextContent('Work')
  expect(anchor).toHaveTextContent('api')
})

it('opens the link-a-project flow from its own row', async () => {
  const { onCreateProject } = show()
  await open()
  await userEvent.click(screen.getByRole('menuitem', { name: /New project/ }))
  expect(onCreateProject).toHaveBeenCalled()
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

/* A second click is the only gesture a row in a dropdown has left, and switching vault
   is not what you meant by it. */
it('drills into a vault on a double click instead of opening it', async () => {
  const { onSelect } = show()
  await open()

  await userEvent.dblClick(screen.getByRole('menuitemradio', { name: /Personal/ }))

  expect(await screen.findByRole('menuitem', { name: /Delete vault/ })).toBeVisible()
  await waitFor(() => expect(onSelect).not.toHaveBeenCalled())
})

/* The gesture people reach for on a row they want to do something to. The double click
   stays for whoever has no right button under their thumb. */
it('drills into a vault on a right click, without opening it', async () => {
  const { onSelect } = show()
  await open()

  await rightClick(/Personal/)

  expect(await screen.findByRole('menuitem', { name: /Delete vault/ })).toBeVisible()
  await waitFor(() => expect(onSelect).not.toHaveBeenCalled())
})

it('deletes the vault named by the right click, not the one in use', async () => {
  const { onDelete } = show()
  await open()
  await rightClick(/Personal/)
  await userEvent.click(screen.getByRole('menuitem', { name: /Delete vault/ }))

  expect(await screen.findByRole('dialog', { name: 'Delete Personal?' })).toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: 'delete vault' }))

  expect(onDelete).toHaveBeenCalledWith('Personal')
})

it('deletes only after the folder it is about to remove has been named', async () => {
  const { onDelete } = show()
  await open()
  await userEvent.dblClick(screen.getByRole('menuitemradio', { name: /Personal/ }))
  await userEvent.click(screen.getByRole('menuitem', { name: /Delete vault/ }))

  const dialog = await screen.findByRole('dialog', { name: 'Delete Personal?' })
  expect(dialog).toHaveTextContent('/Users/you/.broodmother/ada/Personal')
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
    expect(onSelect).toHaveBeenCalledWith('/Users/you/.broodmother/ada/Personal'),
  )
})

it('wraps past the last row back onto the first', async () => {
  const { onAdd, onSettings } = show()
  await open()

  await userEvent.keyboard('{ArrowUp}{Enter}')

  expect(onSettings).toHaveBeenCalled()
  expect(onAdd).not.toHaveBeenCalled()
})
