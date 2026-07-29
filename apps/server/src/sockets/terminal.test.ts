import os from 'node:os'
import path from 'node:path'
import WebSocket from 'ws'
import { afterAll, describe, expect, it } from 'vitest'
import type { TerminalClientMessage, TerminalServerMessage } from '@mother/shared'
import { createProfile } from '../profiles'
import { createProject } from '../projects'
import { cleanup, delay, tempDir, until } from '../test/fixtures'
import { type ServerHandle, startServer } from '../index'

const running: ServerHandle[] = []
afterAll(async () => {
  await Promise.all(running.map((handle) => handle.close()))
  await cleanup()
})

const IDENTITY = {
  presenceColor: '#8fb8d8',
  gitAuthor: { name: 'Test', email: 'test@localhost' },
  sshKeyPath: null,
  claudeConfigDir: null,
}

async function server() {
  const home = await tempDir()
  await createProfile({ name: 'tester', ...IDENTITY }, home)
  await createProject('tester', 'tester', home)
  const handle = await startServer({ root: await tempDir(), home, port: 0 })
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

    shell.send({ type: 'input', data: 'echo mother-$((1 + 0))\r' })
    await until(() => shell.output().includes('mother-1\r\n'))
  })

  it('starts the shell in the project you are working in', async () => {
    const handle = await server()
    const shell = await open(handle)

    shell.send({ type: 'input', data: 'pwd\r' })
    await until(() => shell.output().includes(handle.context.project!.path))
  })

  /* Switching project switches vaults, so it has to switch what the next shell opens on. */
  it('follows the project you switch to', async () => {
    const handle = await server()
    const other = await createProject('work', 'tester', handle.context.home)
    await handle.context.openProject('work')

    const shell = await open(handle)
    shell.send({ type: 'input', data: 'pwd\r' })
    await until(() => shell.output().includes(other.path))
  })

  /* A profile carries the Claude login its shells run as, or Claude picks its own. */
  it('runs the shell with the profile’s Claude config directory', async () => {
    const handle = await server()
    await handle.context.setIdentity({ ...IDENTITY, claudeConfigDir: '~/claude-work' })

    const shell = await open(handle)
    shell.send({ type: 'input', data: 'echo "dir=$CLAUDE_CONFIG_DIR"\r' })
    await until(() =>
      shell.output().includes(`dir=${path.join(os.homedir(), 'claude-work')}`),
    )
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
