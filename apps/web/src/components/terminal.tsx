'use client'

import '@xterm/xterm/css/xterm.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import { opal } from '../colors'
import { useApp } from '../state'
import { Icon } from './icons'
import { Resizer } from './resizer'
import { KINDS, TERMINALS, type TerminalKind } from './terminal-kinds'

const hex = Object.fromEntries(opal.map((color) => [color.name, color.hex]))

/** The ground and the opal palette, so a shell looks like the rest of the app. */
const THEME = {
  background: '#0a0a0a',
  foreground: '#fffeee',
  cursor: hex.violet,
  cursorAccent: '#0a0a0a',
  selectionBackground: 'rgba(255, 254, 238, 0.16)',
  black: '#1f1f1f',
  brightBlack: '#6f6f6a',
  red: hex.rose,
  brightRed: hex.rose,
  green: hex.mint,
  brightGreen: hex.mint,
  yellow: hex.gold,
  brightYellow: hex.gold,
  blue: hex.indigo,
  brightBlue: hex.indigo,
  magenta: hex.violet,
  brightMagenta: hex.violet,
  cyan: hex.cyan,
  brightCyan: hex.cyan,
  white: '#fffeee',
  brightWhite: '#fffeee',
}

export function TerminalPanel({
  height,
  onHeight,
  visible,
  onHide,
  onExit,
}: {
  height: number
  onHeight: (height: number) => void
  visible: boolean
  onHide: () => void
  onExit: () => void
}) {
  const [tab, setTab] = useState<TerminalKind>('shell')
  // A tab is spawned the first time it is opened, not when the panel is: nobody wants
  // claude started behind their back because they wanted a shell.
  const [live, setLive] = useState<TerminalKind[]>(['shell'])
  const exit = useRef(onExit)
  exit.current = onExit

  const ended = useCallback(
    (kind: TerminalKind) => setLive((kinds) => kinds.filter((live) => live !== kind)),
    [],
  )

  useEffect(() => {
    if (!live.length) exit.current()
    else if (!live.includes(tab)) setTab(live[0]!)
  }, [live, tab])

  const open = (kind: TerminalKind) => {
    setLive((kinds) => (kinds.includes(kind) ? kinds : [...kinds, kind]))
    setTab(kind)
  }

  return (
    <section className="terminal" hidden={!visible} style={{ height }}>
      <Resizer axis="panel" size={height} onSize={onHeight} />
      <header className="terminal-head">
        {KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            className="terminal-tab"
            data-kind={kind}
            aria-label={TERMINALS[kind].label}
            title={TERMINALS[kind].label}
            aria-pressed={tab === kind}
            data-active={tab === kind || undefined}
            onClick={() => open(kind)}
          >
            <Icon name={TERMINALS[kind].icon} />
          </button>
        ))}
        <span className="spacer" />
        <button
          type="button"
          className="terminal-hide"
          aria-label="hide terminal"
          title="hide terminal (⌘J)"
          onClick={onHide}
        >
          ✕
        </button>
      </header>
      {KINDS.filter((kind) => live.includes(kind)).map((kind) => (
        <Session
          key={kind}
          run={TERMINALS[kind].run}
          active={visible && tab === kind}
          onEnd={() => ended(kind)}
        />
      ))}
    </section>
  )
}

/**
 * The same shell as the panel's, given the whole pane instead of a strip at the bottom.
 * It stays mounted while other tabs are on top — a pty that unmounts is a pty that dies.
 */
export function TerminalTab({
  kind,
  active,
  onExit,
}: {
  kind: TerminalKind
  active: boolean
  onExit: () => void
}) {
  return (
    <div className="terminal terminal-tab-pane" hidden={!active}>
      <Session run={TERMINALS[kind].run} active={active} onEnd={onExit} />
    </div>
  )
}

/** One pty, kept alive behind whichever tab is on top. */
function Session({
  run,
  active,
  onEnd,
}: {
  run: string | null
  active: boolean
  onEnd: () => void
}) {
  const app = useApp()
  const host = useRef<HTMLDivElement>(null)
  const shell = useRef<{ fit: () => void; focus: () => void } | null>(null)
  const [lost, setLost] = useState(false)
  const end = useRef(onEnd)
  end.current = onEnd

  useEffect(() => {
    const node = host.current
    if (!node) return
    let stop: (() => void) | null = null
    let gone = false

    void (async () => {
      const [{ Terminal }, { FitAddon }] = await Promise.all([
        import('@xterm/xterm'),
        import('@xterm/addon-fit'),
      ])
      if (gone) return

      const terminal = new Terminal({
        theme: THEME,
        // Resolved, not `var(--mono)`: a renderer measuring on canvas can't read the var.
        fontFamily: getComputedStyle(document.documentElement).getPropertyValue('--mono'),
        fontSize: 12,
        lineHeight: 1.3,
        cursorBlink: true,
      })
      const fit = new FitAddon()
      terminal.loadAddon(fit)
      terminal.open(node)

      let started = false
      const connection = app.client.terminal(
        (message) => {
          if (message.type !== 'output') return end.current()
          terminal.write(message.data)
          // The command waits for the shell to say something first. Typed before the prompt
          // it lands in a tty that is still echoing raw, and then the line editor starts,
          // finds a line already waiting and redraws it — the same command on screen twice,
          // which reads as having run twice.
          if (run && !started) {
            started = true
            connection.send({ type: 'input', data: run })
          }
        },
        () => setLost(true),
      )
      terminal.onData((data) => connection.send({ type: 'input', data }))

      // A hidden panel measures zero, which xterm reads as a one-column terminal.
      const resize = () => {
        if (!node.clientHeight) return
        fit.fit()
        connection.send({ type: 'resize', cols: terminal.cols, rows: terminal.rows })
      }
      const observer = new ResizeObserver(resize)
      observer.observe(node)
      // Before the shell speaks, so the command it is handed lands in a terminal that is
      // already the right width.
      resize()
      terminal.focus()
      setLost(false)

      shell.current = { fit: resize, focus: () => terminal.focus() }
      stop = () => {
        observer.disconnect()
        connection.close()
        terminal.dispose()
        shell.current = null
      }
    })()

    return () => {
      gone = true
      stop?.()
    }
  }, [app.client, run])

  useEffect(() => {
    if (active) shell.current?.focus()
  }, [active])

  return (
    <>
      {/* Clicking the padding around xterm's own surface should still put the cursor in
          the shell — otherwise the panel looks focused but eats what you type. */}
      <div
        className="terminal-body"
        hidden={!active}
        ref={host}
        onMouseDown={() => shell.current?.focus()}
      />
      {active && lost && (
        <p className="terminal-lost" role="status">
          disconnected from the backend — is <code>mother</code> still running?
        </p>
      )}
    </>
  )
}
