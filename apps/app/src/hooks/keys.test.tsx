import { fireEvent, render } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useKeyDown } from './keys'

function Listener({ note }: { note: (key: string) => void }) {
  useKeyDown((event) => note(event.key))
  return null
}

it('hears a key pressed anywhere in the window', () => {
  const note = vi.fn()
  render(<Listener note={note} />)
  fireEvent.keyDown(window, { key: 'k' })
  expect(note).toHaveBeenCalledWith('k')
})

it('runs the handler it was last given', () => {
  const first = vi.fn()
  const second = vi.fn()
  const { rerender } = render(<Listener note={first} />)
  rerender(<Listener note={second} />)
  fireEvent.keyDown(window, { key: 'k' })
  expect(first).not.toHaveBeenCalled()
  expect(second).toHaveBeenCalledWith('k')
})

it('stops listening once it is gone', () => {
  const note = vi.fn()
  const { unmount } = render(<Listener note={note} />)
  unmount()
  fireEvent.keyDown(window, { key: 'k' })
  expect(note).not.toHaveBeenCalled()
})
