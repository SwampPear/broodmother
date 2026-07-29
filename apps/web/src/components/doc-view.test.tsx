import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import type { ApiRoute } from '@broodmother/shared'
import { createMockClient, type MockClient } from '../api/mock'
import { AppProvider } from '../state'
import { DocView } from './doc-view'

/** The real editor is Monaco; what this file is about is which markdown reaches it. */
vi.mock('../editor', () => ({
  Editor: ({
    markdown,
    onChange,
  }: {
    markdown: string
    onChange: (next: string) => void
  }) => (
    <textarea
      aria-label="document"
      value={markdown}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}))

const PATH = 'README.md'
const SEEDED = '# Vault\n\nEverything lives here.\n'

/** Every document read the view makes, so "did not reload" can be asserted as itself. */
function reads(client: MockClient): string[] {
  const seen: string[] = []
  const request = client.request.bind(client)
  client.request = ((route: ApiRoute, body: never) => {
    if (route === 'GET /api/doc') seen.push((body as { path: string }).path)
    return request(route, body)
  }) as typeof client.request
  return seen
}

async function show(client: MockClient = createMockClient()) {
  render(
    <AppProvider client={client}>
      <DocView path={PATH} />
    </AppProvider>,
  )
  // A regex, not the string: the display-value matcher collapses the newlines out of it.
  await screen.findByDisplayValue(/Everything lives here/)
  return client
}

/** A write from anywhere else — a shell, Obsidian, a sync pull — is the truth about the
 *  file, and the vault event is how it arrives. */
it('follows a write it did not make', async () => {
  const client = await show()

  await client.request('PUT /api/doc', { path: PATH, markdown: '# Vault\n\nrewritten\n' })

  expect(await screen.findByDisplayValue(/rewritten/)).toBeInTheDocument()
})

it('does not reload on a write to a document it is not showing', async () => {
  const client = createMockClient()
  const seen = reads(client)
  await show(client)
  expect(seen).toEqual([PATH])

  await client.request('PUT /api/doc', {
    path: 'Business/Roadmap.md',
    markdown: '# elsewhere\n',
  })

  await waitFor(() => expect(screen.getByLabelText('document')).toHaveValue(SEEDED))
  expect(seen).toEqual([PATH])
})

/* Adopting the file mid-keystroke throws away what is being typed, so typing that has not
   reached disk yet wins and lands on top a moment later. */
it('does not overwrite typing that has not been saved yet', async () => {
  const client = await show()

  await userEvent.type(screen.getByLabelText('document'), 'local')
  await client.request('PUT /api/doc', { path: PATH, markdown: '# from elsewhere\n' })

  await waitFor(() =>
    expect(screen.getByLabelText('document')).toHaveValue(`${SEEDED}local`),
  )
})

it('says so when the document it is showing is deleted', async () => {
  const client = await show()

  await client.request('DELETE /api/doc', { path: PATH })

  expect(await screen.findByText(/no such document/)).toBeInTheDocument()
})

/* A coding agent writing into the vault is the case this has to get right: the file on
   disk is the truth, and what is on screen follows it without anyone asking. */
it('follows a second write straight after the first', async () => {
  const client = await show()

  await client.request('PUT /api/doc', { path: PATH, markdown: '# one\n' })
  expect(await screen.findByDisplayValue(/one/)).toBeInTheDocument()

  await client.request('PUT /api/doc', { path: PATH, markdown: '# two\n' })
  expect(await screen.findByDisplayValue(/two/)).toBeInTheDocument()
})

it('says so when the open document is deleted under it', async () => {
  const client = await show()

  await client.request('DELETE /api/doc', { path: PATH })

  await waitFor(() => expect(screen.queryByLabelText('document')).not.toBeInTheDocument())
})
