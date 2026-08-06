import { randomUUID } from 'node:crypto'
import { spawn, type IPty } from '@lydell/node-pty'
import type { WebSocket } from 'ws'
import type { DocRoot, TerminalClientMessage, TerminalServerMessage } from '@/types'

const SHELL = process.env.SHELL ?? '/bin/bash'
const TERM = 'xterm-256color'

/**
 * How long a shell nobody is attached to goes on running. A laptop that slept, a tab the
 * browser froze, a window closed and reopened and a wifi hiccup all look the same from here
 * — a socket that closed — and what is on the other end of them is somebody's work.
 *
 * Long, because the case it has to survive is a lid shut overnight: a timer does not tick
 * while the machine is asleep, but the clock it is measured against moves the whole time,
 * so a short window is one that wakes up having thrown away everything it was for. What it
 * still catches is the shell nothing will ever ask for again — a pane orphaned by a split
 * that a reload did not bring back — and a day is soon enough for that.
 */
const DETACHED_MS = 24 * 60 * 60 * 1000
const REAP_MS = 60 * 1000

/**
 * What a terminal that comes back is shown before it sees anything live: the tail of what
 * it missed. A screenful is not enough — a build that ran while the lid was shut is the
 * thing you came back to read — and the whole of it is a log file nobody asked for.
 */
const SCROLLBACK = 256 * 1024

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

export function ambient(): Record<string, string> {
  const env = { ...process.env } as Record<string, string>
  for (const key of INHERITED_SESSION) delete env[key]
  return env
}

/** Where a shell opens and who it opens as: the project you are in, holding the
 *  credentials of the profile it works as. */
export interface TerminalSession {
  cwd: string
  env: Record<string, string>
}

/**
 * Which shell a socket is asking for. The name is the client's — a tab's, which outlives the
 * page it was drawn on — so asking again after a reload reaches the same shell, and asking
 * after this process was restarted opens a new one under the name the tab still calls it.
 * The vault scopes the name: two windows in different vaults both call their first tab
 * `terminal:1`, and each means its own.
 */
export interface TerminalRequest {
  root?: DocRoot | null
  session?: string | null
  vault?: string | null
}

/** A running shell and whoever is currently watching it, which may be nobody. */
interface Shell {
  id: string
  vault: string | null
  pty: IPty
  /** The tail of what it has said, for whoever attaches next. */
  buffer: string
  socket: WebSocket | null
  /** When the last socket went away, or null while one is attached. */
  detachedAt: number | null
}

/**
 * One login shell per session, standing in the checkout the root it was opened from names —
 * the folder you would have cd'd to anyway. Asked per shell rather than held, because moving
 * the scope has to move where the next one opens without touching the ones already running:
 * a pty someone is typing in is not somewhere to send a `cd`.
 *
 * A socket closing does not end the shell. The socket is how you are watching it, and the
 * two are not the same thing — the machine going to sleep is not you saying you were done.
 * A shell ends when it exits, when the tab it belongs to says so, or when nobody has come
 * back for it in half an hour.
 */
export class Terminals {
  private readonly shells = new Map<string, Shell>()
  private readonly reaper: NodeJS.Timeout

  constructor(
    private readonly session: (
      vault: string | null,
      root: DocRoot | null,
    ) => TerminalSession,
    private readonly detachedMs = DETACHED_MS,
  ) {
    this.reaper = setInterval(() => this.reapNow(), REAP_MS)
    // A timer is not a reason for the process to stay up.
    this.reaper.unref?.()
  }

  /** Every shell running, attached or not. */
  get count(): number {
    return this.shells.size
  }

  /** Of those, the ones nobody is watching. */
  get detached(): number {
    return [...this.shells.values()].filter((shell) => shell.socket === null).length
  }

  /**
   * A socket takes over a shell: the one it names if that shell is still running, otherwise
   * a new one in the root it asked for. A session that has been reaped or that exited while
   * nobody was looking is answered with a new shell rather than an error — the tab is still
   * on screen and it still needs something to type into, and `ready` says which it got.
   */
  accept(
    socket: WebSocket,
    { root = null, session = null, vault = null }: TerminalRequest = {},
  ): void {
    const found = session ? this.shells.get(keyOf(vault, session)) : undefined
    // Filed under the name it was asked for, so the tab that asks again after a reload —
    // or after this whole process was restarted — is asking a question that can be answered
    // rather than holding an id that means nothing any more.
    const shell = found ?? this.spawn(vault, root, session ?? randomUUID())
    // Two tabs cannot watch one shell: the second would type into the first's line. The
    // one that was there goes, and this socket is the one that has it.
    if (found?.socket && found.socket !== socket) found.socket.close()
    shell.socket = socket
    shell.detachedAt = null

    send(socket, { type: 'ready', session: shell.id, resumed: Boolean(found) })
    // What it missed, before anything live can arrive on top of it.
    if (found && shell.buffer) send(socket, { type: 'output', data: shell.buffer })

    socket.on('message', (data) => {
      let message: TerminalClientMessage
      try {
        message = JSON.parse(String(data)) as TerminalClientMessage
      } catch {
        return
      }
      if (message.type === 'input') shell.pty.write(message.data)
      // A pty rejects a zero dimension, and xterm reports one while the panel is hidden.
      else if (message.cols > 0 && message.rows > 0)
        shell.pty.resize(message.cols, message.rows)
    })

    // Not `kill`: what closed may be a laptop lid. The shell keeps running and the next
    // socket to ask for it by name gets it back, with what it missed.
    socket.on('close', () => this.detach(shell, socket))
  }

  /**
   * Somebody is finished with a shell: a tab closed, which is the only thing that ends one
   * early. Everything a split opened under that name goes with it, because a tab is closed
   * whole and its panes are not separately closeable.
   *
   * Answers how many went, so that closing something already gone is not an error — the
   * shell may have exited on its own a moment before.
   */
  finish(name: string, vault: string | null = null): number {
    const going = [...this.shells.values()].filter(
      (shell) =>
        shell.vault === vault && (shell.id === name || shell.id.startsWith(`${name}/`)),
    )
    for (const shell of going) this.kill(shell)
    return going.length
  }

  /** Everything, for a server on its way down. */
  close(): void {
    clearInterval(this.reaper)
    for (const shell of [...this.shells.values()]) this.kill(shell)
  }

  private spawn(vault: string | null, root: DocRoot | null, id: string): Shell {
    const { cwd, env } = this.session(vault, root)
    const pty = spawn(SHELL, ['-l'], {
      name: TERM,
      cwd,
      env: { ...ambient(), ...env, TERM },
      cols: 80,
      rows: 24,
    })
    const shell: Shell = { id, vault, pty, buffer: '', socket: null, detachedAt: null }
    this.shells.set(keyOf(vault, id), shell)

    // Kept whether anyone is listening or not: what a shell said while the lid was shut is
    // the thing somebody is coming back to read.
    pty.onData((data) => {
      shell.buffer = tail(shell.buffer + data)
      if (shell.socket) send(shell.socket, { type: 'output', data })
    })
    pty.onExit(({ exitCode }) => {
      this.shells.delete(keyOf(shell.vault, shell.id))
      if (!shell.socket) return
      send(shell.socket, { type: 'exit', code: exitCode })
      shell.socket.close()
    })
    return shell
  }

  /** The socket went away. The shell has not. */
  private detach(shell: Shell, socket: WebSocket): void {
    // A socket that has already been replaced closes after the one that took over from it,
    // and it is not the one to say the shell is unwatched.
    if (shell.socket !== socket) return
    shell.socket = null
    shell.detachedAt = Date.now()
  }

  private kill(shell: Shell): void {
    this.shells.delete(keyOf(shell.vault, shell.id))
    // Let go of the socket before the pty goes, so that the exit is not reported to whoever
    // is on the other end of it. A tab remounting asks for its shell again in the moment
    // between these two, and telling that one its shell had exited would close a pane that
    // is only just opening — it is dropped instead, and asks again for a shell of its own.
    const socket = shell.socket
    shell.socket = null
    shell.pty.kill()
    socket?.close()
  }

  /** Shells nobody came back for. Run on its own minute; the window is a parameter so that
   *  what it does when one is up can be asked without waiting half an hour to ask it. */
  reapNow(detachedMs = this.detachedMs): void {
    const deadline = Date.now() - detachedMs
    for (const shell of [...this.shells.values()])
      if (shell.detachedAt !== null && shell.detachedAt <= deadline) this.kill(shell)
  }
}

/** The map's key: the client's name inside the vault it was said in. NUL cannot appear in a
 *  path or a session name, so the two halves cannot collide by concatenation. */
function keyOf(vault: string | null, id: string): string {
  return `${vault ?? ''}\u0000${id}`
}

/** The last of the output, cut on a line where there is one to cut on: half a line at the
 *  head of what you come back to reads as a shell that lost its place. */
function tail(buffer: string): string {
  if (buffer.length <= SCROLLBACK) return buffer
  const cut = buffer.length - SCROLLBACK
  const line = buffer.indexOf('\n', cut)
  return buffer.slice(line === -1 || line - cut > 4096 ? cut : line + 1)
}

function send(socket: WebSocket, message: TerminalServerMessage): void {
  if (socket.readyState === 1) socket.send(JSON.stringify(message))
}
