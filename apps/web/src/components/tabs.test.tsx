import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { TabStrip, docTab, type Tab } from './tabs'

const tabs: Tab[] = [
  docTab('Handbook/Overview.md'),
  { id: 'terminal:1', kind: 'terminal', shell: 'shell' },
]

function show(activeId: string | null = tabs[0]!.id) {
  const onPick = vi.fn()
  const onClose = vi.fn()
  const onNew = vi.fn()
  render(
    <TabStrip
      tabs={tabs}
      activeId={activeId}
      onPick={onPick}
      onClose={onClose}
      onNew={onNew}
    />,
  )
  return { onPick, onClose, onNew }
}

it('names a document tab by its basename, without the extension', () => {
  show()
  expect(screen.getByRole('tab', { name: /Overview/ })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  expect(screen.queryByText('Handbook/Overview.md')).not.toBeInTheDocument()
})

it('picks the tab that was clicked', async () => {
  const { onPick } = show()
  await userEvent.click(screen.getByRole('tab', { name: /terminal/ }))
  expect(onPick).toHaveBeenCalledWith(tabs[1])
})

/* The close button sits inside the tab, so the click that closes must not also select. */
it('closes without picking', async () => {
  const { onClose, onPick } = show()
  await userEvent.click(screen.getByRole('button', { name: 'Close Overview' }))
  expect(onClose).toHaveBeenCalledWith(tabs[0])
  expect(onPick).not.toHaveBeenCalled()
})

/* The plus is a menu, not a button that does one thing: a new tab is a note, a shell, or
   claude, and which one has to be said before anything opens. */
it.each([
  ['New note…', 'note'],
  ['Terminal', 'shell'],
  ['Claude Code', 'claude'],
])('opens %s from the plus', async (label, what) => {
  const { onNew } = show()
  await userEvent.click(screen.getByRole('button', { name: 'New tab' }))
  await userEvent.click(await screen.findByRole('menuitem', { name: new RegExp(label) }))
  expect(onNew).toHaveBeenCalledWith(what)
})

it('marks nothing active when the route is showing something no tab stands for', () => {
  show(null)
  for (const tab of screen.getAllByRole('tab'))
    expect(tab).toHaveAttribute('aria-selected', 'false')
})
