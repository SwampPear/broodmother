import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { HomeView } from './home'

/* The pane used to say ⌘K opened everything without saying what it opened, and nothing at
   all about the other key. */
it('names the two keys the app is worked by, and what each does', () => {
  render(<HomeView />)

  expect(screen.getByText('⌘K')).toBeInTheDocument()
  expect(screen.getByText(/Search every document/)).toBeInTheDocument()
  expect(screen.getByText('⌘J')).toBeInTheDocument()
  expect(screen.getByText(/terminal/)).toBeInTheDocument()
})

/* Everything else is behind ⌘K, and a second list of it here is one that goes stale. */
it('says nothing about the commands ⌘K runs', () => {
  render(<HomeView />)
  expect(screen.queryByText('Sync now')).not.toBeInTheDocument()
  expect(screen.queryByText('Settings')).not.toBeInTheDocument()
})
