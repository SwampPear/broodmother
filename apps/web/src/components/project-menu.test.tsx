import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import type { Profile, Project } from '@mother/shared'
import { ProjectMenu } from './project-menu'

const projects: Project[] = [
  { name: 'Work', path: '/Users/you/.mother/Work', profile: 'michael' },
  { name: 'Personal', path: '/Users/you/.mother/Personal', profile: null },
]

const profiles: Profile[] = [
  {
    name: 'michael',
    path: '/Users/you/.mother/profiles/michael.json',
    presenceColor: '#c084fc',
    gitAuthor: { name: 'Michael Vaden', email: 'mv@proprium.bio' },
    sshKeyPath: '~/.ssh/id_work',
    claudeConfigDir: null,
  },
  {
    name: 'mjv',
    path: '/Users/you/.mother/profiles/mjv.json',
    presenceColor: '#34d399',
    gitAuthor: { name: 'Michael', email: 'michaelvaden.mjv@gmail.com' },
    sshKeyPath: null,
    claudeConfigDir: null,
  },
]

function show(activeName = 'Work') {
  const onSelect = vi.fn()
  const onAdd = vi.fn()
  const onDelete = vi.fn()
  const onSelectProfile = vi.fn()
  const onAddProfile = vi.fn()
  const onSettings = vi.fn()
  render(
    <ProjectMenu
      projects={projects}
      activeName={activeName}
      profiles={profiles}
      activeProfile="michael"
      onSelect={onSelect}
      onAdd={onAdd}
      onDelete={onDelete}
      onSelectProfile={onSelectProfile}
      onAddProfile={onAddProfile}
      onSettings={onSettings}
    />,
  )
  return { onSelect, onAdd, onDelete, onSelectProfile, onAddProfile, onSettings }
}

const open = () => userEvent.click(screen.getByRole('button', { name: /Work|Personal/ }))

it('names the project you are on', () => {
  show()
  expect(screen.getByRole('button')).toHaveTextContent('Work')
  expect(screen.queryByRole('menu')).not.toBeInTheDocument()
})

it('lists every project with the profile it works as', async () => {
  show()
  await open()
  const rows = screen.getAllByRole('menuitemradio')
  expect(rows[0]).toHaveTextContent('michael')
  expect(rows[1]).toHaveTextContent('no profile yet')
  expect(rows[0]).toHaveAttribute('aria-checked', 'true')
})

it('switches on pick and closes', async () => {
  const { onSelect } = show()
  await open()
  await userEvent.click(screen.getByRole('menuitemradio', { name: /Personal/ }))
  await waitFor(() => expect(onSelect).toHaveBeenCalledWith('Personal'))
  expect(screen.queryByRole('menu')).not.toBeInTheDocument()
})

it('does not re-apply the project already active', async () => {
  const { onSelect } = show()
  await open()
  await userEvent.click(screen.getByRole('menuitemradio', { name: /^Work/ }))
  expect(onSelect).not.toHaveBeenCalled()
})

/* Who you are is picked in the same surface as where you are, because it is the same
   question asked twice. */
it('picks the profile the project works as, without leaving the menu', async () => {
  const { onSelectProfile } = show()
  await open()

  await userEvent.click(screen.getByRole('menuitemradio', { name: /mjv/ }))

  await waitFor(() => expect(onSelectProfile).toHaveBeenCalledWith('mjv'))
})

it('does not re-apply the profile already in use', async () => {
  const { onSelectProfile } = show()
  await open()
  await userEvent.click(screen.getByRole('menuitemradio', { name: /mv@proprium\.bio/ }))
  expect(onSelectProfile).not.toHaveBeenCalled()
})

it('opens the new-profile flow from its own row', async () => {
  const { onAddProfile } = show()
  await open()
  await userEvent.click(screen.getByRole('menuitem', { name: /New profile/ }))
  expect(onAddProfile).toHaveBeenCalled()
})

it('opens the add-project flow from its own row', async () => {
  const { onAdd } = show()
  await open()
  await userEvent.click(screen.getByRole('menuitem', { name: /Add a project/ }))
  expect(onAdd).toHaveBeenCalled()
})

it('reaches settings without leaving the menu to find it', async () => {
  const { onSettings } = show()
  await open()
  await userEvent.click(screen.getByRole('menuitem', { name: 'Settings' }))
  expect(onSettings).toHaveBeenCalled()
})

/* A second click is the only gesture a row in a dropdown has left, and switching project
   is not what you meant by it. */
it('drills into a project on a double click instead of switching to it', async () => {
  const { onSelect } = show()
  await open()

  await userEvent.dblClick(screen.getByRole('menuitemradio', { name: /Personal/ }))

  expect(await screen.findByRole('menuitem', { name: /Delete project/ })).toBeVisible()
  await waitFor(() => expect(onSelect).not.toHaveBeenCalled())
})

it('deletes only after the folder it is about to remove has been named', async () => {
  const { onDelete } = show()
  await open()
  await userEvent.dblClick(screen.getByRole('menuitemradio', { name: /Personal/ }))
  await userEvent.click(screen.getByRole('menuitem', { name: /Delete project/ }))

  const dialog = await screen.findByRole('dialog', { name: 'Delete Personal?' })
  expect(dialog).toHaveTextContent('/Users/you/.mother/Personal')
  expect(onDelete).not.toHaveBeenCalled()

  await userEvent.click(screen.getByRole('button', { name: 'delete project' }))
  expect(onDelete).toHaveBeenCalledWith('Personal')
})

it('leaves the project alone when the confirmation is cancelled', async () => {
  const { onDelete } = show()
  await open()
  await userEvent.dblClick(screen.getByRole('menuitemradio', { name: /Personal/ }))
  await userEvent.click(screen.getByRole('menuitem', { name: /Delete project/ }))
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

  await waitFor(() => expect(onSelect).toHaveBeenCalledWith('Personal'))
})

it('wraps past the last row back onto the first', async () => {
  const { onAdd, onSettings } = show()
  await open()

  await userEvent.keyboard('{ArrowUp}{Enter}')

  expect(onSettings).toHaveBeenCalled()
  expect(onAdd).not.toHaveBeenCalled()
})
