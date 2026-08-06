import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import { browse } from '../window-vault'

afterEach(cleanup)

// Which vault a window stands in is read off the address bar, and moving between vaults is
// a full page load — neither of which jsdom does. Every test window starts standing in the
// mock client's seeded vault, and leaving records where for the test instead of going.
const SEEDED_VAULT = '/Users/you/.broodmother/you/handbook'

/** Stand the test window in a vault, the way a real one stands via its URL. */
export function standIn(vault: string | null): void {
  window.history.replaceState(
    null,
    '',
    vault ? `/?vault=${encodeURIComponent(vault)}` : '/',
  )
}

beforeEach(() => {
  if (typeof window === 'undefined') return
  standIn(SEEDED_VAULT)
  browse.assign = vi.fn()
  browse.replace = vi.fn()
  browse.newWindow = vi.fn()
})

// jsdom implements neither pointer capture nor the observers a floating surface measures
// itself with. The menu and modal primitives call all of them, so they are stubbed here
// rather than worked around in every test that opens one. The odd file that opts into the
// node environment has no Element at all.
if (typeof Element !== 'undefined')
  Object.assign(Element.prototype, {
    hasPointerCapture: () => false,
    setPointerCapture: () => {},
    releasePointerCapture: () => {},
    scrollIntoView: () => {},
  })

// Under Node 25 the `localStorage` global the runner hands jsdom is an empty object with
// none of the Storage API on it. The shell reads its pane sizes from storage on mount, so
// tests get a plain in-memory one rather than every test file working around it.
if (typeof localStorage?.getItem !== 'function') {
  const store = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
      clear: () => store.clear(),
    },
  })
}

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// jsdom has no media queries, and xterm asks for the device pixel ratio through one the
// moment it opens. Only the tests that let the real module through ever reach this.
globalThis.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
})) as typeof globalThis.matchMedia
