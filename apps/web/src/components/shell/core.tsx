'use client'

import { usePathname, useRouter } from 'next/navigation'
import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import {
  projectOf,
  projectRoot,
  tilde,
  type DocRef,
  type DocRoot,
} from '@broodmother/shared'
import { useApp } from '../../state'
import {
  fileRefs,
  FileTree,
  folderOf,
  isFolder,
  parentOf,
  type TreeCommand,
  type TreeRoot,
  untitledIn,
} from '../tree'
import { deleteFlow, type Flow, type FlowCtx, Palette } from '../palette'
import { BranchMenu } from '../branch'
import { CreateProject } from '../project'
import { VaultMenu, VaultPicker } from '../vault'
import { ProfilePicker } from '../profile'
import { Confirm, Resizer, useStoredSize } from '../ui'
import { StatusLine } from './status-line'
import { type NewTab, TabStrip } from './tabs'
import { TerminalPanel, TerminalTab } from '../terminal'
import { currentDoc, docRoute, useScopeTabs } from './scope-tabs'

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
  const [creating, setCreating] = useState(false)
  // The one menu that says where you are working: vault, project and profile together.
  const [whereMenu, setWhereMenu] = useState(false)
  // The row the tree is holding open for a name. Set the moment a note is made, cleared
  // whether the name arrives or not.
  const [renaming, setRenaming] = useState<DocRef | null>(null)
  const [profiling, setProfiling] = useState(false)
  // The project whose row asked to be deleted, held until the confirmation answers.
  const [deleting, setDeleting] = useState<string | null>(null)

  const navigate = useCallback((route: string) => router.push(route), [router])
  const { tabs, activeId, terminalTab, show, pick, close, closeMany, newTerminal } =
    useScopeTabs({
      scopeKey: app.scopeKey,
      pathname,
      event: app.treeEvent,
      navigate,
    })

  const doc = currentDoc(pathname)

  /* Settings is a page about the app rather than a place in it: nothing here is opened in a
     tab or run in a shell, so the plus and the terminal have nothing to offer while it is
     up. The terminal is hidden rather than closed — a pty that unmounts dies, and reading
     the settings is not asking for the shell to end. */
  const settings = pathname === '/settings'

  /** The vault's documents, and under them the files of every project inside it — each its
   *  own root, headed by its name, because each is somewhere you can go and work. */
  const roots: TreeRoot[] = [
    { root: 'vault', entries: app.entries.vault, label: app.vault?.name },
    ...app.projects.map((project) => ({
      root: projectRoot(project.name),
      entries: app.entries.projects[project.name] ?? [],
      label: project.name,
    })),
  ]

  const entriesOf = (root: DocRoot) => {
    const name = projectOf(root)
    return name ? (app.entries.projects[name] ?? []) : app.entries.vault
  }

  /** What the branch menu is about: the name of the repository the scope is standing in. */
  const scopeLabel = app.project?.name ?? app.vault?.name ?? ''

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
  const newNote = (seed: DocRef) => {
    const entries = entriesOf(seed.root)
    const at: DocRef = {
      root: seed.root,
      path: untitledIn(entries, folderOf(entries, seed.path)),
    }
    void app.create(at).then((failed) => {
      if (failed) return
      show(docRoute(at))
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
  const startRename = (ref: DocRef) => {
    requestAnimationFrame(() => setRenaming(ref))
  }

  /**
   * What the tree hands back when a name is typed, or abandoned. Nothing is a rename that
   * goes nowhere: an empty field, or the name it already had.
   *
   * The new path is built on the parent rather than on `folderOf`, which answers a folder
   * with itself — right for "where does a new note go", wrong here, where it would rename
   * a folder into a child of itself.
   */
  const renamed = (from: DocRef, name: string | null) => {
    setRenaming(null)
    if (!name) return
    const folder = parentOf(from.path)
    const to = folder ? `${folder}/${name}` : name
    if (to !== from.path) void app.move(from.root, from.path, to)
  }

  const ctx: FlowCtx = {
    refs: fileRefs(roots),
    open: (ref) => show(docRoute(ref)),
    // Seeded from whatever document is open, so a note made from the palette lands beside
    // the one you were reading — in the tree it was read out of.
    newNote: () => newNote(doc ?? { root: 'vault', path: '' }),
    move: (root, from, to) => void app.move(root, from, to),
    remove: (ref) => void app.remove(ref),
    syncNow: () => void app.syncNow(),
    settings: () => router.push('/settings'),
    vaults: () => setPicker(true),
    projects: () => setWhereMenu(true),
    createProject: () => setCreating(true),
    toggleTerminal,
  }

  const newTab = (what: NewTab) =>
    what === 'note' ? ctx.newNote() : newTerminal(what, app.scope)

  const fromTree = (command: TreeCommand, ref: DocRef) => {
    if (command === 'create') return newNote(ref)
    // Renaming is the row turning into a field, not a dialog over the top of it — the same
    // thing a new note does the moment it exists, so there is one way to name anything.
    if (command === 'rename') return startRename(ref)
    if (command === 'delete-project') return setDeleting(projectOf(ref.root))
    setFlow(deleteFlow(ctx, ref, isFolder(entriesOf(ref.root), ref.path)))
  }

  // Who you are is the one thing the app cannot invent: a vault is created working as a
  // profile, so there has to be one to name. Nothing gates on having a vault — an empty
  // app is a state you are allowed to stand in, and the first vault is made the way the
  // tenth is, from the selector at the head of the tree. The gate does not open before the
  // answer is in, or a profile that exists gets asked for anyway on the way past.
  const needsProfile = app.ready && !app.profile

  return (
    <div className="shell" style={{ '--sidebar': `${sidebar}px` } as CSSProperties}>
      <FileTree
        roots={roots}
        current={doc}
        scope={app.scope}
        head={
          <VaultMenu
            vaults={app.vaults}
            activePath={app.config?.vaultPath ?? ''}
            activeProject={app.project?.name ?? null}
            profiles={app.profiles}
            activeProfile={app.profile?.name ?? null}
            open={whereMenu}
            onOpenChange={setWhereMenu}
            onSelect={(path) => void app.openVault(path)}
            onAdd={() => setPicker(true)}
            onDelete={(name) => void app.deleteVault(name)}
            onCreateProject={() => setCreating(true)}
            onSelectProfile={(name) => void app.selectProfile(name)}
            onAddProfile={() => setProfiling(true)}
            onSettings={ctx.settings}
          />
        }
        onOpen={ctx.open}
        // A folder is not a document, so the pane has nothing to show for one. The home
        // screen is what standing in a folder looks like.
        onOpenFolder={() => show('/')}
        onScope={(root) => void app.setScope(root)}
        onCommand={fromTree}
        onCreateProject={() => setCreating(true)}
        onMove={ctx.move}
        renaming={renaming}
        onRename={renamed}
      />
      <Resizer axis="sidebar" size={sidebar} onSize={resize} />
      <main className="main">
        {/* The strip and the branch it belongs to share one bar: switching branch is what
            changes the tabs, so the control that does it sits with them. Which project you
            are in is asked at the head of the tree, with the vault and the profile. */}
        <div className="tab-bar">
          <TabStrip
            tabs={tabs}
            activeId={activeId}
            onPick={pick}
            onClose={close}
            onNew={settings ? undefined : newTab}
            // A tab stands for a file, and the file's name is typed where the file is
            // shown: this hands the rename to that row, opening whatever folders were
            // shut around it on the way.
            onRename={(tab) => tab.kind === 'doc' && startRename(tab.ref)}
            onCloseMany={closeMany}
          />
          {app.branches.length > 0 && (
            <BranchMenu
              label={scopeLabel}
              branches={app.branches}
              active={app.branch}
              onSelect={(name) => void app.openBranch(app.scope, name)}
              onCreate={(name) => app.addBranch(app.scope, name)}
              onDelete={(name) => void app.deleteBranch(app.scope, name)}
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
                root={tab.root}
                active={tab.id === terminalTab}
                onExit={() => close(tab)}
              />
            ))}
        </div>
      </main>
      {terminal !== 'closed' && (
        <TerminalPanel
          root={app.scope}
          height={terminalHeight}
          onHeight={resizeTerminal}
          visible={terminal === 'open' && !settings}
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
          suggested={app.suggestedAuthor}
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
      {deleting && (
        <Confirm
          title={`Delete ${deleting}?`}
          description={`${tilde(app.projects.find((one) => one.name === deleting)?.repo ?? deleting)} and everything in it.`}
          action="delete project"
          onConfirm={() => void app.removeProject(deleting)}
          onClose={() => setDeleting(null)}
        >
          The repository lives in this vault, so this is the last copy of it: the files,
          the branches and the history all go, along with the checkouts broodmother made
          for them. Anything you have not pushed to a remote is gone for good.
        </Confirm>
      )}
      {picker && <VaultPicker onClose={() => setPicker(false)} />}
      {creating && (
        <CreateProject onCreate={app.addProject} onClose={() => setCreating(false)} />
      )}
      {flow && <Palette flow={flow} ctx={ctx} setFlow={setFlow} />}
    </div>
  )
}
