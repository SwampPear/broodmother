import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { emptyDream, parseDream, serializeDream, type Dream } from '@broodmother/shared'
import { createMockClient, type MockClient } from '../../api/mock'
import { AppProvider } from '../../state'
import { DocView } from '../doc'

/** The real editor is Monaco; what this file is about is which markdown reaches it. */
vi.mock('../../editor', () => ({
  InlineEditor: ({
    markdown,
    onChange,
    label,
  }: {
    markdown: string
    onChange: (next: string) => void
    label: string
  }) => (
    <textarea
      aria-label={label}
      value={markdown}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}))

const PATH = 'Nightly.dream'

async function show(client: MockClient = seeded()) {
  render(
    <AppProvider client={client}>
      <DocView root="vault" path={PATH} />
    </AppProvider>,
  )
  await screen.findByRole('application', { name: `dream ${PATH}` })
  return client
}

function seeded(): MockClient {
  return createMockClient({ docs: { [PATH]: serializeDream(emptyDream()) } })
}

async function saved(client: MockClient): Promise<string> {
  const { markdown } = await client.request('GET /api/doc', {
    root: 'vault',
    path: PATH,
  })
  return markdown
}

it('draws the graph the file describes', async () => {
  await show()
  expect(screen.getByRole('group', { name: 'When run' })).toBeInTheDocument()
})

it('shows a broken dream its parse error', async () => {
  const client = createMockClient({ docs: { [PATH]: '{"version":2}' } })
  render(
    <AppProvider client={client}>
      <DocView root="vault" path={PATH} />
    </AppProvider>,
  )
  await screen.findByText(/version must be 1/)
})

it('adds a node from the toolbar and saves it back as canonical JSON', async () => {
  const client = await show()
  await userEvent.click(screen.getByRole('button', { name: /node/ }))
  await userEvent.click(screen.getByRole('menuitem', { name: /Claude prompt/ }))
  await waitFor(async () => expect(await saved(client)).toContain('agent.claude'), {
    timeout: 2000,
  })
  const dream = parseDream(await saved(client))
  expect(dream.nodes.map((node) => node.kind)).toEqual(['trigger.manual', 'agent.claude'])
})

it('opens the picked node in the inspector and renames it into the file', async () => {
  const client = await show()
  fireEvent.pointerDown(screen.getByRole('group', { name: 'When run' }), { button: 0 })
  const field = await screen.findByLabelText('name')
  await userEvent.clear(field)
  await userEvent.type(field, 'Nightly build')
  await waitFor(async () => expect(await saved(client)).toContain('Nightly build'), {
    timeout: 2000,
  })
})

/* The bottom panel is the dream's own here — ⌘J raises and lowers it the way it does the
   terminal everywhere else, and it stands empty until the canvas picks. */
it('toggles the options panel with ⌘J', async () => {
  await show()
  expect(screen.queryByRole('region', { name: 'dream options' })).not.toBeInTheDocument()

  await userEvent.keyboard('{Meta>}j{/Meta}')
  expect(screen.getByRole('region', { name: 'dream options' })).toBeInTheDocument()
  expect(screen.getByText(/pick a node/i)).toBeInTheDocument()

  await userEvent.keyboard('{Meta>}j{/Meta}')
  expect(screen.queryByRole('region', { name: 'dream options' })).not.toBeInTheDocument()
})

it('edits the prompt in the markdown editor and saves it into the file', async () => {
  const dream: Dream = {
    version: 1,
    nodes: [
      {
        id: 'claude-1',
        kind: 'agent.claude',
        name: 'Summarize',
        x: 320,
        y: 120,
        prompt: 'sum up',
      },
    ],
    edges: [],
  }
  const client = await show(createMockClient({ docs: { [PATH]: serializeDream(dream) } }))
  fireEvent.pointerDown(screen.getByRole('group', { name: 'Summarize' }), { button: 0 })

  const prompt = await screen.findByLabelText('prompt')
  expect(prompt).toHaveValue('sum up')
  await userEvent.clear(prompt)
  await userEvent.type(prompt, 'read the logs')
  await waitFor(async () => expect(await saved(client)).toContain('read the logs'), {
    timeout: 2000,
  })
})

it('offers the vault personas on a Claude node and wears the pick into the file', async () => {
  const dream: Dream = {
    version: 1,
    nodes: [
      { id: 'trigger', kind: 'trigger.manual', name: 'When run', x: 80, y: 120 },
      {
        id: 'claude-1',
        kind: 'agent.claude',
        name: 'Summarize',
        x: 320,
        y: 120,
        prompt: 'sum up',
      },
    ],
    edges: [{ from: 'trigger', to: 'claude-1' }],
  }
  const client = await show(
    createMockClient({
      docs: { [PATH]: serializeDream(dream) },
      personas: [{ name: 'lens', description: 'the code reviewer' }],
    }),
  )
  fireEvent.pointerDown(screen.getByRole('group', { name: 'Summarize' }), { button: 0 })
  const field = await screen.findByLabelText('persona')
  await waitFor(() => expect(screen.getByRole('option', { name: 'lens' })).toBeTruthy())
  await userEvent.selectOptions(field, 'lens')
  await waitFor(async () => expect(await saved(client)).toContain('"persona": "lens"'), {
    timeout: 2000,
  })
  await userEvent.selectOptions(field, 'none')
  await waitFor(async () => expect(await saved(client)).not.toContain('persona'), {
    timeout: 2000,
  })
})

it('runs the dream and paints each node with its step', async () => {
  await show()
  await userEvent.click(screen.getByRole('button', { name: /run/ }))
  await waitFor(
    () => {
      expect(screen.getByRole('group', { name: 'When run' })).toHaveAttribute(
        'data-state',
        'done',
      )
    },
    { timeout: 3000 },
  )
})
