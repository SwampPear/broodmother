import { spawn, type IPty } from '@lydell/node-pty'
import type { WebSocket } from 'ws'
import type { TerminalClientMessage, TerminalServerMessage } from '@mother/shared'

const SHELL = process.env.SHELL ?? '/bin/bash'
const TERM = 'xterm-256color'

/**
 * Claude Code stamps its session onto the environment, and a server started from inside one
 * hands that stamp down to every shell it spawns — where the next claude reads it as its own
 * parent, calls itself a nested child, and stops saving transcripts. A terminal here is a
 * session of its own, whatever happened to launch the server. CLAUDE_CONFIG_DIR stays: that
 * one is the user saying where their config lives, not a session marking its children.
 */
const INHERITED_SESSION = [
  'CLAUDECODE',
  'CLAUDE_CODE_CHILD_SESSION',
  'CLAUDE_CODE_ENTRYPOINT',
  'CLAUDE_CODE_EXECPATH',
  'CLAUDE_CODE_SESSION_ID',
  'CLAUDE_EFFORT',
  'CLAUDE_PID',
]

function ambient(): Record<string, string> {
  const env = { ...process.env } as Record<string, string>
  for (const key of INHERITED_SESSION) delete env[key]
  return env
}

/** Where a shell opens and who it opens as: the project you are in, holding the credentials
 *  of the profile it works as. */
export interface TerminalSession {
  cwd: string
  env: Record<string, string>
}

/**
 * One login shell per socket, standing in the project you are working in — its vaults are
 * the folders in it, which is what you would have cd'd to anyway. Asked per shell rather
 * than held, because switching project has to move where the next one opens. Closing the
 * socket kills the shell.
 */
export class Terminals {
  private readonly shells = new Map<WebSocket, IPty>()

  constructor(private readonly session: () => TerminalSession) {}

  get count(): number {
    return this.shells.size
  }

  accept(socket: WebSocket): void {
    const { cwd, env } = this.session()
    const shell = spawn(SHELL, ['-l'], {
      name: TERM,
      cwd,
      env: { ...ambient(), ...env, TERM },
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
