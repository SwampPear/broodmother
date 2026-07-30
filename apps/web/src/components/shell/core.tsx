'use client'

import { usePathname, useRouter } from 'next/navigation'
import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import type { VaultPath } from '@broodmother/shared'
import { useApp } from '../../state'
import {
  filePaths,
  FileTree,
  folderOf,
  parentOf,
  type TreeCommand,
  untitledIn,
} from '../tree'
import { deleteFlow, type Flow, type FlowCtx, Palette } from '../palette'
import { AddWorktree, VaultMenu, VaultPicker, WorktreeMenu } from '../vault'
import { ProfilePicker } from '../profile'
import { Resizer, useStoredSize } from '../ui'
import { StatusLine } from './status-line'
import { type NewTab, TabStrip } from './tabs'
import { TerminalPanel, TerminalTab } from '../terminal'
import { currentPath, useCheckoutTabs } from './checkout-tabs'

const SIDEBAR_KEY = 'broodmother.sidebar'
const TERMINAL_KEY = 'broodmother.terminal'

/** Hidden keeps the shell alive behind ⌘J; closed is a shell that exited. */
type TerminalState = 'closed' | 'open' | 'hidden'

export function Shell({ children }: { children: ReactNode }) {
  const app = useApp()
  const router = useRouter()
  const pathname = usePathname()
  const [flow, setFlow] = useState<Flow | null>(null)
  const [sidebar, resize] = useStoredSize('sidebar', SIDEBAR_KEY)
  const [terminalHeight, resizeTerminal] = useStoredSize('panel', TERMINAL_KEY)
  const [terminal, setTerminal] = useState<TerminalState>('closed')
  const [picker, setPicker] = useState(false)
  // The row the tree is holding open for a name. Set the moment a note is made, cleared
  // whether the name arrives or not.
  const [renaming, setRenaming] = useState<VaultPath | null>(null)
  const [profiling, setProfiling] = useState(false)
  const [branching, setBranching] = useState(false)

  const navigate = useCallback((route: string) => router.push(route), [router])
  const { tabs, activeId, terminalTab, pick, close, closeMany, newTerminal } =
    useCheckoutTabs({
      checkout: app.checkout,
      pathname,
      event: app.vaultEvent,
      navigate,
    })

  const path = currentPath(pathname)

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

  /**
   * Opens a row as a field, a frame from now. Every rename is raised from a menu, and a
   * menu that is still closing puts focus back where it was opened — onto a field that has
   * just mounted and taken it. That blur is read as finishing the rename, so the field
   * would commit the name the row already had and disappear before a key was pressed.
   * A frame later the menu is gone and the field is the only thing asking for focus.
   *
   * A new note does not need this only because creating it is a round trip, which is
   * already longer than the menu takes to go.
   */
  const startRename = (path: VaultPath) => {
    requestAnimationFrame(() => setRenaming(path))
  }

  /**
   * What the tree hands back when a name is typed, or abandoned. Nothing is a rename that
   * goes nowhere: an empty field, or the name it already had.
   *
   * The new path is built on the parent rather than on `folderOf`, which answers a folder
   * with itself — right for "where does a new note go", wrong here, where it would rename
   * a folder into a child of itself.
   */
  const renamed = (from: VaultPath, name: string | null) => {
    setRenaming(null)
    if (!name) return
    const folder = parentOf(from)
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
    // Renaming is the row turning into a field, not a dialog over the top of it — the same
    // thing a new note does the moment it exists, so there is one way to name anything.
    if (command === 'rename') return startRename(path)
    setFlow(deleteFlow(ctx, path))
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
            onClose={close}
            onNew={newTab}
            // A tab stands for a file, and the file's name is typed where the file is
            // shown: this hands the rename to that row, opening whatever folders were
            // shut around it on the way.
            onRename={(tab) => tab.kind === 'doc' && startRename(tab.path)}
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
                onExit={() => close(tab)}
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
          accent={app.profile?.color}
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
