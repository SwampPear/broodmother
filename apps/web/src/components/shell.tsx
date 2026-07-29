'use client'

import { usePathname, useRouter } from 'next/navigation'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import type { VaultPath } from '@broodmother/shared'
import { useApp } from '../state'
import { FileTree, filePaths, type TreeCommand } from './file-tree'
import {
  createFlow,
  deleteFlow,
  moveFlow,
  Palette,
  type Flow,
  type FlowCtx,
} from './palette'
import { VaultMenu } from './vault-menu'
import { AddWorktree } from './add-worktree'
import { ProfilePicker } from './profile-picker'
import { Resizer, clampSize, initialSize } from './resizer'
import { StatusLine } from './status-line'
import { TabStrip, docTab, type NewTab, type Tab } from './tabs'
import { TerminalPanel, TerminalTab } from './terminal'
import type { TerminalKind } from './terminal-kinds'
import { VaultPicker } from './vault-picker'

const SIDEBAR_KEY = 'broodmother.sidebar'
const TERMINAL_KEY = 'broodmother.terminal'

/** One array, so a worktree with nothing open does not get a new one every render. */
const EMPTY: Tab[] = []

/** Hidden keeps the shell alive behind ⌘J; closed is a shell that exited. */
type TerminalState = 'closed' | 'open' | 'hidden'

function currentPath(pathname: string): VaultPath | null {
  return pathname.startsWith('/doc/')
    ? decodeURIComponent(pathname.slice('/doc/'.length))
    : null
}

export function Shell({ children }: { children: ReactNode }) {
  const app = useApp()
  const router = useRouter()
  const pathname = usePathname()
  const nextTerminal = useRef(1)
  const [flow, setFlow] = useState<Flow | null>(null)
  const [sidebar, setSidebar] = useState(initialSize('sidebar'))
  const [terminal, setTerminal] = useState<TerminalState>('closed')
  const [terminalHeight, setTerminalHeight] = useState(initialSize('panel'))
  const [picker, setPicker] = useState(false)
  const [profiling, setProfiling] = useState(false)
  const [branching, setBranching] = useState(false)
  // Tabs belong to the checkout they were opened in: a file open in two worktrees is two
  // files, on two branches, and switching between them should not carry one into the other.
  const [byWorktree, setByWorktree] = useState<Record<string, Tab[]>>({})
  const where = `${app.config?.vaultPath ?? ''}#${app.worktree}`
  const tabs = byWorktree[where] ?? EMPTY
  const setTabs = useCallback(
    (next: Tab[] | ((open: Tab[]) => Tab[])) =>
      setByWorktree((all) => ({
        ...all,
        [where]: typeof next === 'function' ? next(all[where] ?? EMPTY) : next,
      })),
    [where],
  )

  // Which vault is open arrives a request after the first paint, so a tab opened from the
  // URL in the meantime is filed under a key that names no vault. When the real one turns
  // up, those tabs are its: they were always its, the app just could not say so yet.
  const filedUnder = useRef(where)
  useEffect(() => {
    const from = filedUnder.current
    if (from === where) return
    filedUnder.current = where
    if (!from.startsWith('#')) return
    setByWorktree((all) => {
      const carried = all[from]
      if (!carried?.length || all[where]?.length) return all
      const { [from]: _dropped, ...rest } = all
      return { ...rest, [where]: carried }
    })
  }, [where])
  // Set only while a terminal tab is up. Otherwise the route says which tab is active,
  // because a document tab is a place in the vault and the URL is where that lives.
  const [terminalTab, setTerminalTab] = useState<string | null>(null)

  const path = currentPath(pathname)
  const activeId = terminalTab ?? (path ? docTab(path).id : null)

  // Opening a document is how a tab appears — from the tree, the palette, a link, or a
  // reload onto a URL that was already open.
  useEffect(() => {
    if (!path) return
    const tab = docTab(path)
    setTabs((open) => (open.some((one) => one.id === tab.id) ? open : [...open, tab]))
    setTerminalTab(null)
  }, [path])

  const pick = (tab: Tab) => {
    if (tab.kind === 'terminal') return setTerminalTab(tab.id)
    setTerminalTab(null)
    router.push(`/doc/${tab.path}`)
  }

  const closeTab = (tab: Tab) => {
    const index = tabs.findIndex((one) => one.id === tab.id)
    const rest = tabs.filter((one) => one.id !== tab.id)
    setTabs(rest)
    if (tab.id !== activeId) return
    const next = rest[index] ?? rest[index - 1]
    if (next) pick(next)
    else {
      setTerminalTab(null)
      router.push('/')
    }
  }

  const newTerminal = (shell: TerminalKind) => {
    const id = `terminal:${nextTerminal.current++}`
    setTabs((open) => [...open, { id, kind: 'terminal', shell }])
    setTerminalTab(id)
  }

  // Read after mount, not during render — the server has no localStorage to hydrate from.
  useEffect(() => {
    const stored = Number(localStorage.getItem(SIDEBAR_KEY))
    if (stored) setSidebar(clampSize('sidebar', stored))
    const panel = Number(localStorage.getItem(TERMINAL_KEY))
    if (panel) setTerminalHeight(clampSize('panel', panel))
  }, [])

  const resize = (width: number) => {
    setSidebar(width)
    localStorage.setItem(SIDEBAR_KEY, String(width))
  }

  const resizeTerminal = (height: number) => {
    setTerminalHeight(height)
    localStorage.setItem(TERMINAL_KEY, String(height))
  }

  const toggleTerminal = useCallback(
    () => setTerminal((state) => (state === 'open' ? 'hidden' : 'open')),
    [],
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.metaKey && !event.ctrlKey) return
      if (event.key === 'k') {
        event.preventDefault()
        setFlow({ kind: 'commands' })
      } else if (event.key === 'j') {
        event.preventDefault()
        toggleTerminal()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [toggleTerminal])

  const ctx: FlowCtx = {
    paths: filePaths(app.entries),
    open: (path) => router.push(`/doc/${path}`),
    create: (path) => void app.create(path).then(() => router.push(`/doc/${path}`)),
    move: (from, to) => void app.move(from, to),
    remove: (path) => void app.remove(path),
    syncNow: () => void app.syncNow(),
    settings: () => router.push('/settings'),
    vaults: () => setPicker(true),
    toggleTerminal,
  }

  // What the plus offers. A note is the same flow the tree's right click runs, seeded from
  // whatever document is open, so a new note lands beside the one you were reading.
  const newTab = (what: NewTab) =>
    what === 'note' ? setFlow(createFlow(ctx, path ?? '')) : newTerminal(what)

  const fromTree = (command: TreeCommand, path: VaultPath) => {
    const flows: Record<TreeCommand, Flow> = {
      create: createFlow(ctx, path),
      move: moveFlow(ctx, path),
      delete: deleteFlow(ctx, path),
    }
    setFlow(flows[command])
  }

  // First run is the app with nothing in it, not a different app: the home renders empty
  // behind a modal that has to be answered. No gate opens before the answers are in, or
  // something that exists gets asked for anyway on the way past. Who you are comes first —
  // a vault is created working as a profile, so there has to be one to name.
  const needsProfile = app.ready && !app.profile
  const needsVault = app.ready && !!app.profile && !app.config?.vaultPath

  return (
    <div className="shell" style={{ '--sidebar': `${sidebar}px` } as CSSProperties}>
      <FileTree
        entries={app.entries}
        current={currentPath(pathname)}
        head={
          <VaultMenu
            vaults={app.vaults}
            activePath={app.config?.vaultPath ?? ''}
            profiles={app.profiles}
            activeProfile={app.profile?.name ?? null}
            worktrees={app.worktrees}
            activeWorktree={app.worktree}
            onSelect={(path) => void app.openVault(path)}
            onAdd={() => setPicker(true)}
            onDelete={(name) => void app.deleteVault(name)}
            onSelectWorktree={(name) => void app.openWorktree(name)}
            onAddWorktree={() => setBranching(true)}
            onDeleteWorktree={(name) => void app.deleteWorktree(name)}
            onSelectProfile={(name) => void app.selectProfile(name)}
            onAddProfile={() => setProfiling(true)}
            onSettings={ctx.settings}
          />
        }
        onOpen={ctx.open}
        onCommand={fromTree}
      />
      <Resizer axis="sidebar" size={sidebar} onSize={resize} />
      <main className="main">
        <TabStrip
          tabs={tabs}
          activeId={activeId}
          onPick={pick}
          onClose={closeTab}
          onNew={newTab}
        />
        <div className="main-body">
          <div className="pane" hidden={Boolean(terminalTab)}>
            {children}
          </div>
          {tabs
            .filter((tab) => tab.kind === 'terminal')
            .map((tab) => (
              <TerminalTab
                key={tab.id}
                kind={tab.shell}
                active={tab.id === terminalTab}
                onExit={() => closeTab(tab)}
              />
            ))}
        </div>
      </main>
      {terminal !== 'closed' && (
        <TerminalPanel
          height={terminalHeight}
          onHeight={resizeTerminal}
          visible={terminal === 'open'}
          onHide={() => setTerminal('hidden')}
          onExit={() => setTerminal('closed')}
        />
      )}
      <StatusLine
        sync={app.sync}
        notice={app.notice}
        onClearConflict={() => void app.clearConflict()}
        onDismissNotice={app.dismissNotice}
      />
      {(profiling || needsProfile) && (
        <ProfilePicker
          existing={app.profiles}
          home={app.home}
          current={app.profile?.name ?? null}
          onSelect={(name) => {
            setProfiling(false)
            void app.selectProfile(name)
          }}
          onCreate={(draft) => {
            setProfiling(false)
            void app.addProfile(draft)
          }}
          onClose={needsProfile ? undefined : () => setProfiling(false)}
        />
      )}
      {branching && (
        <AddWorktree
          existing={app.worktrees}
          accent={app.profile?.presenceColor}
          onCreate={(input) => {
            setBranching(false)
            void app.addWorktree(input)
          }}
          onClose={() => setBranching(false)}
        />
      )}
      {(picker || needsVault) && (
        <VaultPicker onClose={needsVault ? undefined : () => setPicker(false)} />
      )}
      {flow && <Palette flow={flow} ctx={ctx} setFlow={setFlow} />}
    </div>
  )
}
