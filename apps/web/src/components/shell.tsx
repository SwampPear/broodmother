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
import type { VaultPath } from '@mother/shared'
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
import { ProjectMenu } from './project-menu'
import { AddProject } from './add-project'
import { ProfilePicker } from './profile-picker'
import { Resizer, clampSize, initialSize } from './resizer'
import { StatusLine } from './status-line'
import { TabStrip, docTab, type NewTab, type Tab } from './tabs'
import { TerminalPanel, TerminalTab } from './terminal'
import type { TerminalKind } from './terminal-kinds'
import { VaultPicker } from './vault-picker'

const SIDEBAR_KEY = 'mother.sidebar'
const TERMINAL_KEY = 'mother.terminal'

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
  const [adding, setAdding] = useState(false)
  const [profiling, setProfiling] = useState(false)
  const [tabs, setTabs] = useState<Tab[]>([])
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
  // a project is created working as a profile, so there has to be one to name.
  const needsProfile =
    app.ready && (app.profiles.length === 0 || (!!app.project && !app.profile))
  const needsProject = app.ready && app.profiles.length > 0 && !app.project
  const needsVault = app.ready && !!app.project && !app.config?.vaultPath

  return (
    <div className="shell" style={{ '--sidebar': `${sidebar}px` } as CSSProperties}>
      <FileTree
        entries={app.entries}
        current={currentPath(pathname)}
        head={
          <ProjectMenu
            projects={app.projects}
            activeName={app.project?.name ?? ''}
            profiles={app.profiles}
            activeProfile={app.profile?.name ?? null}
            onSelect={(name) => void app.openProject(name)}
            onAdd={() => setAdding(true)}
            onDelete={(name) => void app.deleteProject(name)}
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
      {(adding || needsProject) && (
        <AddProject
          existing={app.projects.map((project) => project.name)}
          profiles={app.profiles}
          defaultProfile={app.profile?.name}
          home={app.home}
          onCreate={(input) => {
            setAdding(false)
            void app.addProject(input)
          }}
          onClose={needsProject ? undefined : () => setAdding(false)}
        />
      )}
      {(picker || needsVault) && (
        <VaultPicker onClose={needsVault ? undefined : () => setPicker(false)} />
      )}
      {flow && <Palette flow={flow} ctx={ctx} setFlow={setFlow} />}
    </div>
  )
}
