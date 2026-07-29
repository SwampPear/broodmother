'use client'

import '@xterm/xterm/css/xterm.css'
import { useEffect, useRef, useState } from 'react'
import { opal } from '../colors'
import { useApp } from '../state'
import { Resizer } from './resizer'

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
  const app = useApp()
  const host = useRef<HTMLDivElement>(null)
  const shell = useRef<{ fit: () => void; focus: () => void } | null>(null)
  const [lost, setLost] = useState(false)
  const exit = useRef(onExit)
  exit.current = onExit

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

      const connection = app.client.terminal(
        (message) => {
          if (message.type === 'output') terminal.write(message.data)
          else exit.current()
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
  }, [app.client])

  useEffect(() => {
    if (visible) shell.current?.focus()
  }, [visible])

  return (
    <section className="terminal" hidden={!visible} style={{ height }}>
      <Resizer axis="panel" size={height} onSize={onHeight} />
      <header className="terminal-head">
        <span className="terminal-title">terminal</span>
        <span className="terminal-cwd">{app.config?.vaultPath ?? ''}</span>
        <span className="spacer" />
        <button
          type="button"
          aria-label="hide terminal"
          title="hide terminal (⌘J)"
          onClick={onHide}
        >
          ✕
        </button>
      </header>
      {/* Clicking the padding around xterm's own surface should still put the cursor in
          the shell — otherwise the panel looks focused but eats what you type. */}
      <div
        className="terminal-body"
        ref={host}
        onMouseDown={() => shell.current?.focus()}
      />
      {lost && (
        <p className="terminal-lost" role="status">
          disconnected from the backend — is <code>mother</code> still running?
        </p>
      )}
    </section>
  )
}
