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
  await userEvent.click(screen.getByRole('menuitem', { name: /Steps/ }))
  await userEvent.click(await screen.findByRole('menuitem', { name: /Claude prompt/ }))
  await waitFor(async () => expect(await saved(client)).toContain('agent.claude'), {
    timeout: 2000,
  })
  const dream = parseDream(await saved(client))
  expect(dream.nodes.map((node) => node.kind)).toEqual(['trigger.manual', 'agent.claude'])
})

/* The canvas has the same menu under the right button, and the node lands where the
   button asked rather than at the centre the toolbar's add uses. */
it('adds a node where the canvas was right-clicked', async () => {
  const client = await show()
  fireEvent.contextMenu(screen.getByRole('application', { name: `dream ${PATH}` }), {
    clientX: 300,
    clientY: 200,
  })
  await userEvent.click(await screen.findByRole('menuitem', { name: /Steps/ }))
  await userEvent.click(await screen.findByRole('menuitem', { name: /Run a command/ }))
  await waitFor(async () => expect(await saved(client)).toContain('agent.shell'), {
    timeout: 2000,
  })
  const dream = parseDream(await saved(client))
  // The pointer stood at world (260, 160) through the 40px pan; the node centres on it.
  expect(dream.nodes.find((node) => node.kind === 'agent.shell')).toMatchObject({
    x: 160,
    y: 128,
  })
})

/* The antenna menu is also the way back off: a dream the lair already holds offers its
   removal beside the sites a push could land on. */
it('removes the dream from the lair through the antenna menu', async () => {
  const client = createMockClient({
    docs: { [PATH]: serializeDream(emptyDream()) },
    lair: 'https://lair.example',
    lairSites: [{ name: 'den', remote: 'git@github.com:you/den.git', pull: 'ok' }],
    lairDreams: [
      { site: 'den', path: PATH, name: 'Nightly', triggers: [], lastRun: null },
    ],
  })
  await show(client)
  await userEvent.click(await screen.findByRole('button', { name: 'run on the lair' }))
  await userEvent.click(await screen.findByRole('menuitem', { name: 'remove from den' }))
  await waitFor(async () => {
    const answer = await client.request('GET /api/lair/dreams', null)
    expect(answer.dreams).toEqual([])
  })
})

/* An agent's work is its prompt, so the node answers a click with a dialog of its own —
   and a drag only ever moves it. */
it('opens an agent in its own dialog on a click, and Escape puts it away', async () => {
  const dream: Dream = {
    version: 1,
    nodes: [
      {
        id: 'muse-1',
        kind: 'agent.muse',
        name: 'Second opinion',
        x: 320,
        y: 120,
        prompt: 'judge it',
      },
    ],
    edges: [],
  }
  await show(createMockClient({ docs: { [PATH]: serializeDream(dream) } }))
  await userEvent.click(screen.getByRole('group', { name: 'Second opinion' }))
  const dialog = await screen.findByRole('dialog', { name: 'Second opinion agent' })
  expect(dialog).toHaveTextContent('Second opinion')
  // Muse has no personas — that field is Claude's alone.
  expect(screen.queryByLabelText('persona')).not.toBeInTheDocument()

  await userEvent.keyboard('{Escape}')
  expect(
    screen.queryByRole('dialog', { name: 'Second opinion agent' }),
  ).not.toBeInTheDocument()
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
  await userEvent.click(screen.getByRole('group', { name: 'Summarize' }))

  // A click, not a drag, so the agent's own dialog is up with the prompt in it.
  await screen.findByRole('dialog', { name: 'Summarize agent' })
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
  await userEvent.click(screen.getByRole('group', { name: 'Summarize' }))
  await userEvent.click(await screen.findByRole('button', { name: 'persona' }))

  // The search narrows the floating list; what does not match is not offered.
  const search = await screen.findByPlaceholderText('search personas…')
  await userEvent.type(search, 'nothing like this')
  expect(screen.queryByRole('menuitemradio', { name: 'lens' })).not.toBeInTheDocument()
  await userEvent.clear(search)
  await userEvent.type(search, 'len')

  await userEvent.click(await screen.findByRole('menuitemradio', { name: 'lens' }))
  await waitFor(async () => expect(await saved(client)).toContain('"persona": "lens"'), {
    timeout: 2000,
  })

  await userEvent.click(screen.getByRole('button', { name: 'persona' }))
  await userEvent.click(await screen.findByRole('menuitemradio', { name: 'none' }))
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
