'use client'

import { usePathname, useRouter } from 'next/navigation'
import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import type { VaultPath } from '@mother/shared'
import { useApp } from '../state'
import { DivergenceDialog } from './divergence-dialog'
import { FileTree, filePaths, type TreeCommand } from './file-tree'
import {
  createFlow,
  deleteFlow,
  moveFlow,
  Palette,
  type Flow,
  type FlowCtx,
} from './palette'
import { ProfileMenu } from './profile-menu'
import { applyProfile, load, save, seed, type Profile } from '../profiles'
import { Resizer, clampSize, initialSize } from './resizer'
import { StatusLine } from './status-line'
import { TerminalPanel } from './terminal'

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
  const [flow, setFlow] = useState<Flow | null>(null)
  const [sidebar, setSidebar] = useState(initialSize('sidebar'))
  const [terminal, setTerminal] = useState<TerminalState>('closed')
  const [terminalHeight, setTerminalHeight] = useState(initialSize('panel'))
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [activeProfile, setActiveProfile] = useState('default')

  // Read after mount, not during render — the server has no localStorage to hydrate from.
  useEffect(() => {
    const stored = Number(localStorage.getItem(SIDEBAR_KEY))
    if (stored) setSidebar(clampSize('sidebar', stored))
    const panel = Number(localStorage.getItem(TERMINAL_KEY))
    if (panel) setTerminalHeight(clampSize('panel', panel))
  }, [])

  // Seeded from the live config, so the profile you start on is the one you already have.
  useEffect(() => {
    if (!app.config || profiles.length) return
    const stored = load() ?? seed(app.config)
    setProfiles(stored.profiles)
    setActiveProfile(stored.active)
  }, [app.config, profiles.length])

  const selectProfile = (id: string) => {
    const profile = profiles.find((candidate) => candidate.id === id)
    if (!profile || !app.config) return
    setActiveProfile(id)
    save({ active: id, profiles })
    void app.saveConfig(applyProfile(app.config, profile))
  }

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
    share: (path) => app.share(path),
    syncNow: () => void app.syncNow(),
    settings: () => router.push('/settings'),
    toggleTerminal,
  }

  const fromTree = (command: TreeCommand, path: VaultPath) => {
    const flows: Record<TreeCommand, Flow> = {
      create: createFlow(ctx, path),
      move: moveFlow(ctx, path),
      delete: deleteFlow(ctx, path),
    }
    setFlow(flows[command])
  }

  return (
    <div className="shell" style={{ '--sidebar': `${sidebar}px` } as CSSProperties}>
      <FileTree
        entries={app.entries}
        current={currentPath(pathname)}
        head={
          <ProfileMenu
            profiles={profiles}
            activeId={activeProfile}
            onSelect={selectProfile}
            onManage={ctx.settings}
          />
        }
        onOpen={ctx.open}
        onCommand={fromTree}
      />
      <Resizer axis="sidebar" size={sidebar} onSize={resize} />
      <main className="main">{children}</main>
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
        session={app.session?.state ?? 'solo'}
        peers={app.session?.peers ?? []}
        notice={app.notice}
        onClearConflict={() => void app.clearConflict()}
        onDismissNotice={app.dismissNotice}
      />
      {flow && <Palette flow={flow} ctx={ctx} setFlow={setFlow} />}
      {app.divergence && (
        <DivergenceDialog report={app.divergence} onChoose={app.resolveDivergence} />
      )}
    </div>
  )
}
