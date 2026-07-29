import WebSocket from 'ws'
import { afterAll, describe, expect, it } from 'vitest'
import type { TerminalClientMessage, TerminalServerMessage } from '@mother/shared'
import { cleanup, delay, tempDir, until } from './fixtures'
import { type ServerHandle, startServer } from './index'

const running: ServerHandle[] = []
afterAll(async () => {
  await Promise.all(running.map((handle) => handle.close()))
  await cleanup()
})

async function server() {
  const handle = await startServer({ root: await tempDir(), port: 0 })
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

    shell.send({ type: 'input', data: 'echo ECSEQ-$((1 + 0))\r' })
    await until(() => shell.output().includes('ECSEQ-1\r\n'))
  })

  it('starts the shell in the vault', async () => {
    const handle = await server()
    const shell = await open(handle)

    shell.send({ type: 'input', data: 'pwd\r' })
    await until(() => shell.output().includes(handle.context.config.vaultPath))
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
