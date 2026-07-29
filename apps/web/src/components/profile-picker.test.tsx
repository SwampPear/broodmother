import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import type { Profile } from '@mother/shared'
import { ProfilePicker } from './profile-picker'

const existing: Profile[] = [
  {
    name: 'Work',
    path: '/Users/you/.mother/profiles/Work.json',
    presenceColor: '#c084fc',
    gitAuthor: { name: 'Michael Vaden', email: 'mv@proprium.bio' },
    sshKeyPath: null,
    claudeConfigDir: null,
  },
]

function show(profiles = existing) {
  const onCreate = vi.fn()
  const onSelect = vi.fn()
  const onClose = vi.fn()
  render(
    <ProfilePicker
      existing={profiles}
      current="Work"
      onCreate={onCreate}
      onSelect={onSelect}
      onClose={onClose}
    />,
  )
  return { onCreate, onSelect, onClose }
}

const fill = async (name: string, email: string) => {
  await userEvent.type(screen.getByLabelText('Profile name'), name)
  await userEvent.type(screen.getByLabelText('Git author email'), email)
}

/* Profiles are shared by every project, so the one you already made is the likely answer
   and picking it is one click, not a form. */
it('lists the profiles already on this machine and picks one', async () => {
  const { onSelect, onClose } = show()

  await userEvent.click(screen.getByRole('button', { name: /Work/ }))

  expect(onSelect).toHaveBeenCalledWith('Work')
  expect(onClose).toHaveBeenCalled()
})

it('will not submit until it has a name and an email', async () => {
  show()
  const add = screen.getByRole('button', { name: 'add profile' })
  expect(add).toBeDisabled()

  await fill('Personal', 'mjv@example.com')

  expect(add).toBeEnabled()
})

it('creates a profile from the name and identity you typed', async () => {
  const { onCreate } = show()
  await fill('Personal', 'mjv@example.com')

  await userEvent.click(screen.getByRole('button', { name: 'add profile' }))

  expect(onCreate).toHaveBeenCalledWith(
    expect.objectContaining({
      name: 'Personal',
      gitAuthor: { name: 'Personal', email: 'mjv@example.com' },
      sshKeyPath: null,
      claudeConfigDir: null,
    }),
  )
})

/* The credentials are what makes a profile more than a name on a commit. */
it('carries the credentials it was given, expanded by the server not here', async () => {
  const { onCreate } = show()
  await fill('Personal', 'mjv@example.com')
  await userEvent.type(screen.getByLabelText('SSH key'), '~/.ssh/id_personal')
  await userEvent.type(screen.getByLabelText('Claude config directory'), '~/.claude-mjv')

  await userEvent.click(screen.getByRole('button', { name: 'add profile' }))

  expect(onCreate.mock.calls[0][0]).toMatchObject({
    sshKeyPath: '~/.ssh/id_personal',
    claudeConfigDir: '~/.claude-mjv',
  })
})

/* The name becomes a file in the profiles folder, so it has to survive being one. */
it('refuses a name that would not be a plain file', async () => {
  const { onCreate } = show()
  await fill('../escape', 'mjv@example.com')

  await userEvent.click(screen.getByRole('button', { name: 'add profile' }))

  expect(screen.getByRole('alert')).toHaveTextContent('cannot be a path')
  expect(onCreate).not.toHaveBeenCalled()
})

it('takes the git author name over the profile name when one is given', async () => {
  const { onCreate } = show()
  await fill('Personal', 'mjv@example.com')
  await userEvent.type(screen.getByLabelText('Git author name'), 'Michael')

  await userEvent.click(screen.getByRole('button', { name: 'add profile' }))

  expect(onCreate.mock.calls[0][0].gitAuthor.name).toBe('Michael')
})

/* Two profiles with one name are indistinguishable in the menu that lists them. */
it('refuses a name already in use', async () => {
  const { onCreate } = show()
  await fill('work', 'other@example.com')

  await userEvent.click(screen.getByRole('button', { name: 'add profile' }))

  expect(screen.getByRole('alert')).toHaveTextContent('already exists')
  expect(onCreate).not.toHaveBeenCalled()
})

it('refuses an email that is not one', async () => {
  const { onCreate } = show()
  await fill('Personal', 'nope')

  await userEvent.click(screen.getByRole('button', { name: 'add profile' }))

  expect(screen.getByRole('alert')).toHaveTextContent('needs an @')
  expect(onCreate).not.toHaveBeenCalled()
})

/* Presence colours are how you tell each other apart in a live session; handing out one
   already taken defeats the point. */
it('offers a colour nobody is using yet', async () => {
  const { onCreate } = show()
  await fill('Personal', 'mjv@example.com')

  await userEvent.click(screen.getByRole('button', { name: 'add profile' }))

  expect(onCreate.mock.calls[0][0].presenceColor).not.toBe('#c084fc')
})

/* And leads with it, so the swatch that is already selected is the one on the left. */
it('starts the palette at the colour it is offering', () => {
  show()
  const swatches = screen
    .getAllByRole('radio')
    .map((radio) => radio.closest('label')?.title)

  expect(swatches[0]).toBe('opal indigo')
  expect(screen.getByRole('radio', { checked: true }).closest('label')?.title).toBe(
    'opal indigo',
  )
})

/* First run is this same modal with nobody to pick from and no way out. */
it('is the welcome when there is nobody on the machine yet', () => {
  const onCreate = vi.fn()
  render(<ProfilePicker existing={[]} onCreate={onCreate} onSelect={vi.fn()} />)

  expect(screen.getByRole('dialog')).toHaveAccessibleName('Welcome to mother')
  expect(screen.queryByRole('button', { name: 'cancel' })).not.toBeInTheDocument()
})

it('cancels without creating anything', async () => {
  const { onCreate, onClose } = show()
  await userEvent.click(screen.getByRole('button', { name: 'cancel' }))
  expect(onClose).toHaveBeenCalled()
  expect(onCreate).not.toHaveBeenCalled()
})
