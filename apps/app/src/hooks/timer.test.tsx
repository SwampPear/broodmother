import { render } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useTimer, type Timer } from './timer'

function show() {
  let timer: Timer | null = null
  function Host() {
    timer = useTimer()
    return null
  }
  const { unmount, rerender } = render(<Host />)
  return { timer: timer as unknown as Timer, unmount, redraw: () => rerender(<Host />) }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

it('runs what it was given', () => {
  const run = vi.fn()
  const { timer } = show()
  timer.set(run, 100)
  vi.advanceTimersByTime(100)
  expect(run).toHaveBeenCalledOnce()
})

it('drops whatever was waiting when it is set again', () => {
  const first = vi.fn()
  const second = vi.fn()
  const { timer } = show()
  timer.set(first, 100)
  timer.set(second, 100)
  vi.advanceTimersByTime(100)
  expect(first).not.toHaveBeenCalled()
  expect(second).toHaveBeenCalledOnce()
})

it('is pending only while one is waiting', () => {
  const { timer } = show()
  expect(timer.pending()).toBe(false)
  timer.set(() => {}, 100)
  expect(timer.pending()).toBe(true)
  vi.advanceTimersByTime(100)
  expect(timer.pending()).toBe(false)
})

it('stops being pending when it is cleared', () => {
  const run = vi.fn()
  const { timer } = show()
  timer.set(run, 100)
  timer.clear()
  vi.advanceTimersByTime(100)
  expect(timer.pending()).toBe(false)
  expect(run).not.toHaveBeenCalled()
})

it('does not outlive the component that set it', () => {
  const run = vi.fn()
  const { timer, unmount } = show()
  timer.set(run, 100)
  unmount()
  vi.advanceTimersByTime(100)
  expect(run).not.toHaveBeenCalled()
})

it('is the same timer across a redraw', () => {
  const run = vi.fn()
  const { timer, redraw } = show()
  timer.set(run, 100)
  redraw()
  vi.advanceTimersByTime(100)
  expect(run).toHaveBeenCalledOnce()
})
