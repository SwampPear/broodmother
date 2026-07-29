import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import type { Profile } from '../profiles'
import { ProfileMenu } from './profile-menu'

const profiles: Profile[] = [
  {
    id: 'work',
    name: 'Work',
    vaultPath: '/vaults/work',
    remoteUrl: 'git@github.com:Proprium-Bioscience/proprium-docs.git',
    branch: 'main',
    displayName: 'MV',
    presenceColor: '#c084fc',
    gitAuthor: { name: 'Michael Vaden', email: 'mv@proprium.bio' },
  },
  {
    id: 'personal',
    name: 'Personal',
    vaultPath: '/vaults/personal',
    remoteUrl: null,
    branch: 'main',
    displayName: 'mjv',
    presenceColor: '#34d399',
    gitAuthor: { name: 'Michael', email: 'michaelvaden.mjv@gmail.com' },
  },
]

function show(activeId = 'work') {
  const onSelect = vi.fn()
  const onManage = vi.fn()
  render(
    <ProfileMenu
      profiles={profiles}
      activeId={activeId}
      onSelect={onSelect}
      onManage={onManage}
    />,
  )
  return { onSelect, onManage }
}

it('names the profile you are on', () => {
  show()
  expect(screen.getByRole('button')).toHaveTextContent('Work')
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
})

it('lists every profile with the identity it scopes', async () => {
  show()
  await userEvent.click(screen.getByRole('button'))
  const options = screen.getAllByRole('option')
  expect(options[0]).toHaveTextContent('mv@proprium.bio')
  expect(options[1]).toHaveTextContent('michaelvaden.mjv@gmail.com')
  expect(options[0]).toHaveAttribute('aria-selected', 'true')
})

it('switches on pick and closes', async () => {
  const { onSelect } = show()
  await userEvent.click(screen.getByRole('button'))
  await userEvent.click(screen.getByRole('option', { name: /Personal/ }))
  expect(onSelect).toHaveBeenCalledWith('personal')
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
})

it('does not re-apply the profile already active', async () => {
  const { onSelect } = show()
  await userEvent.click(screen.getByRole('button'))
  await userEvent.click(screen.getByRole('option', { name: /Work/ }))
  expect(onSelect).not.toHaveBeenCalled()
})

it('sends you to settings to add one', async () => {
  const { onManage } = show()
  await userEvent.click(screen.getByRole('button'))
  await userEvent.click(screen.getByText('Add a profile…'))
  expect(onManage).toHaveBeenCalled()
})

it('closes on escape', async () => {
  show()
  await userEvent.click(screen.getByRole('button'))
  await userEvent.keyboard('{Escape}')
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
})
