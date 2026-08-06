import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { useLoad } from './load'

function Read({ of, read }: { of: string; read: (of: string) => Promise<string> }) {
  const { value, error, set } = useLoad(of ? () => read(of) : null, [of, read])
  return (
    <>
      <p data-testid="value">{value ?? '—'}</p>
      <p data-testid="error">{error ?? '—'}</p>
      <button onClick={() => set('by hand')}>set</button>
    </>
  )
}

const shown = () => screen.getByTestId('value').textContent

it('shows what came back', async () => {
  render(<Read of="a" read={(of) => Promise.resolve(`read ${of}`)} />)
  expect(await screen.findByText('read a')).toBeInTheDocument()
})

it('drops the answer to a question that has moved on', async () => {
  const answers = new Map<string, (value: string) => void>()
  const read = (of: string) => new Promise<string>((resolve) => answers.set(of, resolve))

  const { rerender } = render(<Read of="a" read={read} />)
  rerender(<Read of="b" read={read} />)

  answers.get('a')?.('read a')
  expect(shown()).toBe('—')

  answers.get('b')?.('read b')
  expect(await screen.findByText('read b')).toBeInTheDocument()
})

it('asks nothing where there is nothing to ask', () => {
  const read = vi.fn(() => Promise.resolve('read'))
  render(<Read of="" read={read} />)
  expect(read).not.toHaveBeenCalled()
  expect(shown()).toBe('—')
})

it('says why it failed', async () => {
  render(<Read of="a" read={() => Promise.reject(new Error('gone'))} />)
  expect(await screen.findByText('gone')).toBeInTheDocument()
})

it('takes a value the caller already knows', async () => {
  render(<Read of="a" read={(of) => Promise.resolve(`read ${of}`)} />)
  await screen.findByText('read a')
  await userEvent.click(screen.getByRole('button', { name: 'set' }))
  expect(shown()).toBe('by hand')
})

it('asks again on an interval, and stops when it goes', async () => {
  vi.useFakeTimers()
  const read = vi.fn(() => Promise.resolve('read'))
  function Polled() {
    useLoad(read, [], 1000)
    return null
  }
  const { unmount } = render(<Polled />)
  expect(read).toHaveBeenCalledTimes(1)
  vi.advanceTimersByTime(2500)
  expect(read).toHaveBeenCalledTimes(3)
  unmount()
  vi.advanceTimersByTime(2000)
  expect(read).toHaveBeenCalledTimes(3)
  vi.useRealTimers()
})
