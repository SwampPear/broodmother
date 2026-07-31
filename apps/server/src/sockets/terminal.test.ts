import os from 'node:os'
import path from 'node:path'
import WebSocket from 'ws'
import { afterAll, describe, expect, it } from 'vitest'
import type { TerminalClientMessage, TerminalServerMessage } from '@broodmother/shared'
import { mkdir, writeFile } from 'node:fs/promises'
import { defaultConfig } from '../config'
import { createProfile } from '../profiles'
import { cleanup, delay, tempDir, until } from '../test'
import { type ServerHandle, startServer } from '../index'

const running: ServerHandle[] = []
afterAll(async () => {
  await Promise.all(running.map((handle) => handle.close()))
  await cleanup()
})

const IDENTITY = {
  color: '#8fb8d8',
  gitAuthor: { name: 'Test', email: 'test@localhost' },
  sshKeyPath: null,
  claudeCfgDir: null,
  soul: null,
}

async function server() {
  const home = await tempDir()
  await createProfile({ name: 'tester', ...IDENTITY }, home)
  // A vault is a folder in the profile it commits as.
  const root = path.join(home, 'tester', 'handbook')
  await mkdir(root, { recursive: true })
  const handle = await startServer({ root, home, port: 0 })
  running.push(handle)
  return handle
}

interface Shell {
  socket: WebSocket
  output: () => string
  exits: () => Extract<TerminalServerMessage, { type: 'exit' }>[]
  send: (message: TerminalClientMessage) => void
}

async function open(handle: ServerHandle): Promise<Shell> {
  const socket = new WebSocket(`ws://127.0.0.1:${handle.port}/terminal`)
  const messages: TerminalServerMessage[] = []
  socket.on('message', (data) =>
    messages.push(JSON.parse(String(data)) as TerminalServerMessage),
  )
  await new Promise((resolve) => socket.on('open', resolve))

  return {
    socket,
    output: () =>
      messages
        .filter((message) => message.type === 'output')
        .map((message) => message.data)
        .join(''),
    exits: () => messages.filter((message) => message.type === 'exit'),
    send: (message) => socket.send(JSON.stringify(message)),
  }
}

describe('terminals', () => {
  it('runs what is typed and answers with the shell output', async () => {
    const handle = await server()
    const shell = await open(handle)
    await until(() => handle.context.terminals.count === 1)

    shell.send({ type: 'input', data: 'echo broodmother-$((1 + 0))\r' })
    await until(() => shell.output().includes('broodmother-1\r\n'))
  })

  it('starts the shell in the vault you are working in', async () => {
    const handle = await server()
    const shell = await open(handle)

    shell.send({ type: 'input', data: 'pwd\r' })
    await until(() => shell.output().includes(handle.context.config.vaultPath!))
  })

  /* The shell opens on the vault, so switching vault has to move where the next one lands. */
  it('follows the vault you switch to', async () => {
    const handle = await server()
    const other = path.join(handle.context.home, 'tester', 'notes')
    await mkdir(other, { recursive: true })
    await handle.context.openVault(other)

    const shell = await open(handle)
    shell.send({ type: 'input', data: 'pwd\r' })
    await until(() => shell.output().includes(other))
  })

  /* And a project open inside it wins: agents run in the repository the work is in. */
  it('opens in the project when one is open', async () => {
    const handle = await server()
    const project = await handle.context.addProject({ name: 'api' })

    const shell = await open(handle)
    shell.send({ type: 'input', data: 'pwd\r' })
    await until(() => shell.output().includes(project.repo))
  })

  /* A profile carries the Claude login its shells run as, or Claude picks its own. */
  it('runs the shell with the profile’s Claude config directory', async () => {
    const handle = await server()
    await handle.context.setIdentity({ ...IDENTITY, claudeCfgDir: '~/claude-work' })

    const shell = await open(handle)
    shell.send({ type: 'input', data: 'echo "dir=$CLAUDE_CONFIG_DIR"\r' })
    await until(() =>
      shell.output().includes(`dir=${path.join(os.homedir(), 'claude-work')}`),
    )
  })

  /* The brief is what an agent is told about the room it woke up in, and the shell is how
     it gets there: `--append-system-prompt "$BROODMOTHER_BRIEF"` is all the tab types.
     Matched inside the shell and answered with something the typed line does not contain,
     or the pty's echo of the command answers for it. */
  it('carries the brief in the shell’s environment', async () => {
    const handle = await server()
    const project = await handle.context.addProject({ name: 'api' })

    const shell = await open(handle)
    const holds = (pattern: string, mark: string) =>
      shell.send({
        type: 'input',
        data: `case "$BROODMOTHER_BRIEF" in *"${pattern}"*) echo "${mark}-$((1 + 0))";; esac\r`,
      })

    holds(`http://127.0.0.1:${handle.port}`, 'api')
    await until(() => shell.output().includes('api-1\r\n'))

    holds(`project ${project.name}`, 'tree')
    await until(() => shell.output().includes('tree-1\r\n'))

    holds('## Who you are', 'soul')
    await until(() => shell.output().includes('soul-1\r\n'))
  })

  it('reports the exit and closes the socket when the shell ends', async () => {
    const handle = await server()
    const shell = await open(handle)

    shell.send({ type: 'input', data: 'exit 3\r' })
    await until(() => shell.exits().length === 1)
    expect(shell.exits()[0]!.code).toBe(3)
    await until(() => handle.context.terminals.count === 0)
  })

  it('kills the shell when the socket closes', async () => {
    const handle = await server()
    const shell = await open(handle)
    await until(() => handle.context.terminals.count === 1)

    shell.socket.close()
    await until(() => handle.context.terminals.count === 0)
  })

  it('ignores a malformed message and a zero-sized resize', async () => {
    const handle = await server()
    const shell = await open(handle)
    await until(() => handle.context.terminals.count === 1)

    shell.socket.send('not json')
    shell.send({ type: 'resize', cols: 0, rows: 0 })
    await delay(50)

    shell.send({ type: 'resize', cols: 100, rows: 30 })
    shell.send({ type: 'input', data: 'tput cols\r' })
    await until(() => shell.output().includes('100'))
    expect(handle.context.terminals.count).toBe(1)
  })
})
