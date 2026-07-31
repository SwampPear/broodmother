'use client'

import '@xterm/xterm/css/xterm.css'
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { DocRoot } from '@broodmother/shared'
import { opal } from '../../colors'
import { useApp } from '../../state'
import { Icon, Resizer } from '../ui'
import { command, KINDS, type TerminalKind, TERMINALS } from './kinds'
import {
  close,
  frame,
  leaf,
  resize,
  seams,
  split,
  type Layout,
  type Seam,
} from './layout'

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
  root,
  height,
  onHeight,
  visible,
  onHide,
  onExit,
}: {
  /** Where its shells open. Read when one is spawned and never again: a pty someone is
   *  typing in is not somewhere to send a `cd`, so moving the scope moves the next shell
   *  rather than the ones already running. */
  root: DocRoot
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
          kind={kind}
          root={root}
          active={visible && tab === kind}
          focused={visible && tab === kind}
          onEnd={() => ended(kind)}
        />
      ))}
    </section>
  )
}

/** The panel's ground and a shell's are the same black, so a seam has to be drawn. */
const SEAM = '1px solid var(--line)'

/**
 * The same shell as the panel's, given the whole pane instead of a strip at the bottom, and
 * splittable in two directions: ⌘D puts a pane beside this one, ⌘⇧D below it, ⌘[ and ⌘] walk
 * between them. It stays mounted while other tabs are on top — a pty that unmounts is a pty
 * that dies.
 */
export function TerminalTab({
  kind,
  root,
  active,
  onExit,
}: {
  kind: TerminalKind
  /** Where its shells open — the scope the tab was made in, kept for the panes a split
   *  adds later, so one tab's shells all stand in the same folder. */
  root: DocRoot
  active: boolean
  onExit: () => void
}) {
  const [layout, setLayout] = useState<Layout>(() => leaf(kind))
  // Null until a shell takes the cursor, which the first one does as it opens.
  const [focus, setFocus] = useState<string | null>(null)
  // A seam is dragged in pixels, so the tab has to say how many it is wide and tall.
  const [box, setBox] = useState({ w: 0, h: 0 })
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = host.current
    if (!node) return
    const observer = new ResizeObserver(() =>
      setBox({ w: node.clientWidth, h: node.clientHeight }),
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const panes = frame(layout)
  const here = focus ?? panes[0]?.leaf.id

  const span = (seam: Seam) =>
    seam.axis === 'row' ? seam.rect.w * box.w : seam.rect.h * box.h

  const ended = (id: string) => {
    const rest = close(layout, id)
    if (!rest) return onExit()
    setLayout(rest)
    if (here === id) setFocus(frame(rest)[0]?.leaf.id ?? null)
  }

  // On the pane rather than the window: the event comes from the shell you are typing in,
  // which is the one a split is measured from, so nothing has to be remembered to place it.
  const keys = (event: KeyboardEvent<HTMLDivElement>, id: string) => {
    if (!event.metaKey && !event.ctrlKey) return
    if (event.key.toLowerCase() === 'd') {
      event.preventDefault()
      setLayout(split(layout, id, event.shiftKey ? 'column' : 'row'))
    } else if (event.key === '[' || event.key === ']') {
      event.preventDefault()
      const order = panes.map((pane) => pane.leaf.id)
      const at = order.indexOf(id) + (event.key === ']' ? 1 : -1)
      setFocus(order[(at + order.length) % order.length] ?? id)
    }
  }

  return (
    <div className="terminal terminal-tab-pane" hidden={!active} ref={host}>
      {panes.map(({ leaf: pane, rect }) => (
        <div
          key={pane.id}
          className="terminal-pane"
          style={{
            left: `${rect.x * 100}%`,
            top: `${rect.y * 100}%`,
            width: `${rect.w * 100}%`,
            height: `${rect.h * 100}%`,
            borderLeft: rect.x > 0 ? SEAM : undefined,
            borderTop: rect.y > 0 ? SEAM : undefined,
          }}
          onFocusCapture={() => setFocus(pane.id)}
          onKeyDown={(event) => keys(event, pane.id)}
        >
          <Session
            kind={pane.shell}
            root={root}
            active
            focused={active && here === pane.id}
            onEnd={() => ended(pane.id)}
          />
        </div>
      ))}
      {/* Held back until the tab has been measured: a seam with no run to travel has no
          limits to clamp against. */}
      {box.w > 0 &&
        seams(layout).map((seam) => (
          <Resizer
            key={seam.id}
            axis={seam.axis}
            span={span(seam)}
            size={span(seam) * seam.ratio}
            onSize={(at) => setLayout(resize(layout, seam.id, at / span(seam)))}
            style={
              seam.axis === 'row'
                ? {
                    left: `${(seam.rect.x + seam.rect.w * seam.ratio) * 100}%`,
                    top: `${seam.rect.y * 100}%`,
                    height: `${seam.rect.h * 100}%`,
                  }
                : {
                    top: `${(seam.rect.y + seam.rect.h * seam.ratio) * 100}%`,
                    left: `${seam.rect.x * 100}%`,
                    width: `${seam.rect.w * 100}%`,
                  }
            }
          />
        ))}
    </div>
  )
}

/** One pty, kept alive behind whichever tab is on top. */
function Session({
  kind,
  root,
  active,
  focused,
  onEnd,
}: {
  kind: TerminalKind
  /** The root this pty stands in, taken once when it is spawned. */
  root: DocRoot
  /** Shown, which every pane of a tab on top is. */
  active: boolean
  /** Holding the cursor, which one of them is. */
  focused: boolean
  onEnd: () => void
}) {
  const app = useApp()
  const run = useRef(command(kind))
  // Taken once for the same reason the soul is: this shell stands where it was opened, and
  // the scope moving afterwards is not a reason to move a folder out from under it.
  const opened = useRef(root)
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
        opened.current,
        (message) => {
          if (message.type !== 'output') return end.current()
          terminal.write(message.data)
          // The command waits for the shell to say something first. Typed before the prompt
          // it lands in a tty that is still echoing raw, and then the line editor starts,
          // finds a line already waiting and redraws it — the same command on screen twice,
          // which reads as having run twice.
          if (run.current && !started) {
            started = true
            connection.send({ type: 'input', data: run.current })
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
  }, [app.client])

  useEffect(() => {
    if (focused) shell.current?.focus()
  }, [focused])

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
          disconnected from the backend — is <code>broodmother</code> still running?
        </p>
      )}
    </>
  )
}
