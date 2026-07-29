import { spawn, type IPty } from '@lydell/node-pty'
import type { WebSocket } from 'ws'
import type { TerminalClientMessage, TerminalServerMessage } from '@mother/shared'

const SHELL = process.env.SHELL ?? '/bin/bash'
const TERM = 'xterm-256color'

/** One login shell per socket, rooted in the vault. Closing the socket kills the shell. */
export class Terminals {
  private readonly shells = new Map<WebSocket, IPty>()

  constructor(private readonly cwd: () => string) {}

  get count(): number {
    return this.shells.size
  }

  accept(socket: WebSocket): void {
    const shell = spawn(SHELL, ['-l'], {
      name: TERM,
      cwd: this.cwd(),
      env: { ...process.env, TERM } as Record<string, string>,
      cols: 80,
      rows: 24,
    })
    this.shells.set(socket, shell)

    shell.onData((data) => send(socket, { type: 'output', data }))
    shell.onExit(({ exitCode }) => {
      send(socket, { type: 'exit', code: exitCode })
      this.shells.delete(socket)
      socket.close()
    })

    socket.on('message', (data) => {
      let message: TerminalClientMessage
      try {
        message = JSON.parse(String(data)) as TerminalClientMessage
      } catch {
        return
      }
      if (message.type === 'input') shell.write(message.data)
      // A pty rejects a zero dimension, and xterm reports one while the panel is hidden.
      else if (message.cols > 0 && message.rows > 0)
        shell.resize(message.cols, message.rows)
    })

    socket.on('close', () => this.kill(socket))
  }

  close(): void {
    for (const socket of [...this.shells.keys()]) {
      this.kill(socket)
      socket.close()
    }
  }

  private kill(socket: WebSocket): void {
    const shell = this.shells.get(socket)
    if (!shell) return
    this.shells.delete(socket)
    shell.kill()
  }
}

function send(socket: WebSocket, message: TerminalServerMessage): void {
  if (socket.readyState === 1) socket.send(JSON.stringify(message))
}
