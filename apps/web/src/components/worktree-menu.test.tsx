import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Worktree } from '@broodmother/shared'
import { WorktreeMenu } from './worktree-menu'

const worktrees: Worktree[] = [
  { name: 'local', path: '/v/Work/local', branch: 'main', primary: true },
  { name: 'fix-login', path: '/v/Work/fix-login', branch: 'fix-login', primary: false },
]

function show(active = 'local') {
  const onSelect = vi.fn()
  const onAdd = vi.fn()
  const onDelete = vi.fn()
  render(
    <WorktreeMenu
      worktrees={worktrees}
      active={active}
      onSelect={onSelect}
      onAdd={onAdd}
      onDelete={onDelete}
    />,
  )
  return { onSelect, onAdd, onDelete }
}

const open = () => userEvent.click(screen.getByRole('button'))

/* The name on the control is the branch, because that is what you are working on — the
   folder is where it happens to live. */
it('wears the branch of the checkout you are in', () => {
  show()
  expect(screen.getByRole('button')).toHaveTextContent('main')
})

it('wears the other branch once you are on it', () => {
  show('fix-login')
  expect(screen.getByRole('button')).toHaveTextContent('fix-login')
})

it('lists every checkout with the branch it is on', async () => {
  show()
  await open()
  const rows = screen.getAllByRole('menuitemradio')
  expect(rows).toHaveLength(2)
  expect(rows[0]).toHaveTextContent('main')
  expect(rows[0]).toHaveAttribute('aria-checked', 'true')
})

it('switches on pick', async () => {
  const { onSelect } = show()
  await open()
  await userEvent.click(screen.getByRole('menuitemradio', { name: /fix-login/ }))
  await waitFor(() => expect(onSelect).toHaveBeenCalledWith('fix-login'))
})

it('does not re-open the one already active', async () => {
  const { onSelect } = show()
  await open()
  await userEvent.click(screen.getByRole('menuitemradio', { name: /local/ }))
  expect(onSelect).not.toHaveBeenCalled()
})

it('opens the new-worktree flow from its own row', async () => {
  const { onAdd } = show()
  await open()
  await userEvent.click(screen.getByRole('menuitem', { name: /New worktree/ }))
  expect(onAdd).toHaveBeenCalled()
})

describe('removing one', () => {
  it('names the folder before it goes', async () => {
    const { onDelete } = show()
    await open()
    await userEvent.dblClick(screen.getByRole('menuitemradio', { name: /fix-login/ }))

    const dialog = await screen.findByRole('dialog', { name: 'Remove fix-login?' })
    expect(dialog).toHaveTextContent('/v/Work/fix-login')
    expect(onDelete).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'remove worktree' }))
    expect(onDelete).toHaveBeenCalledWith('fix-login')
  })

  it('leaves it alone when the confirmation is cancelled', async () => {
    const { onDelete } = show()
    await open()
    await userEvent.dblClick(screen.getByRole('menuitemradio', { name: /fix-login/ }))
    await userEvent.click(await screen.findByRole('button', { name: 'cancel' }))
    expect(onDelete).not.toHaveBeenCalled()
  })

  /* The clone is the repository every other worktree points into. */
  it('offers nothing to remove on the clone', async () => {
    show()
    await open()
    await userEvent.dblClick(screen.getByRole('menuitemradio', { name: /local/ }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
