import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { useAttempt } from './attempt'

function Form({ ask }: { ask: () => Promise<string | null> }) {
  const attempt = useAttempt()
  return (
    <>
      <button onClick={() => void attempt.run(ask)} disabled={attempt.busy}>
        {attempt.busy ? 'asking' : 'ask'}
      </button>
      <button onClick={() => attempt.say('said')}>say</button>
      {attempt.failed && <p role="alert">{attempt.failed}</p>}
    </>
  )
}

it('says nothing when it worked', async () => {
  render(<Form ask={() => Promise.resolve(null)} />)
  await userEvent.click(screen.getByRole('button', { name: 'ask' }))
  expect(screen.queryByRole('alert')).toBeNull()
})

it('says why it was refused', async () => {
  render(<Form ask={() => Promise.resolve('taken')} />)
  await userEvent.click(screen.getByRole('button', { name: 'ask' }))
  expect(screen.getByRole('alert')).toHaveTextContent('taken')
})

it('reads a thrown failure as the reason', async () => {
  render(<Form ask={() => Promise.reject(new Error('offline'))} />)
  await userEvent.click(screen.getByRole('button', { name: 'ask' }))
  expect(screen.getByRole('alert')).toHaveTextContent('offline')
})

it('holds the control while it is in flight', async () => {
  let answer = (_reason: string | null) => {}
  render(<Form ask={() => new Promise((resolve) => (answer = resolve))} />)
  await userEvent.click(screen.getByRole('button', { name: 'ask' }))
  expect(screen.getByRole('button', { name: 'asking' })).toBeDisabled()
  answer(null)
  expect(await screen.findByRole('button', { name: 'ask' })).toBeEnabled()
})

it('clears the last refusal before asking again', async () => {
  const ask = vi
    .fn<() => Promise<string | null>>()
    .mockResolvedValueOnce('taken')
    .mockResolvedValueOnce(null)
  render(<Form ask={ask} />)
  await userEvent.click(screen.getByRole('button', { name: 'ask' }))
  expect(screen.getByRole('alert')).toHaveTextContent('taken')
  await userEvent.click(screen.getByRole('button', { name: 'ask' }))
  expect(screen.queryByRole('alert')).toBeNull()
})

it('says a refusal the form worked out for itself', async () => {
  render(<Form ask={() => Promise.resolve(null)} />)
  await userEvent.click(screen.getByRole('button', { name: 'say' }))
  expect(screen.getByRole('alert')).toHaveTextContent('said')
})
