import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import type { VaultEntry } from '@mother/shared'
import { FileTree, filePaths } from './file-tree'

const entries: VaultEntry[] = [
  {
    kind: 'dir',
    path: 'ECSEQ-1',
    name: 'ECSEQ-1',
    children: [
      {
        kind: 'file',
        path: 'ECSEQ-1/Whitepaper.md',
        name: 'Whitepaper.md',
        size: 0,
        modifiedAt: 0,
      },
    ],
  },
  { kind: 'file', path: 'README.md', name: 'README.md', size: 0, modifiedAt: 0 },
  { kind: 'file', path: 'chip.png', name: 'chip.png', size: 0, modifiedAt: 0 },
]

function show() {
  const onOpen = vi.fn()
  const onCommand = vi.fn()
  render(
    <FileTree
      entries={entries}
      current="README.md"
      onOpen={onOpen}
      onCommand={onCommand}
    />,
  )
  screen.getByRole('tree').focus()
  return { onOpen, onCommand }
}

it('collects every file path', () => {
  expect(filePaths(entries)).toEqual(['ECSEQ-1/Whitepaper.md', 'README.md', 'chip.png'])
})

it('marks the open document', () => {
  show()
  expect(screen.getByRole('treeitem', { name: 'README.md' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
})

it('titles files by basename and tags every extension but markdown', () => {
  show()
  const note = screen.getByRole('treeitem', { name: 'README.md' })
  expect(within(note).getByText('README')).toBeInTheDocument()
  expect(within(note).queryByText('md')).not.toBeInTheDocument()
  expect(
    within(screen.getByRole('treeitem', { name: 'chip.png' })).getByText('png'),
  ).toBeInTheDocument()
})

it('expands a folder and opens a note with the keyboard alone', async () => {
  const { onOpen } = show()
  expect(
    screen.queryByRole('treeitem', { name: 'Whitepaper.md' }),
  ).not.toBeInTheDocument()
  await userEvent.keyboard('{ArrowRight}')
  expect(screen.getByRole('treeitem', { name: 'Whitepaper.md' })).toBeInTheDocument()
  await userEvent.keyboard('{ArrowDown}{Enter}')
  expect(onOpen).toHaveBeenCalledWith('ECSEQ-1/Whitepaper.md')
})

it('collapses a folder with the left arrow', async () => {
  show()
  await userEvent.keyboard('{ArrowRight}{ArrowLeft}')
  expect(
    screen.queryByRole('treeitem', { name: 'Whitepaper.md' }),
  ).not.toBeInTheDocument()
})

it('raises create, move and delete for the focused entry', async () => {
  const { onCommand } = show()
  await userEvent.keyboard('{ArrowDown}n')
  expect(onCommand).toHaveBeenCalledWith('create', 'README.md')
  await userEvent.keyboard('r')
  expect(onCommand).toHaveBeenCalledWith('move', 'README.md')
  await userEvent.keyboard('d')
  expect(onCommand).toHaveBeenCalledWith('delete', 'README.md')
})
