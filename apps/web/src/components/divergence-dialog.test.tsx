import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import type { DivergenceReport } from '@mother/shared'
import { DivergenceDialog } from './divergence-dialog'

const report: DivergenceReport = {
  room: 'ECSEQ-1/Whitepaper.md',
  path: 'ECSEQ-1/Whitepaper.md',
  local: 'my version',
  remote: 'the room version',
}

function show() {
  const onChoose = vi.fn()
  render(<DivergenceDialog report={report} onChoose={onChoose} />)
  return onChoose
}

it('shows both versions and says nothing is merged', () => {
  show()
  expect(screen.getByText('my version')).toBeInTheDocument()
  expect(screen.getByText('the room version')).toBeInTheDocument()
  expect(screen.getByText(/Nothing is merged/)).toBeInTheDocument()
})

it('spells out what adopting the room discards', async () => {
  const onChoose = show()
  const adopt = screen.getByRole('button', { name: /Adopt the room/ })
  expect(adopt).toHaveTextContent('overwrites ECSEQ-1/Whitepaper.md on disk')
  expect(adopt).toHaveTextContent('is lost')
  await userEvent.click(adopt)
  expect(onChoose).toHaveBeenCalledWith('adoptRoom')
})

it('spells out what keeping the local file discards', async () => {
  const onChoose = show()
  const keep = screen.getByRole('button', { name: /Keep my file/ })
  expect(keep).toHaveTextContent('leaves the session')
  expect(keep).toHaveTextContent('never reach this machine')
  await userEvent.click(keep)
  expect(onChoose).toHaveBeenCalledWith('keepLocal')
})
