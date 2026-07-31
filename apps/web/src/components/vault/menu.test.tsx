import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { Profile, ProjectSummary, VaultSummary } from '@broodmother/shared'
import { VaultMenu } from './menu'

const vaults: VaultSummary[] = [
  { name: 'Work', path: '/Users/you/.broodmother/Work', profile: 'ada' },
  { name: 'Personal', path: '/Users/you/.broodmother/Personal', profile: undefined },
]

const projects: ProjectSummary[] = [
  { name: 'api', repo: '/Users/you/dev/api', missing: false },
  { name: 'web', repo: '/Users/you/dev/web', missing: false },
]

const profiles: Profile[] = [
  {
    name: 'ada',
    path: '/Users/you/.broodmother/profiles/ada.json',
    color: '#c084fc',
    gitAuthor: { name: 'Ada Lovelace', email: 'ada@example.com' },
    sshKeyPath: '~/.ssh/id_work',
    claudeCfgDir: null,
    soul: null,
    github: null,
  },
  {
    name: 'grace',
    path: '/Users/you/.broodmother/profiles/grace.json',
    color: '#34d399',
    gitAuthor: { name: 'Grace Hopper', email: 'grace@example.com' },
    sshKeyPath: null,
    claudeCfgDir: null,
    soul: null,
    github: null,
  },
]

function show(
  activePath = '/Users/you/.broodmother/Work',
  activeProject: string | null = null,
) {
  const onSelect = vi.fn()
  const onAdd = vi.fn()
  const onDelete = vi.fn()
  const onSelectProject = vi.fn()
  const onCreateProject = vi.fn()
  const onUnlinkProject = vi.fn()
  const onSelectProfile = vi.fn()
  const onAddProfile = vi.fn()
  const onSettings = vi.fn()
  // Open is the shell's to hold, because ⌘K opens this menu too.
  function Harness() {
    const [open, setOpen] = useState(false)
    return (
      <VaultMenu
        vaults={vaults}
        activePath={activePath}
        projects={projects}
        activeProject={activeProject}
        profiles={profiles}
        activeProfile="ada"
        open={open}
        onOpenChange={setOpen}
        onSelect={onSelect}
        onAdd={onAdd}
        onDelete={onDelete}
        onSelectProject={onSelectProject}
        onCreateProject={onCreateProject}
        onUnlinkProject={onUnlinkProject}
        onSelectProfile={onSelectProfile}
        onAddProfile={onAddProfile}
        onSettings={onSettings}
      />
    )
  }
  render(<Harness />)
  return {
    onSelect,
    onAdd,
    onDelete,
    onSelectProject,
    onCreateProject,
    onUnlinkProject,
    onSelectProfile,
    onAddProfile,
    onSettings,
  }
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

/* Where you are working is one question, so the project is picked in the same list as the
   vault it belongs to and the profile you do it as — not from a control of its own. */
it('picks the project in the same surface as the vault and the profile', async () => {
  const { onSelectProject } = show()
  await open()

  const headings = screen.getAllByRole('group').length
  expect(headings).toBeGreaterThanOrEqual(3)
  await userEvent.click(screen.getByRole('menuitemradio', { name: /api/ }))

  await waitFor(() => expect(onSelectProject).toHaveBeenCalledWith('api'))
})

it('names the open project beside the vault, so neither has to be opened to read', () => {
  show('/Users/you/.broodmother/Work', 'api')
  const anchor = screen.getByRole('button')
  expect(anchor).toHaveTextContent('Work')
  expect(anchor).toHaveTextContent('api')
})

/* Closing the project is a row like any other: it is one of the things it can be. */
it('closes the project from the row that says no project', async () => {
  const { onSelectProject } = show('/Users/you/.broodmother/Work', 'api')
  await open()

  await userEvent.click(screen.getByRole('menuitemradio', { name: /No project/ }))

  await waitFor(() => expect(onSelectProject).toHaveBeenCalledWith(null))
})

it('does not re-open the project already open', async () => {
  const { onSelectProject } = show('/Users/you/.broodmother/Work', 'api')
  await open()
  await userEvent.click(screen.getByRole('menuitemradio', { name: /api/ }))
  expect(onSelectProject).not.toHaveBeenCalled()
})

/* The same second gesture the vault rows have, and it unlinks rather than deletes: the
   repository is yours. */
it('drills into a project and unlinks it after saying what stays', async () => {
  const { onUnlinkProject, onSelectProject } = show()
  await open()

  await rightClick(/api/)
  await userEvent.click(await screen.findByRole('menuitem', { name: /Unlink project/ }))

  const dialog = await screen.findByRole('dialog', { name: 'Unlink api?' })
  expect(dialog).toHaveTextContent('/Users/you/dev/api')
  expect(dialog).toHaveTextContent(/stays exactly where it is/)
  await userEvent.click(screen.getByRole('button', { name: 'unlink project' }))

  expect(onUnlinkProject).toHaveBeenCalledWith('api')
  await waitFor(() => expect(onSelectProject).not.toHaveBeenCalled())
})

it('opens the link-a-project flow from its own row', async () => {
  const { onCreateProject } = show()
  await open()
  await userEvent.click(screen.getByRole('menuitem', { name: /New project/ }))
  expect(onCreateProject).toHaveBeenCalled()
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
