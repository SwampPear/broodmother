import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { Menu, type MenuSection } from './menu'

function show(sections: MenuSection[]) {
  render(
    <Menu label="Things" sections={sections}>
      open
    </Menu>,
  )
  return userEvent.click(screen.getByRole('button', { name: 'open' }))
}

const run = vi.fn()

it('groups rows under their heading and divides the sections', async () => {
  await show([
    { heading: 'People', actions: [{ id: 'a', label: 'Ada', onSelect: run }] },
    { actions: [{ id: 'new', label: 'Add one', onSelect: run }] },
  ])

  expect(screen.getByRole('menu')).toHaveAccessibleName('Things')
  expect(screen.getByText('People')).toBeInTheDocument()
  expect(screen.getByRole('separator')).toBeInTheDocument()
})

it('carries a description and a leading badge on the row', async () => {
  await show([
    {
      actions: [
        {
          id: 'a',
          label: 'Ada',
          description: 'ada@example.com',
          badge: { text: 'A', color: '#c084fc' },
          onSelect: run,
        },
      ],
    },
  ])

  expect(screen.getByRole('menuitem')).toHaveTextContent('ada@example.com')
  expect(screen.getByText('A')).toHaveStyle({ background: '#c084fc' })
})

/* A section where any row declares `selected` is a choice, not a list of actions — the
   rows become radios and the chosen one draws the check. */
it('marks a section that expresses a choice as radios', async () => {
  await show([
    {
      actions: [
        { id: 'a', label: 'Ada', selected: true, onSelect: run },
        { id: 'b', label: 'Grace', selected: false, onSelect: run },
      ],
    },
  ])

  const rows = screen.getAllByRole('menuitemradio')
  expect(rows[0]).toHaveAttribute('aria-checked', 'true')
  expect(rows[1]).toHaveAttribute('aria-checked', 'false')
})

it('runs the row you pick and closes behind it', async () => {
  const pick = vi.fn()
  await show([{ actions: [{ id: 'a', label: 'Ada', onSelect: pick }] }])

  await userEvent.click(screen.getByRole('menuitem', { name: 'Ada' }))

  expect(pick).toHaveBeenCalled()
  expect(screen.queryByRole('menu')).not.toBeInTheDocument()
})

it('steps the arrow keys over a disabled row', async () => {
  const pick = vi.fn()
  await show([
    {
      actions: [
        { id: 'a', label: 'Ada', disabled: true, onSelect: run },
        { id: 'b', label: 'Grace', onSelect: pick },
      ],
    },
  ])

  await userEvent.keyboard('{ArrowDown}{Enter}')

  expect(pick).toHaveBeenCalled()
})

it('marks a destructive row so it can be styled apart', async () => {
  await show([{ actions: [{ id: 'x', label: 'Delete', danger: true, onSelect: run }] }])
  expect(screen.getByRole('menuitem')).toHaveAttribute('data-danger', 'true')
})
