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
import { FileTree, filePaths, folderOf, untitledIn, type TreeCommand } from './file-tree'
import { deleteFlow, moveFlow, Palette, type Flow, type FlowCtx } from './palette'
import { VaultMenu } from './vault-menu'
import { AddWorktree } from './add-worktree'
import { WorktreeMenu } from './worktree-menu'
import { ProfilePicker } from './profile-picker'
import { Resizer, clampSize, initialSize } from './resizer'
import { StatusLine } from './status-line'
import { TabStrip, docTab, type NewTab, type Tab } from './tabs'
import { TerminalPanel, TerminalTab } from './terminal'
import type { TerminalKind } from './terminal-kinds'
import { VaultPicker } from './vault-picker'

const SIDEBAR_KEY = 'broodmother.sidebar'
const TERMINAL_KEY = 'broodmother.terminal'
const ROUTES_KEY = 'broodmother.routes'

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
  // The row the tree is holding open for a name. Set the moment a note is made, cleared
  // whether the name arrives or not.
  const [renaming, setRenaming] = useState<VaultPath | null>(null)
  const [profiling, setProfiling] = useState(false)
  const [branching, setBranching] = useState(false)
  // Tabs belong to the checkout they were opened in: a file open in two worktrees is two
  // files, on two branches, and switching between them should not carry one into the other.
  const [byWorktree, setByWorktree] = useState<Record<string, Tab[]>>({})
  const where = app.checkout
  const tabs = byWorktree[where] ?? EMPTY
  const setTabs = useCallback(
    (next: Tab[] | ((open: Tab[]) => Tab[])) =>
      setByWorktree((all) => ({
        ...all,
        [where]: typeof next === 'function' ? next(all[where] ?? EMPTY) : next,
      })),
    [where],
  )

  // Where you were in each checkout. The route is one route for the whole window, so
  // without this, switching worktree leaves the document you were reading on screen —
  // a file from a branch you are no longer on.
  const lastRoute = useRef<Record<string, string>>({})

  // Which vault is open arrives a request after the first paint, so a tab opened from the
  // URL in the meantime is filed under a key that names no vault. When the real one turns
  // up, those tabs are its: they were always its, the app just could not say so yet.
  const filedUnder = useRef(where)
  // Recorded only while the checkout has not changed yet. Filing the route under the key
  // it is moving to would record where you are as where you were going, and the effect
  // below would find nothing to go back to.
  if (filedUnder.current === where) lastRoute.current[where] = pathname

  useEffect(() => {
    const from = filedUnder.current
    if (from === where) return
    filedUnder.current = where

    if (from.startsWith('#')) {
      setByWorktree((all) => {
        const carried = all[from]
        if (!carried?.length || all[where]?.length) return all
        const { [from]: _dropped, ...rest } = all
        return { ...rest, [where]: carried }
      })
      return
    }

    // A real switch between checkouts. Go back to whatever was open here, or to the home
    // screen when nothing was — the document from the checkout you left is not this one's.
    const going = lastRoute.current[where] ?? '/'
    setTerminalTab(null)
    if (going !== pathname) router.push(going)
    // `pathname` is deliberately absent: this runs when the checkout changes, and reading
    // the route it changed away from is the whole point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [where, router])
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

  /** Where a path ends up when `from` becomes `to` — itself if it is the thing that moved,
   *  and carried along if it was inside it, which is what a dragged folder does to
   *  everything open underneath it. */
  const after = (path: VaultPath, from: VaultPath, to: VaultPath): VaultPath | null =>
    path === from
      ? to
      : path.startsWith(`${from}/`)
        ? `${to}${path.slice(from.length)}`
        : null

  // A renamed document is the same document. Without this the route goes on naming a file
  // that is no longer there — the tab wears a name nothing has, and the pane says there is
  // no such document, which of a note you just named is a lie.
  const event = app.vaultEvent
  useEffect(() => {
    if (event?.type !== 'moved') return
    setTabs((open) =>
      open.map((tab) => {
        const to = tab.kind === 'doc' ? after(tab.path, event.from, event.to) : null
        return to ? docTab(to) : tab
      }),
    )
    const here = currentPath(pathname)
    const to = here && after(here, event.from, event.to)
    if (to) router.push(`/doc/${to}`)
    // `pathname` is read, not depended on: this follows the move, and a later navigation
    // is not one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event])

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

  /** Closing a run of tabs at once: whatever is left decides where you end up, so the
   *  route only moves when the tab it was showing went with them. */
  const closeMany = (going: Tab[]) => {
    const doomed = new Set(going.map((one) => one.id))
    const rest = tabs.filter((one) => !doomed.has(one.id))
    setTabs(rest)
    if (!activeId || !doomed.has(activeId)) return
    const next = rest[rest.length - 1]
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
    // Where each checkout was left, from the last time the window was open. Only the ones
    // you are not in matter: the one you are in is tracked live, and a relaunch lands on
    // the home screen, which is then honestly where you are.
    try {
      Object.assign(
        lastRoute.current,
        JSON.parse(localStorage.getItem(ROUTES_KEY) ?? '{}'),
      )
    } catch {
      // A map that cannot be read is a map that has nothing in it.
    }
  }, [])

  // Written on every move rather than on the switch, because the window can close, reload
  // or crash between the two, and the page you were on is the thing being remembered.
  // Checkouts filed before the vault answered are dropped: `#local` names no vault, and
  // the real key for the same place is written a moment later anyway.
  useEffect(() => {
    const keep = Object.entries(lastRoute.current).filter(([key]) => !key.startsWith('#'))
    localStorage.setItem(ROUTES_KEY, JSON.stringify(Object.fromEntries(keep)))
  }, [where, pathname])

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
        setFlow({ kind: 'search' })
      } else if (event.key === 'j') {
        event.preventDefault()
        toggleTerminal()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [toggleTerminal])

  /**
   * A note is made by making it. `Untitled` in the folder you asked from, open in the pane,
   * and its row in the tree waiting to be typed into — because the dialog that used to
   * stand here asked for a path, and a path is the one thing you cannot give before there
   * is a note to give it to. Naming is the last step, and it is a rename like any other.
   */
  const newNote = (seed: VaultPath) => {
    const folder = folderOf(app.entries, seed)
    const at = untitledIn(app.entries, folder)
    void app.create(at).then((failed) => {
      if (failed) return
      router.push(`/doc/${at}`)
      setRenaming(at)
    })
  }

  /** What the tree hands back when a name is typed, or abandoned. Nothing is a rename that
   *  goes nowhere: an empty field, or the name it already had. */
  const renamed = (from: VaultPath, name: string | null) => {
    setRenaming(null)
    if (!name) return
    const folder = folderOf(app.entries, from)
    const to = folder ? `${folder}/${name}` : name
    if (to !== from) void app.move(from, to)
  }

  const ctx: FlowCtx = {
    paths: filePaths(app.entries),
    open: (path) => router.push(`/doc/${path}`),
    // Seeded from whatever document is open, so a note made from the palette lands beside
    // the one you were reading.
    newNote: () => newNote(path ?? ''),
    move: (from, to) => void app.move(from, to),
    remove: (path) => void app.remove(path),
    syncNow: () => void app.syncNow(),
    settings: () => router.push('/settings'),
    vaults: () => setPicker(true),
    toggleTerminal,
  }

  const newTab = (what: NewTab) => (what === 'note' ? ctx.newNote() : newTerminal(what))

  const fromTree = (command: TreeCommand, path: VaultPath) => {
    if (command === 'create') return newNote(path)
    const flows: Record<'move' | 'delete', Flow> = {
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
            onSelect={(path) => void app.openVault(path)}
            onAdd={() => setPicker(true)}
            onDelete={(name) => void app.deleteVault(name)}
            onSelectProfile={(name) => void app.selectProfile(name)}
            onAddProfile={() => setProfiling(true)}
            onSettings={ctx.settings}
          />
        }
        onOpen={ctx.open}
        onCommand={fromTree}
        onMove={ctx.move}
        renaming={renaming}
        onRename={renamed}
      />
      <Resizer axis="sidebar" size={sidebar} onSize={resize} />
      <main className="main">
        {/* The strip and the checkout it belongs to share one bar: switching worktree is
            what changes the tabs, so the control that does it sits with them. */}
        <div className="tab-bar">
          <TabStrip
            tabs={tabs}
            activeId={activeId}
            onPick={pick}
            onClose={closeTab}
            onNew={newTab}
            onRename={(tab) => tab.kind === 'doc' && setFlow(moveFlow(ctx, tab.path))}
            onCloseMany={closeMany}
          />
          {app.worktrees.length > 0 && (
            <WorktreeMenu
              worktrees={app.worktrees}
              active={app.worktree}
              onSelect={(name) => void app.openWorktree(name)}
              onAdd={() => setBranching(true)}
              onDelete={(name) => void app.deleteWorktree(name)}
            />
          )}
        </div>
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
          // Closed only once it worked. On first run this modal is held open by there
          // being no profile, so closing it on the way out would have closed nothing and
          // left a failure with nowhere to appear.
          onCreate={async (draft) => {
            const reason = await app.addProfile(draft)
            if (!reason) setProfiling(false)
            return reason
          }}
          onClose={needsProfile ? undefined : () => setProfiling(false)}
        />
      )}
      {branching && (
        <AddWorktree
          existing={app.worktrees}
          accent={app.profile?.presenceColor}
          onCreate={async (input) => {
            const reason = await app.addWorktree(input)
            if (!reason) setBranching(false)
            return reason
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
